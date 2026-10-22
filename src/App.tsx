import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Sparkles, Mail, Share2, Cpu, Copy, Trash2,
  Settings, Check, Volume2, RotateCcw, Loader2, Save, ShieldCheck, LogOut
} from 'lucide-react';
import { LockScreen, AuthUser } from './components/LockScreen';

const AUTHORIZED_EMAIL = 'cesar626313978@gmail.com';

const DEFAULT_PROMPTS = {
  improve: `Actúa como un editor profesional experto en español. Mejora el siguiente texto transcrito por voz: corrige errores gramaticales, añade puntuación adecuada, elimina muletillas o repeticiones propias del habla y mejora la fluidez y claridad sin cambiar la intención ni el tono del autor. Devuelve únicamente el texto mejorado, sin introducciones ni explicaciones adicionales.`,
  email: `Actúa como un director de comunicación y redactor ejecutivo senior. Tu tarea es transformar el siguiente texto dictado por voz en un correo electrónico profesional, estructurado, claro y persuasivo. Incluye una línea de "Asunto:" atractiva, un saludo formal, el cuerpo limpio en párrafos y una despedida cordial. Devuelve únicamente el correo listo para enviar.`,
  social: `Actúa como un experto en marketing digital y copywriting. Transforma el siguiente texto dictado en una publicación magnética para redes sociales (LinkedIn, X o Instagram). Empieza con un gancho potente, párrafos cortos y escaneables, emojis estratégicos, llamada a la acción (CTA) y 3-5 hashtags relevantes. Devuelve solo la publicación lista para copiar.`,
  ai_prompt: `Actúa como un Ingeniero de Prompts Senior. Convierte la siguiente idea o petición dictada por voz en un prompt maestro, profesional y estructurado usando secciones claras: [Rol], [Contexto], [Tarea Principal], [Restricciones] y [Formato de Salida]. Devuelve únicamente el prompt optimizado listo para usar.`
};

const PROMPT_META = {
  improve: { label: 'Mejorar Texto', shortDesc: 'Gramática y fluidez', icon: Sparkles, color: 'from-indigo-500 to-violet-600', border: 'border-indigo-500/40 hover:border-indigo-400' },
  email: { label: 'Correo Electrónico', shortDesc: 'Asunto + formal', icon: Mail, color: 'from-sky-500 to-blue-600', border: 'border-sky-500/40 hover:border-sky-400' },
  social: { label: 'Redes Sociales', shortDesc: 'Gancho y hashtags', icon: Share2, color: 'from-pink-500 to-rose-600', border: 'border-pink-500/40 hover:border-pink-400' },
  ai_prompt: { label: 'Prompt para IA', shortDesc: 'Estructura experta', icon: Cpu, color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500/40 hover:border-emerald-400' }
};

export default function App() {
  // Autenticación exclusiva para el propietario
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('mywhis_auth_session') || localStorage.getItem('vozia_auth_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email?.toLowerCase().trim() === AUTHORIZED_EMAIL.toLowerCase().trim()) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [rawText, setRawText] = useState(() => localStorage.getItem('mywhis_raw_text') || localStorage.getItem('vozia_raw_text') || '');
  const [interimText, setInterimText] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [activeView, setActiveView] = useState<'raw' | 'transformed'>('raw');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [backupAudioBlob, setBackupAudioBlob] = useState<Blob | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);

  // Prompts y borrador de configuración
  const [prompts, setPrompts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mywhis_custom_prompts_v3') || localStorage.getItem('vozia_custom_prompts_v3');
      return saved ? { ...DEFAULT_PROMPTS, ...JSON.parse(saved) } : DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  });
  const [tempPrompts, setTempPrompts] = useState(prompts);
  const [showSettings, setShowSettings] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState<keyof typeof DEFAULT_PROMPTS>('improve');

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Synchronous text & state refs to eliminate stale closures and race conditions on first-click
  const rawTextRef = useRef(rawText);
  const interimTextRef = useRef(interimText);
  const transformedTextRef = useRef(transformedText);
  const activeViewRef = useRef(activeView);

  const updateRawText = (val: string | ((prev: string) => string)) => {
    setRawText((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      rawTextRef.current = next;
      return next;
    });
  };

  const updateInterimText = (val: string) => {
    interimTextRef.current = val;
    setInterimText(val);
  };

  const updateTransformedText = (val: string | ((prev: string) => string)) => {
    setTransformedText((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      transformedTextRef.current = next;
      return next;
    });
  };

  const updateActiveView = (view: 'raw' | 'transformed') => {
    activeViewRef.current = view;
    setActiveView(view);
  };

  useEffect(() => {
    localStorage.setItem('mywhis_raw_text', rawText);
    localStorage.setItem('vozia_raw_text', rawText);
  }, [rawText]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const getApiKey = () => {
    try {
      return (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY || '';
    } catch {
      return '';
    }
  };

  const handleLogout = () => {
    if (isRecording) {
      stopRecording();
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('mywhis_auth_session');
      localStorage.removeItem('vozia_auth_session');
    } catch {}
    showToast('Sesión cerrada correctamente. Acceso protegido.');
  };

  const enableBackgroundPersistence = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
      }
    } catch {}
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Grabación Activa',
          artist: 'Mywhis',
          album: 'Dictado Continuo'
        });
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch {}
  };

  const disableBackgroundPersistence = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      setWakeLockActive(false);
    } catch {}
  };

  const initSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return null;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript + ' ';
        } else {
          interimChunk += transcript;
        }
      }
      if (finalChunk) {
        updateRawText((prev) => (prev ? prev.trimEnd() + ' ' : '') + finalChunk.trimStart());
      }
      updateInterimText(interimChunk);
    };

    recognition.onend = () => {
      if (shouldKeepRecordingRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (shouldKeepRecordingRef.current && !isPausedRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 250);
      } else {
        updateInterimText('');
      }
    };

    return recognition;
  };

  const startRecording = async () => {
    updateActiveView('raw');
    setBackupAudioBlob(null);
    audioChunksRef.current = [];
    setIsPaused(false);
    isPausedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          setBackupAudioBlob(new Blob(audioChunksRef.current, { type: mimeType }));
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };
      recorder.start(4000);
      mediaRecorderRef.current = recorder;
    } catch {
      showToast('No se pudo acceder al micrófono', 'error');
      return;
    }

    await enableBackgroundPersistence();

    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      shouldKeepRecordingRef.current = true;
      try { recognition.start(); } catch {}
    } else {
      shouldKeepRecordingRef.current = true;
      showToast('Grabando audio. Podrás transcribirlo con IA al terminar.', 'info');
    }

    setIsRecording(true);
    setElapsedSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Pausa la sesión sin finalizar el archivo ni perder fragmentos
  const pauseRecording = () => {
    if (!isRecording || isPaused) return;
    setIsPaused(true);
    isPausedRef.current = true;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.pause();
      } catch {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    updateInterimText('');
    showToast('Grabación pausada');
  };

  // Reanuda la sesión en el mismo segmento y buffer de audio
  const resumeRecording = () => {
    if (!isRecording || !isPaused) return;
    setIsPaused(false);
    isPausedRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    showToast('Grabación reanudada');
  };

  // Detiene todo limpiamente y consolida la grabación final
  const stopRecording = () => {
    shouldKeepRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    updateInterimText('');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    disableBackgroundPersistence();
  };

  // Ciclo de vida de borrado exhaustivo y liberación de memoria
  const handleFullReset = () => {
    // 1. Detener activamente grabaciones y tracks de hardware si estuvieran en curso
    shouldKeepRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;

    // 2. Liberación exhaustiva de memoria y buffers de audio
    audioChunksRef.current = [];
    setBackupAudioBlob(null);
    disableBackgroundPersistence();

    // 3. Limpieza sincrónica de texto y estados de vista
    updateRawText('');
    updateInterimText('');
    updateTransformedText('');
    updateActiveView('raw');
    setActiveMode(null);
    setElapsedSeconds(0);
    setConfirmClear(false);

    try {
      localStorage.removeItem('mywhis_raw_text');
      localStorage.removeItem('vozia_raw_text');
    } catch {}

    showToast('Sesión, audio y memoria limpiados');
  };

  // Transcripción de respaldo con IA
  const transcribeBackupAudio = async () => {
    if (!backupAudioBlob) {
      showToast('No hay audio grabado todavía.', 'error');
      return;
    }
    setIsTranscribingAudio(true);
    try {
      const reader = new FileReader();
      const base64Audio: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(backupAudioBlob);
      });

      let text = '';

      // 1. Intentar con backend seguro
      try {
        const serverRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token || ''}`,
            'X-User-Email': currentUser?.email || '',
          },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: backupAudioBlob.type || 'audio/webm',
            liveTranscript: rawTextRef.current,
          }),
        });
        if (serverRes.ok) {
          const data = await serverRes.json();
          if (data?.text) text = data.text.trim();
        }
      } catch {}

      // 2. Fallback directo con API key (utilizando modelo gemini-3.5-transcribe de alta velocidad)
      if (!text) {
        const apiKey = getApiKey();
        if (apiKey) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [
                    { text: 'Transcribe de forma 100% literal, exacta y palabra por palabra este audio en español. Cero procesamiento: no corrijas gramática ni omitas repeticiones o muletillas. Devuelve únicamente las palabras textuales pronunciadas.' },
                    { inlineData: { mimeType: backupAudioBlob.type || 'audio/webm', data: base64Audio } }
                  ]
                }]
              })
            }
          );
          const data = await response.json();
          text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
      }

      if (text) {
        updateRawText((prev) => (prev ? prev + '\n\n' + text : text));
        updateActiveView('raw');
        showToast('¡Audio transcrito con éxito por IA!');
      } else {
        throw new Error('No se pudo transcribir');
      }
    } catch {
      showToast('Error al transcribir el audio de respaldo.', 'error');
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // Transformación instantánea y resistente a stale closures / primer clic
  const handleTransform = async (modeKey: string) => {
    // Lectura síncrona directa desde los refs actualizados
    const currentActive = activeViewRef.current;
    let sourceText = '';
    if (currentActive === 'transformed' && transformedTextRef.current.trim()) {
      sourceText = transformedTextRef.current.trim();
    } else {
      sourceText = (rawTextRef.current + ' ' + interimTextRef.current).trim();
    }

    if (!sourceText) {
      showToast('Primero dicta o escribe algún texto.', 'error');
      return;
    }

    setIsProcessing(true);
    setActiveMode(modeKey);

    try {
      let result = '';

      // 1. Intentar a través del backend seguro
      try {
        const res = await fetch('/api/improve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token || ''}`,
            'X-User-Email': currentUser?.email || '',
          },
          body: JSON.stringify({
            text: sourceText,
            mode: modeKey,
            improveType: modeKey,
            prompt: prompts[modeKey],
            customPrompt: prompts[modeKey]
          })
        });

        if (res.ok) {
          const data = await res.json();
          result = data.result || data.text || '';
        }
      } catch {}

      // 2. Fallback directo con Gemini (gemini-3.1-flash-lite ultra-rápido ~2s)
      if (!result) {
        const apiKey = getApiKey();
        if (apiKey) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: prompts[modeKey] }] },
                contents: [{ role: 'user', parts: [{ text: `Texto a procesar:\n"""\n${sourceText}\n"""` }] }]
              })
            }
          );
          if (response.ok) {
            const data = await response.json();
            result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          }
        }
      }

      if (!result) throw new Error('Respuesta vacía');

      updateTransformedText(result);
      updateActiveView('transformed');
      const label = PROMPT_META[modeKey as keyof typeof PROMPT_META]?.label || modeKey;
      showToast(`¡Aplicado: ${label}!`);
    } catch {
      showToast('Error al procesar con Gemini.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSettings = () => {
    setPrompts(tempPrompts);
    localStorage.setItem('mywhis_custom_prompts_v3', JSON.stringify(tempPrompts));
    localStorage.setItem('vozia_custom_prompts_v3', JSON.stringify(tempPrompts));
    setShowSettings(false);
    showToast('¡Ajustes y prompts guardados correctamente!');
  };

  const currentDisplayedText =
    activeView === 'transformed'
      ? transformedText
      : rawText + (interimText ? (rawText ? ' ' : '') + interimText : '');

  const wordCount = currentDisplayedText.trim() ? currentDisplayedText.trim().split(/\s+/).length : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Si no hay sesión autenticada, bloquea el 100% de la aplicación mostrando la pantalla de bloqueo
  if (!currentUser) {
    return (
      <LockScreen
        authorizedEmail={AUTHORIZED_EMAIL}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('mywhis_auth_session', JSON.stringify(user));
            localStorage.setItem('vozia_auth_session', JSON.stringify(user));
          } catch {}
          showToast(`¡Acceso concedido! Bienvenido, ${user.name || 'César'}`);
        }}
      />
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#090d16] text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs font-medium shadow-2xl flex items-center gap-1.5 animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CABECERA ULTRA COMPACTA */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shrink-0 z-20">
        <div className="max-w-4xl mx-auto px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">Mywhis</h1>
                <span className="hidden xs:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-semibold">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Protegido</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                {isRecording ? 'Grabando dictado...' : 'Listo para dictar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chip de usuario autenticado (César) */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px]"
              title={`Iniciado como: ${currentUser.email}`}
            >
              <div className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-[9px] border border-indigo-500/40">
                C
              </div>
              <span className="text-slate-300 font-medium max-w-[100px] truncate">
                {currentUser.email.split('@')[0]}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <button
              onClick={() => {
                setTempPrompts(prompts);
                setShowSettings(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Configurar los 4 Prompts"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Prompts</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL ADAPTADO AL 100% DEL ALTO (ZERO SCROLL) */}
      <main className="flex-1 min-h-0 max-w-4xl w-full mx-auto p-2 sm:p-3 flex flex-col gap-2 overflow-hidden">
        {/* PANEL DE CONTROL DE GRABACIÓN PERSISTENTE (CON PAUSA/REANUDAR) */}
        <section className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 shrink-0 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 hover:scale-105 shadow-md shadow-indigo-500/30 cursor-pointer transition-all active:scale-95"
                title="Comenzar a dictar"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Botón de Pausa / Reanudar (Persistente: no finaliza el archivo) */}
                {isPaused ? (
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/30 cursor-pointer transition-all active:scale-95 animate-pulse"
                    title="Reanudar grabación en el mismo archivo"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 cursor-pointer transition-all active:scale-95"
                    title="Pausar temporalmente la entrada de audio"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                )}

                {/* Botón de Detener definitivo */}
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 cursor-pointer transition-all active:scale-95"
                  title="Finalizar grabación y consolidar archivo"
                >
                  <Square className="w-4 h-4 fill-white" />
                </button>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-tight">
                {isRecording && !isPaused && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
                {isRecording && isPaused && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                )}
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {!isRecording
                    ? 'Pulsa el micro para dictar'
                    : isPaused
                    ? 'Pausado (segmento abierto)'
                    : 'Grabando dictado...'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-mono text-xs sm:text-sm font-bold ${isPaused ? 'text-amber-400' : 'text-indigo-400'}`}>
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-[11px] text-slate-400">{wordCount} pal.</span>
                {isPaused && (
                  <span className="text-[9px] bg-amber-500/15 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                    En Pausa
                  </span>
                )}
                {wakeLockActive && (
                  <span className="hidden xs:inline text-[9px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Pantalla ON
                  </span>
                )}
              </div>
            </div>
          </div>

          {backupAudioBlob && !isRecording && (
            <button
              onClick={transcribeBackupAudio}
              disabled={isTranscribingAudio}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
              title="Transcribir audio completo con IA"
            >
              {isTranscribingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">Transcribir audio con IA</span>
              <span className="xs:hidden">IA Audio</span>
            </button>
          )}
        </section>

        {/* ÁREA DE TEXTO FLEXIBLE (SE EXPANDE PARA OCUPAR TODO EL ESPACIO RESTANTE) */}
        <section className="flex-1 min-h-0 flex flex-col bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-inner">
          {/* Pestañas de vista rápida */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateActiveView('raw')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'raw' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dictado en Bruto (Raw)
              </button>
              {transformedText && (
                <button
                  type="button"
                  onClick={() => updateActiveView('transformed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === 'transformed'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ✨ Resultado IA ({activeMode ? PROMPT_META[activeMode as keyof typeof PROMPT_META]?.label : 'IA'})
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Editable</span>
          </div>

          {/* Textarea contenedor con altura 100% de su padre */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs font-semibold text-white">Transformando texto con Gemini...</p>
              </div>
            )}
            <textarea
              value={currentDisplayedText}
              onChange={(e) => {
                if (activeView === 'transformed') updateTransformedText(e.target.value);
                else updateRawText(e.target.value);
              }}
              placeholder="Habla por el micrófono o escribe aquí..."
              className="w-full h-full flex-1 p-3 sm:p-4 bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* BARRA INFERIOR DE ACCIONES COMPACTA */}
          <div className="px-3 py-1.5 sm:py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  if (!currentDisplayedText.trim()) return;
                  if (navigator.share) {
                    try { await navigator.share({ title: 'Mywhis', text: currentDisplayedText.trim() }); } catch {}
                  } else {
                    navigator.clipboard.writeText(currentDisplayedText.trim());
                    showToast('¡Copiado!');
                  }
                }}
                disabled={!currentDisplayedText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentDisplayedText.trim()) return;
                  navigator.clipboard.writeText(currentDisplayedText.trim());
                  showToast('¡Copiado al portapapeles!');
                }}
                disabled={!currentDisplayedText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-semibold border border-slate-700 cursor-pointer transition-all active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </button>
            </div>

            {/* Borrado integral: texto, audio chunks y estado simultáneamente */}
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3000);
                  return;
                }
                handleFullReset();
              }}
              disabled={!rawText && !transformedText && !backupAudioBlob && !isRecording}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all active:scale-95 ${
                confirmClear
                  ? 'bg-red-600 text-white border-red-500 animate-pulse'
                  : 'bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border-slate-800'
              }`}
              title="Borrado total y liberación de memoria"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmClear ? '¿Borrar todo?' : 'Borrar'}</span>
            </button>
          </div>
        </section>

        {/* LOS 4 BOTONES DE IA ADAPTADOS A MÓVIL (ZERO SCROLL, INMEDIATOS EN EL PRIMER CLIC) */}
        <section className="shrink-0 pt-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {(['improve', 'email', 'social', 'ai_prompt'] as const).map((key) => {
              const meta = PROMPT_META[key];
              const IconComponent = meta.icon;
              const isThisActive = isProcessing && activeMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTransform(key)}
                  disabled={isProcessing}
                  className={`p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border ${
                    isThisActive ? 'border-indigo-400 ring-1 ring-indigo-400/50' : meta.border
                  } text-left flex items-center gap-2 sm:gap-2.5 transition-all active:scale-95 cursor-pointer shadow-sm select-none touch-manipulation`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    {isThisActive ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate hidden xs:block">
                      {isThisActive ? 'Procesando...' : meta.shortDesc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* MODAL DE CONFIGURACIÓN DE PROMPTS ULTRA COMPACTO (ZERO SCROLL) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm sm:text-base font-bold text-white">Ajustes de Prompts</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveSettings}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white cursor-pointer transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Pestañas de los 4 Prompts (para no hacer scroll en el móvil) */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/60 border-b border-slate-800 shrink-0">
              {(['improve', 'email', 'social', 'ai_prompt'] as const).map((key) => {
                const isSelected = activePromptTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePromptTab(key)}
                    className={`py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all truncate text-center cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {key === 'improve' && '✨ Mejorar'}
                    {key === 'email' && '✉️ Correo'}
                    {key === 'social' && '📱 Redes'}
                    {key === 'ai_prompt' && '🤖 Prompt'}
                  </button>
                );
              })}
            </div>

            {/* Editor del Prompt Seleccionado */}
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 gap-2.5 overflow-hidden">
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{PROMPT_META[activePromptTab].label}</span>
                    <span className="text-[10px] text-slate-400 font-normal hidden xs:inline">
                      ({PROMPT_META[activePromptTab].shortDesc})
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setTempPrompts((prev) => ({ ...prev, [activePromptTab]: DEFAULT_PROMPTS[activePromptTab] }))}
                  className="text-[10px] sm:text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  title="Restaurar este prompt por defecto"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar
                </button>
              </div>

              {/* Textarea del prompt activo */}
              <div className="flex-1 min-h-[160px] sm:min-h-[220px] flex flex-col bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                <textarea
                  value={tempPrompts[activePromptTab]}
                  onChange={(e) => setTempPrompts((prev) => ({ ...prev, [activePromptTab]: e.target.value }))}
                  placeholder="Instrucciones para este botón de IA..."
                  className="w-full h-full flex-1 bg-transparent text-xs sm:text-sm text-slate-200 focus:outline-none leading-relaxed resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
                <span>Pulsa "Guardar" arriba para aplicar los cambios permanentemente.</span>
                <button
                  type="button"
                  onClick={() => setTempPrompts(DEFAULT_PROMPTS)}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  Restaurar los 4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}