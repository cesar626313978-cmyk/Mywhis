import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Sparkles, Mail, Share2, Cpu, Copy, Trash2,
  Settings, Check, Volume2, RotateCcw, Loader2, Save, ShieldCheck, LogOut,
  ShoppingCart, Languages, MessageCircle, Upload, ChevronDown, ChevronUp, X, Download,
  User, Camera, Image as ImageIcon
} from 'lucide-react';
import { LockScreen, AuthUser } from './components/LockScreen';
import { DEFAULT_SOCIAL_X_PROMPT, DEFAULT_SOCIAL_INSTAGRAM_PROMPT } from './data/defaultPrompt';

const AUTHORIZED_EMAIL = 'cesar626313978@gmail.com';

const DEFAULT_PROMPTS = {
  improve: `Actúa como un editor ejecutivo senior bilingüe (Español / Inglés). Reescribe y eleva profesionalmente el siguiente texto: corrige gramática y puntuación, elimina muletillas o repeticiones del habla y reestructura las oraciones para lograr máxima claridad, fluidez e impacto profesional. REGLA DE IDIOMA: Mantén estrictamente el mismo idioma del texto de entrada (si está en inglés, responde 100% en inglés; si está en español, responde 100% en español), salvo que el selector de idioma indique lo contrario. PROHIBIDO devolver el mismo texto literal de entrada. Devuelve únicamente el texto final mejorado.`,
  email: `Actúa como un director de comunicación y redactor ejecutivo senior bilingüe. Transforma el siguiente texto en un correo electrónico profesional, estructurado, claro y persuasivo. REGLA DE IDIOMA: Mantén estrictamente el idioma activo del texto (en inglés usa "Subject:" y redacta 100% en inglés; en español usa "Asunto:" y redacta 100% en español). Devuelve únicamente el correo listo para enviar.`,
  social: DEFAULT_SOCIAL_X_PROMPT,
  social_x: DEFAULT_SOCIAL_X_PROMPT,
  social_instagram: DEFAULT_SOCIAL_INSTAGRAM_PROMPT,
  ai_prompt: `Actúa como un Ingeniero de Prompts Senior bilingüe (Español / Inglés). Convierte la siguiente idea o petición en un prompt maestro, profesional y estructurado.\nREGLA CRÍTICA DE COHERENCIA LINGÜÍSTICA:\n- Si el texto de entrada está en INGLÉS (o el idioma activo es inglés), redacta TODO el prompt en INGLÉS usando estas secciones exactas: [Role], [Context], [Main Task], [Constraints], [Output Format].\n- Si el texto de entrada está en ESPAÑOL (o el idioma activo es español), redacta TODO el prompt en ESPAÑOL usando estas secciones exactas: [Rol], [Contexto], [Tarea Principal], [Restricciones], [Formato de Salida].\nDevuelve únicamente el prompt optimizado listo para usar.`,
  shopping_list: `Actúa como un asistente organizador de compras de supermercado bilingüe. Extrae todos los productos o artículos mencionados, elimina conectores hablados o muletillas y genera una lista limpia y ordenada.\nREGLAS ESTRICTAS DE FORMATO E IDIOMA:\n1. Si el texto está en INGLÉS: primera línea "Shopping List:" seguida de cada artículo con "- ".\n2. Si el texto está en ESPAÑOL: primera línea "Lista de la compra:" seguida de cada artículo con "- ".\n3. Devuelve ÚNICAMENTE la lista con ese formato exacto, sin saludos ni notas adicionales.`,
  translate: `Actúa como un traductor profesional bilingüe nativo (Español ⇄ Inglés). Analiza automáticamente el idioma del texto de entrada y aplica la traducción en sentido inverso:\n1. Si el texto está en ESPAÑOL: tradúcelo al INGLÉS con fluidez natural, gramática impecable y precisión contextual.\n2. Si el texto está en INGLÉS: tradúcelo al ESPAÑOL con fluidez natural, gramática impecable y precisión contextual.\n3. Devuelve ÚNICAMENTE el texto traducido en el idioma de destino, sin introducciones, sin comillas y sin notas explicativas.`
};

// Detector heurístico instantáneo en cliente para coherencia de estado entre Traducir -> Prompt IA
function detectClientLanguage(text: string): 'es' | 'en' {
  const clean = text.trim();
  if (!clean) return 'es';
  const sample = ` ${clean.toLowerCase()} `;
  const enMatches = (
    sample.match(
      /\b(the|and|for|with|that|this|have|from|will|would|could|should|about|please|need|want|make|create|write|act|role|context|task|constraints|output|format|hello|tomorrow|meeting|morning|project|shopping|list|app|application|system|user|data|design)\b/g
    ) || []
  ).length;
  const esMatches = (
    sample.match(
      /\b(el|la|los|las|de|del|que|en|un|una|para|con|por|como|más|pero|sus|este|esta|estos|hola|mañana|reunión|proyecto|quiero|necesito|actúa|rol|contexto|tarea|restricciones|formato|compra|lista|aplicación|sistema|usuario|datos|diseño)\b/g
    ) || []
  ).length;
  const hasSpanishChars = /[áéíóúñ¿¡]/i.test(clean);
  if (enMatches > esMatches && !hasSpanishChars) return 'en';
  if (enMatches >= esMatches + 2) return 'en';
  return 'es';
}

const PROMPT_META = {
  improve: { label: 'Mejorar Texto', shortDesc: 'Gramática y fluidez', icon: Sparkles, color: 'from-indigo-500 to-violet-600', border: 'border-indigo-500/70 hover:border-indigo-400' },
  email: { label: 'Correo Electrónico', shortDesc: 'Asunto + formal', icon: Mail, color: 'from-sky-500 to-blue-600', border: 'border-sky-500/70 hover:border-sky-400' },
  social: { label: 'Redes Sociales', shortDesc: 'X e Instagram', icon: Share2, color: 'from-pink-500 to-rose-600', border: 'border-pink-500/70 hover:border-pink-400' },
  social_x: { label: 'Post para X (Twitter)', shortDesc: 'AudioCar Pro · X (<280c)', icon: Share2, color: 'from-slate-600 to-slate-800', border: 'border-slate-500/70 hover:border-slate-400' },
  social_instagram: { label: 'Post para Instagram', shortDesc: 'AudioCar Pro · IG Visual', icon: Share2, color: 'from-pink-500 to-amber-500', border: 'border-pink-500/70 hover:border-pink-400' },
  ai_prompt: { label: 'Prompt para IA', shortDesc: 'Estructura experta', icon: Cpu, color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500/70 hover:border-emerald-400' },
  shopping_list: { label: 'Lista Compra', shortDesc: 'Lista con guiones', icon: ShoppingCart, color: 'from-amber-500 to-orange-600', border: 'border-amber-500/70 hover:border-amber-400' },
  translate: { label: 'Traducir ES ⇄ EN', shortDesc: 'Español ⇄ Inglés', icon: Languages, color: 'from-cyan-500 to-teal-600', border: 'border-cyan-500/70 hover:border-cyan-400' }
};

export interface IncomingWhatsAppMessage {
  transcript: string;
  suggestedReply: string;
  audioUrl?: string;
  fileName: string;
  collapsed: boolean;
}

export default function App() {
  // Autenticación exclusiva para el propietario
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('mywhis_auth_session') || localStorage.getItem('vozia_auth_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email?.toLowerCase().trim() === AUTHORIZED_EMAIL.toLowerCase().trim()) {
        const savedPic = localStorage.getItem('mywhis_user_picture');
        if (savedPic) {
          parsed.picture = savedPic;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [userPicture, setUserPicture] = useState<string>(() => {
    try {
      return localStorage.getItem('mywhis_user_picture') || '';
    } catch {
      return '';
    }
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [showPhotoUrlForm, setShowPhotoUrlForm] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

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

  // Estado para Notas de Voz recibidas de WhatsApp (Compartir directo o botón Subir Audio)
  const [incomingWhatsApp, setIncomingWhatsApp] = useState<IncomingWhatsAppMessage | null>(null);
  const [isProcessingWhatsApp, setIsProcessingWhatsApp] = useState(false);
  const whatsAppFileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado de instalación PWA (necesario para aparecer en el menú "Compartir" nativo de WhatsApp en Android)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);

  // Estado persistente de idioma ('auto' detecta dinámicamente el idioma del texto activo; 'es' o 'en' lo fijan manualmente)
  const [languagePreference, setLanguagePreference] = useState<'auto' | 'es' | 'en'>(() => {
    const saved = localStorage.getItem('mywhis_language_pref');
    return saved === 'es' || saved === 'en' || saved === 'auto' ? saved : 'auto';
  });
  const languagePreferenceRef = useRef<'auto' | 'es' | 'en'>(languagePreference);

  const updateLanguagePreference = (nextPref: 'auto' | 'es' | 'en') => {
    languagePreferenceRef.current = nextPref;
    setLanguagePreference(nextPref);
    try {
      localStorage.setItem('mywhis_language_pref', nextPref);
    } catch {}
  };

  // Prompts y borrador de configuración (v5 con X e Instagram para AudioCar Pro)
  const [prompts, setPrompts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mywhis_custom_prompts_v5');
      return saved ? { ...DEFAULT_PROMPTS, ...JSON.parse(saved) } : DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  });
  const [tempPrompts, setTempPrompts] = useState(prompts);
  const [showSettings, setShowSettings] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState<keyof typeof DEFAULT_PROMPTS>('improve');
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const socialMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showSocialMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (socialMenuRef.current && !socialMenuRef.current.contains(e.target as Node)) {
        setShowSocialMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSocialMenu]);

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
  const isResettingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const wasInBackgroundRef = useRef(false);
  const recordingStartTimeRef = useRef(0);
  const totalPausedDurationRef = useRef(0);
  const pauseStartTimeRef = useRef(0);
  const silentAudioElRef = useRef<HTMLAudioElement | null>(null);
  const silentOscillatorRef = useRef<OscillatorNode | null>(null);

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

  const handleUploadProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            setUserPicture(optimizedBase64);
            try {
              localStorage.setItem('mywhis_user_picture', optimizedBase64);
              if (currentUser) {
                const updated = { ...currentUser, picture: optimizedBase64 };
                setCurrentUser(updated);
                localStorage.setItem('mywhis_auth_session', JSON.stringify(updated));
              }
            } catch {}
            showToast('¡Foto de perfil actualizada!');
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = photoUrlInput.trim();
    if (!cleanUrl) return;
    setUserPicture(cleanUrl);
    try {
      localStorage.setItem('mywhis_user_picture', cleanUrl);
      if (currentUser) {
        const updated = { ...currentUser, picture: cleanUrl };
        setCurrentUser(updated);
        localStorage.setItem('mywhis_auth_session', JSON.stringify(updated));
      }
    } catch {}
    setPhotoUrlInput('');
    setShowPhotoUrlForm(false);
    showToast('¡Foto de perfil actualizada!');
  };

  const handleRemoveProfilePhoto = () => {
    setUserPicture('');
    try {
      localStorage.removeItem('mywhis_user_picture');
      if (currentUser) {
        const updated = { ...currentUser, picture: '' };
        setCurrentUser(updated);
        localStorage.setItem('mywhis_auth_session', JSON.stringify(updated));
      }
    } catch {}
    showToast('Foto de perfil eliminada');
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

  // Observador de visibilidad (segundo plano, minimizar o poner otra app encima)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isRecordingRef.current) {
          wasInBackgroundRef.current = true;
        }
      } else if (document.visibilityState === 'visible') {
        if (isRecordingRef.current && !isPausedRef.current) {
          // 1. Reanudar AudioContext si el navegador lo congeló
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          // 2. Re-activar Screen WakeLock (el navegador lo libera al ocultar la pestaña)
          if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen').then((lock: any) => {
              wakeLockRef.current = lock;
              setWakeLockActive(true);
            }).catch(() => {});
          }
          // 3. Re-conectar reconocimiento de voz si el navegador móvil lo detuvo en segundo plano
          if (shouldKeepRecordingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
          // 4. Sincronizar el contador de tiempo real transcurrido
          if (recordingStartTimeRef.current > 0) {
            const now = Date.now();
            const elapsed = Math.floor((now - recordingStartTimeRef.current - totalPausedDurationRef.current) / 1000);
            setElapsedSeconds(elapsed);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const enableBackgroundPersistence = async () => {
    // 1. Screen WakeLock API
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
      }
    } catch {}

    // 2. Elemento HTML5 de audio silencioso en bucle
    // En móviles (Android y iOS), un elemento de audio reproduciéndose activamente en bucle
    // informa al sistema operativo de que la pestaña tiene prioridad multimedia en segundo plano.
    // Esto evita que Android o iOS suspendan el proceso o silencien el micrófono al poner otra app encima.
    try {
      if (!silentAudioElRef.current) {
        const audio = document.createElement('audio');
        // WAV inaudible de 1 segundo en base64
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        audio.loop = true;
        (audio as any).playsInline = true;
        audio.setAttribute('playsinline', 'true');
        audio.muted = false;
        audio.volume = 0.0001;
        silentAudioElRef.current = audio;
      }
      await silentAudioElRef.current.play().catch(() => {});
    } catch {}

    // 3. Web Audio Context con oscilador inaudible continuo
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

        if (!silentOscillatorRef.current && audioCtxRef.current) {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(25, audioCtxRef.current.currentTime);
          gain.gain.setValueAtTime(0.00001, audioCtxRef.current.currentTime);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          silentOscillatorRef.current = osc;
        }
      }
    } catch {}

    // 4. MediaSession API (Notificación de servicio multimedia en Android)
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Mywhis - Grabación en Segundo Plano Activa',
          artist: 'Dictado continuo',
          album: 'Grabación persistente'
        });
        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => {
          if (isPausedRef.current) resumeRecording();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (!isPausedRef.current) pauseRecording();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopRecording();
        });
      }
    } catch {}
  };

  const disableBackgroundPersistence = async () => {
    // 1. Liberar WakeLock
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      setWakeLockActive(false);
    } catch {}

    // 2. Parar elemento HTML5 de audio
    if (silentAudioElRef.current) {
      try {
        silentAudioElRef.current.pause();
        silentAudioElRef.current.currentTime = 0;
      } catch {}
    }

    // 3. Parar oscilador WebAudio
    if (silentOscillatorRef.current) {
      try {
        silentOscillatorRef.current.stop();
        silentOscillatorRef.current.disconnect();
      } catch {}
      silentOscillatorRef.current = null;
    }

    // 4. MediaSession
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
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
    isRecordingRef.current = true;
    wasInBackgroundRef.current = false;
    recordingStartTimeRef.current = Date.now();
    totalPausedDurationRef.current = 0;
    pauseStartTimeRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        let finalBlob: Blob | null = null;
        if (audioChunksRef.current.length > 0) {
          finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
          setBackupAudioBlob(finalBlob);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Si se estaba ejecutando una limpieza completa (handleFullReset), no transcribir
        if (isResettingRef.current) {
          isResettingRef.current = false;
          return;
        }

        // DISPARADOR AUTOMÁTICO DE IA AUDIO AL TERMINAR LA GRABACIÓN
        // Si el usuario estuvo en segundo plano o el texto está incompleto,
        // transcribe todo el audio grabado con IA sin requerir clics adicionales.
        if (finalBlob && finalBlob.size > 0) {
          transcribeBackupAudio(finalBlob, true);
        }
      };
      // Captura fragmentos cada 1000ms para no perder audio si el sistema suspende la pestaña
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch {
      showToast('No se pudo acceder al micrófono', 'error');
      isRecordingRef.current = false;
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
      if (!isPausedRef.current && recordingStartTimeRef.current > 0) {
        const now = Date.now();
        const elapsed = Math.floor((now - recordingStartTimeRef.current - totalPausedDurationRef.current) / 1000);
        setElapsedSeconds(elapsed);
      }
    }, 500);
  };

  // Pausa la sesión sin finalizar el archivo ni perder fragmentos
  const pauseRecording = () => {
    if (!isRecording || isPaused) return;
    setIsPaused(true);
    isPausedRef.current = true;
    pauseStartTimeRef.current = Date.now();
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

    if (pauseStartTimeRef.current > 0) {
      totalPausedDurationRef.current += (Date.now() - pauseStartTimeRef.current);
      pauseStartTimeRef.current = 0;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current && recordingStartTimeRef.current > 0) {
        const now = Date.now();
        const elapsed = Math.floor((now - recordingStartTimeRef.current - totalPausedDurationRef.current) / 1000);
        setElapsedSeconds(elapsed);
      }
    }, 500);
    showToast('Grabación reanudada');
  };

  // Detiene todo limpiamente y consolida la grabación final
  const stopRecording = () => {
    shouldKeepRecordingRef.current = false;
    isPausedRef.current = false;
    isRecordingRef.current = false;
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
      try {
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
      } catch {}
    }
    disableBackgroundPersistence();
  };

  // Ciclo de vida de borrado exhaustivo y liberación de memoria
  const handleFullReset = () => {
    isResettingRef.current = true;
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

  // Transcripción de audio con IA (ejecutada automáticamente al Terminar o manualmente mediante el botón IA Audio)
  const transcribeBackupAudio = async (blobToTranscribe?: Blob, isAuto = false) => {
    const audioBlob = blobToTranscribe || backupAudioBlob;
    if (!audioBlob || audioBlob.size === 0) {
      if (!isAuto) showToast('No hay audio grabado todavía.', 'error');
      return;
    }

    // Paridad de plataformas y soporte continuo en segundo plano:
    // Si el usuario estuvo en segundo plano (minimizó o puso otra app encima),
    // el reconocimiento en vivo del navegador se detuvo mientras la otra app estaba activa,
    // pero MediaRecorder grabó TODO el audio continuo sin cortes. Por tanto, es IMPRESCINDIBLE
    // transcribir el audio completo con IA para no perder lo que se habló mientras se usaba la otra app.
    // Solo si el usuario NUNCA estuvo en segundo plano y ya tiene texto en vivo,
    // se omite la llamada automática para mantener la inmediatez en PC.
    const hasLiveText = !!rawTextRef.current.trim();
    if (isAuto && hasLiveText && !wasInBackgroundRef.current) {
      return;
    }

    setIsTranscribingAudio(true);
    if (isAuto) {
      showToast(wasInBackgroundRef.current ? 'Recuperando dictado en segundo plano con IA...' : 'Transcribiendo audio automáticamente con IA...', 'info');
    }

    try {
      const reader = new FileReader();
      const base64Audio: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
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
            mimeType: audioBlob.type || 'audio/webm',
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
                    { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } }
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
        // La transcripción de audio completa contiene todo lo dicho, tanto antes como durante el uso de la otra app
        updateRawText(text);
        updateActiveView('raw');
        showToast(isAuto ? '¡Dictado completo recuperado con éxito!' : '¡Audio transcrito con éxito por IA!');
      } else {
        if (!isAuto) throw new Error('No se pudo transcribir');
      }
    } catch {
      if (!isAuto) showToast('Error al transcribir el audio.', 'error');
    } finally {
      setIsTranscribingAudio(false);
      wasInBackgroundRef.current = false;
    }
  };

  // Limpieza automática de Service Workers antiguos para evitar bloqueos por caché en móvil
  useEffect(() => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.update().catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // Reseteo y recuperación integral del sistema (caché, Service Workers, estados colgados y verificación Cloud)
  const handleSystemRecoveryReset = async () => {
    try {
      setIsProcessing(false);
      setIsTranscribingAudio(false);
      if (isRecording) {
        stopRecording();
      }
      setPrompts(DEFAULT_PROMPTS);
      setTempPrompts(DEFAULT_PROMPTS);
      updateLanguagePreference('auto');
      localStorage.setItem('mywhis_custom_prompts_v5', JSON.stringify(DEFAULT_PROMPTS));

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }

      const healthRes = await fetch('/api/health').catch(() => null);
      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        if (healthData.fallbackActive) {
          showToast('Sistema reseteado y operativo (Modo Respaldo Activo: revisa tu clave en Google Cloud).');
          return;
        }
      }
      showToast('¡Reseteo completado! Caché limpiada y sistema recuperado.');
    } catch {
      showToast('Sistema reseteado y listo para usar.');
    }
  };

  // Procesador central de notas de voz de WhatsApp (tanto por Compartir de Android como por botón Subir Audio)
  const processWhatsAppAudioBase64 = async (
    audioBase64: string,
    mimeType: string,
    fileName: string,
    audioUrl?: string
  ) => {
    setIsProcessingWhatsApp(true);
    showToast('Transcribiendo audio de WhatsApp y generando respuesta...', 'info');

    try {
      const res = await fetch('/api/whatsapp-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token || 'cesar-vozia-master-pass-2026'}`,
          'X-User-Email': currentUser?.email || AUTHORIZED_EMAIL,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.transcript) {
        throw new Error(data.error || 'No se pudo transcribir la nota de voz');
      }

      setIncomingWhatsApp({
        transcript: data.transcript,
        suggestedReply: data.suggestedReply || '',
        audioUrl,
        fileName: data.fileName || fileName || 'Nota de voz de WhatsApp',
        collapsed: false,
      });

      if (data.suggestedReply) {
        updateRawText(data.suggestedReply);
        updateTransformedText('');
        updateActiveView('raw');
      }

      showToast('¡Audio de WhatsApp transcrito y respuesta lista!');
    } catch (err: any) {
      showToast(err?.message || 'Error al procesar el audio de WhatsApp.', 'error');
    } finally {
      setIsProcessingWhatsApp(false);
    }
  };

  // Selección manual de archivo de audio de WhatsApp (.opus, .ogg, .m4a, .mp3, .wav, .aac)
  const handleWhatsAppFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const audioUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      const base64Audio: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const resStr = reader.result as string;
          resolve(resStr.includes(',') ? resStr.split(',')[1] : resStr);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await processWhatsAppAudioBase64(
        base64Audio,
        file.type || 'audio/ogg',
        file.name || 'Audio-WhatsApp.opus',
        audioUrl
      );
    } catch {
      showToast('No se pudo leer el archivo de audio seleccionado.', 'error');
    }
  };

  // Regenerar una nueva propuesta de respuesta con IA para el mensaje de WhatsApp recibido
  const handleRegenerateWhatsAppReply = async () => {
    if (!incomingWhatsApp?.transcript || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token || 'cesar-vozia-master-pass-2026'}`,
          'X-User-Email': currentUser?.email || AUTHORIZED_EMAIL,
        },
        body: JSON.stringify({
          text: incomingWhatsApp.transcript,
          mode: 'whatsapp_reply',
          customPrompt: `Actúa como el usuario que recibió este mensaje de voz por WhatsApp. Redacta una respuesta alternativa clara, natural, cordial y directa para contestar por WhatsApp a todos los puntos mencionados en el mensaje. Devuelve únicamente el texto de la respuesta lista para enviar.`,
          requestNonce: Date.now(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = (data.result || data.text || '').trim();
        if (reply) {
          updateRawText(reply);
          updateTransformedText('');
          updateActiveView('raw');
          showToast('¡Nueva respuesta sugerida generada!');
        }
      }
    } catch {
      showToast('Error al regenerar respuesta.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Detector de audio compartido desde WhatsApp en Android (Web Share Target ?shared_audio=1) y PWA Install
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalonePWA(isStandalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Comprobar si la app se abrió al compartir un audio desde WhatsApp
    const checkSharedWhatsAppAudio = async () => {
      try {
        const res = await fetch('/api/shared-audio/latest');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.found && data?.audioBase64) {
          if (window.location.search.includes('shared_audio')) {
            window.history.replaceState({}, '', '/');
          }
          // Crear Blob local reproducible a partir del base64 recibido
          let audioUrl: string | undefined;
          try {
            const byteChars = atob(data.audioBase64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: data.mimeType || 'audio/ogg' });
            audioUrl = URL.createObjectURL(blob);
          } catch {}

          await processWhatsAppAudioBase64(
            data.audioBase64,
            data.mimeType || 'audio/ogg',
            data.fileName || 'Nota de voz de WhatsApp',
            audioUrl
          );
        }
      } catch {}
    };

    checkSharedWhatsAppAudio();

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  // Transformación ultrarrápida (~650ms) con persistencia de idioma, encadenamiento de vista activa y anti-eco
  const handleTransform = async (modeKey: string) => {
    if (isProcessing) return;

    // Si el usuario está viendo un resultado transformado (ej. acaba de traducir a inglés con "Traducir ES ⇄ EN"),
    // operamos sobre ese texto activo en pantalla en lugar de revertir al dictado original en español (rawText).
    const rawCandidate = (rawTextRef.current + ' ' + interimTextRef.current).trim();
    const sourceText =
      activeViewRef.current === 'transformed' && transformedTextRef.current.trim()
        ? transformedTextRef.current.trim()
        : rawCandidate || transformedTextRef.current.trim();

    if (!sourceText) {
      showToast('Primero dicta o escribe algún texto.', 'error');
      return;
    }

    // Resolución de idioma persistente:
    // - Si es 'translate', invierte el idioma del texto actual.
    // - Si el usuario fijó 'es' o 'en' en el selector, fuerza ese idioma.
    // - Si está en 'auto', conserva el idioma detectado en sourceText (ej. inglés tras traducir).
    const detectedSourceLang = detectClientLanguage(sourceText);
    const effectiveTargetLang: 'auto' | 'es' | 'en' =
      modeKey === 'translate'
        ? detectedSourceLang === 'es'
          ? 'en'
          : 'es'
        : languagePreferenceRef.current === 'auto'
        ? detectedSourceLang
        : languagePreferenceRef.current;

    setIsProcessing(true);
    setActiveMode(modeKey);

    try {
      let result = '';
      let serverResolvedLang: 'es' | 'en' | undefined;
      const maxAttempts = 2;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch('/api/improve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Authorization': `Bearer ${currentUser?.token || 'cesar-vozia-master-pass-2026'}`,
              'X-User-Email': currentUser?.email || AUTHORIZED_EMAIL,
            },
            body: JSON.stringify({
              text: sourceText,
              mode: modeKey,
              improveType: modeKey,
              targetLanguage: effectiveTargetLang,
              prompt: prompts[modeKey] || DEFAULT_PROMPTS[modeKey as keyof typeof DEFAULT_PROMPTS],
              customPrompt: prompts[modeKey] || DEFAULT_PROMPTS[modeKey as keyof typeof DEFAULT_PROMPTS],
              requestNonce: Date.now()
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const candidate = (data.result || data.text || '').trim();
            if (candidate) {
              result = candidate;
              if (data.resolvedLanguage === 'en' || data.resolvedLanguage === 'es') {
                serverResolvedLang = data.resolvedLanguage;
              }
              break;
            }
          }
        } catch (attemptErr: any) {
          clearTimeout(timeoutId);
          if (attempt === maxAttempts - 1) {
            throw attemptErr;
          }
          // Backoff silencioso de 300ms antes del segundo intento automático
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (!result) throw new Error('Respuesta vacía');

      // Si el usuario tenía fijado manualmente un idioma ('es' o 'en') y pulsa "Traducir ES ⇄ EN",
      // sincronizamos el selector al nuevo idioma traducido para no bloquear el siguiente botón.
      if (modeKey === 'translate' && languagePreferenceRef.current !== 'auto') {
        const nextLang = serverResolvedLang || detectClientLanguage(result);
        updateLanguagePreference(nextLang);
      }

      updateTransformedText(result);
      updateActiveView('transformed');
      const finalLang = serverResolvedLang || detectClientLanguage(result);
      const label = PROMPT_META[modeKey as keyof typeof PROMPT_META]?.label || modeKey;
      showToast(`¡Listo: ${label} (${finalLang.toUpperCase()})!`);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        showToast('La IA ha tardado demasiado. Vuelve a pulsar el botón.', 'error');
      } else {
        showToast('Error al procesar con Gemini. Pulsa Resetear arriba si persiste.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSettings = () => {
    setPrompts(tempPrompts);
    localStorage.setItem('mywhis_custom_prompts_v5', JSON.stringify(tempPrompts));
    setShowSettings(false);
    showToast('¡Ajustes y prompts guardados correctamente!');
  };

  const currentDisplayedText =
    activeView === 'transformed'
      ? transformedText
      : rawText + (interimText ? (rawText ? ' ' : '') + interimText : '');

  const detectedActiveLang = detectClientLanguage(currentDisplayedText);
  const effectiveActiveLang: 'es' | 'en' =
    languagePreference === 'auto' ? detectedActiveLang : languagePreference;

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
      {/* Input oculto para subir foto de perfil del usuario */}
      <input
        ref={profilePhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadProfilePhoto}
        className="hidden"
      />

      {/* Input oculto para subir audios de WhatsApp (.opus, .ogg, .mp3, .m4a, .wav, .aac) */}
      <input
        ref={whatsAppFileInputRef}
        type="file"
        accept="audio/*,.opus,.ogg,.mp3,.m4a,.wav,.aac,.amr,.webm"
        onChange={handleWhatsAppFileChange}
        className="hidden"
      />

      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs font-medium shadow-2xl flex items-center gap-1.5 animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL (OPTIMIZADA PARA MÓVIL SIN SUPERPOSICIONES) */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shrink-0 z-20">
        <div className="max-w-6xl mx-auto px-2.5 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo y estado (lado izquierdo) */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">Mywhis</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate leading-none mt-0.5">
                {isRecording ? (isPaused ? 'En pausa' : 'Grabando dictado...') : 'Listo para dictar'}
              </p>
            </div>
          </div>

          {/* Botones de acción (lado derecho) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Botón Instalar App (para activar Compartir directo desde WhatsApp en Android) */}
            {deferredInstallPrompt && !isStandalonePWA && (
              <button
                onClick={async () => {
                  try {
                    await deferredInstallPrompt.prompt();
                    const choice = await deferredInstallPrompt.userChoice;
                    if (choice.outcome === 'accepted') {
                      setDeferredInstallPrompt(null);
                      setIsStandalonePWA(true);
                      showToast('¡App instalada! Ya puedes compartir audios desde WhatsApp.');
                    }
                  } catch {}
                }}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer"
                title="Instalar en el teléfono para compartir directo desde WhatsApp"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Instalar</span>
              </button>
            )}

            {/* FOTO / AVATAR DEL USUARIO (Sustituye el correo largo para evitar que se superponga en móvil) */}
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 p-0.5 sm:px-2 sm:py-1 rounded-full sm:rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-all cursor-pointer group shrink-0"
              title={`Perfil: ${currentUser.email} · Toca para ver o cambiar foto`}
            >
              <div className="w-7 h-7 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-inner ring-1 ring-indigo-400/40 shrink-0 relative">
                {userPicture ? (
                  <img
                    src={userPicture}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                    onError={() => setUserPicture('')}
                  />
                ) : (
                  <span className="font-bold text-indigo-200 text-xs">C</span>
                )}
              </div>
              {/* En móviles ocultamos el correo; en pantallas grandes se muestra de forma elegante */}
              <span className="hidden md:inline text-slate-300 font-medium text-xs max-w-[100px] truncate">
                {currentUser.name || 'César'}
              </span>
            </button>

            {/* Botón Resetear */}
            <button
              onClick={handleSystemRecoveryReset}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
              title="Resetear caché y recuperar sistema"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Resetear</span>
            </button>

            {/* Botón Prompts */}
            <button
              onClick={() => {
                setTempPrompts(prompts);
                setShowSettings(true);
              }}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Configurar Prompts"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">Prompts</span>
            </button>

            {/* Botón Salir */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL ADAPTADO (ZERO SCROLL) */}
      <main className="flex-1 min-h-0 max-w-6xl w-full mx-auto p-2 sm:p-3 flex flex-col gap-2 overflow-hidden">
        {/* PANEL DE CONTROL DE GRABACIÓN + BOTÓN SUBIR AUDIO WHATSAPP */}
        <section className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 shrink-0 flex items-center justify-between gap-2 sm:gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 hover:scale-105 shadow-md shadow-indigo-500/30 cursor-pointer transition-all active:scale-95"
                title="Comenzar a dictar"
              >
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/30 cursor-pointer transition-all active:scale-95 animate-pulse"
                    title="Reanudar grabación en el mismo archivo"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 cursor-pointer transition-all active:scale-95"
                    title="Pausar temporalmente"
                  >
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 cursor-pointer transition-all active:scale-95"
                  title="Finalizar grabación"
                >
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
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
                    ? incomingWhatsApp
                      ? 'Dicta tu respuesta o edita abajo'
                      : 'Pulsa el micro para dictar'
                    : isPaused
                    ? 'Pausado (pulsa play para reanudar)'
                    : 'Grabando dictado...'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-mono tabular-nums text-xs sm:text-sm font-bold ${isPaused ? 'text-amber-400' : 'text-indigo-400'}`}>
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 tabular-nums">{wordCount} pal.</span>
                {isPaused && (
                  <span className="text-[10px] text-amber-300 font-medium">
                    · En Pausa
                  </span>
                )}
                {wakeLockActive && (
                  <span className="hidden xs:inline text-[10px] text-emerald-300 font-medium">
                    · Pantalla ON
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón para subir o abrir Nota de Voz de WhatsApp */}
            <button
              type="button"
              onClick={() => whatsAppFileInputRef.current?.click()}
              disabled={isProcessingWhatsApp}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-sm active:scale-95 whitespace-nowrap"
              title="Subir o transcribir un audio de WhatsApp (.opus, .ogg, .m4a, .mp3)"
            >
              {isProcessingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Audio WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => transcribeBackupAudio()}
              disabled={isTranscribingAudio}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-sm whitespace-nowrap"
              title="Transcribir audio grabado con IA"
            >
              {isTranscribingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">IA Audio</span>
            </button>
          </div>
        </section>

        {/* TARJETA SUPERIOR DE CONTEXTO: MENSAJE DE AUDIO RECIBIDO DE WHATSAPP */}
        {incomingWhatsApp && (
          <section className="bg-emerald-950/25 border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 shrink-0 flex flex-col gap-2 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-emerald-200 truncate">
                  Mensaje recibido de WhatsApp
                </span>
                <span className="text-[11px] text-emerald-400/80 hidden sm:inline truncate">
                  · {incomingWhatsApp.fileName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    updateRawText('');
                    updateTransformedText('');
                    updateActiveView('raw');
                    if (!isRecording) {
                      startRecording();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                  title="Borrar borrador y dictar mi propia respuesta viendo este mensaje arriba"
                >
                  <Mic className="w-3 h-3" />
                  <span>Dictar respuesta</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateWhatsAppReply}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                  title="Generar otra propuesta de respuesta automática con IA"
                >
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span className="hidden xs:inline">Otra respuesta IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(incomingWhatsApp.transcript);
                    showToast('Transcripción del audio recibido copiada');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Copiar transcripción recibida"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIncomingWhatsApp((prev) => (prev ? { ...prev, collapsed: !prev.collapsed } : null))
                  }
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title={incomingWhatsApp.collapsed ? 'Mostrar mensaje recibido' : 'Plegar mensaje recibido'}
                >
                  {incomingWhatsApp.collapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIncomingWhatsApp(null)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="Cerrar mensaje recibido"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!incomingWhatsApp.collapsed && (
              <div className="flex flex-col gap-2">
                <div className="max-h-24 sm:max-h-28 overflow-y-auto rounded-xl bg-slate-950/70 border border-emerald-500/20 p-2.5 text-xs sm:text-sm text-slate-100 leading-relaxed select-text">
                  {incomingWhatsApp.transcript}
                </div>
                {incomingWhatsApp.audioUrl && (
                  <audio
                    controls
                    src={incomingWhatsApp.audioUrl}
                    className="h-7 w-full max-w-sm opacity-90"
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* ÁREA DE TEXTO CON CONTENEDOR CENTRAL EXACTO A LA IMAGEN */}
        <section className="flex-1 min-h-0 flex flex-col bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-inner">
          {/* Pestañas de vista rápida + Selector explícito de Idioma (Auto / ES / EN) */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => updateActiveView('raw')}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeView === 'raw' ? 'bg-slate-800 text-white border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {incomingWhatsApp ? 'Tu Respuesta (Editable)' : 'Dictado en Bruto (Raw)'}
              </button>
              {transformedText && (
                <button
                  type="button"
                  onClick={() => updateActiveView('transformed')}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeView === 'transformed'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ✨ Resultado IA ({activeMode ? PROMPT_META[activeMode as keyof typeof PROMPT_META]?.label : 'IA'})
                </button>
              )}
            </div>

            {/* Selector de Idioma Persistente (Auto detecta idioma del texto en pantalla; ES/EN fuerzan idioma) */}
            <div
              className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shrink-0"
              title="Idioma de salida para Prompts y transformaciones (Auto respeta el idioma actual del texto)"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400 ml-1.5 hidden xs:inline" />
              {(['auto', 'es', 'en'] as const).map((langOpt) => {
                const isSelected = languagePreference === langOpt;
                const label =
                  langOpt === 'auto'
                    ? `Auto (${effectiveActiveLang.toUpperCase()})`
                    : langOpt.toUpperCase();
                return (
                  <button
                    key={langOpt}
                    type="button"
                    onClick={() => {
                      updateLanguagePreference(langOpt);
                      const msg =
                        langOpt === 'auto'
                          ? `Idioma automático (${detectedActiveLang.toUpperCase()} detectado)`
                          : `Idioma fijado en ${langOpt === 'en' ? 'Inglés (EN)' : 'Español (ES)'}`;
                      showToast(msg);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea contenedor con overlay central exactamente igual a la imagen */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-[#070b14]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-white">Transformando texto con Gemini...</p>
              </div>
            )}
            {isTranscribingAudio && (
              <div className="absolute inset-0 z-20 bg-[#070b14]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm font-semibold text-white">Transcribiendo audio con IA...</p>
              </div>
            )}
            {isProcessingWhatsApp && (
              <div className="absolute inset-0 z-20 bg-[#070b14]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm font-semibold text-white">Transcribiendo nota de voz de WhatsApp y preparando respuesta...</p>
              </div>
            )}
            <textarea
              value={currentDisplayedText}
              onChange={(e) => {
                if (activeView === 'transformed') updateTransformedText(e.target.value);
                else updateRawText(e.target.value);
              }}
              placeholder={
                incomingWhatsApp
                  ? 'Aquí tienes la respuesta sugerida. Puedes editarla o pulsar el micrófono para dictar tu propia contestación...'
                  : 'Habla por el micrófono, escribe aquí o sube un audio de WhatsApp...'
              }
              className="w-full h-full flex-1 p-3 sm:p-4 bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* BARRA INFERIOR DE ACCIONES */}
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{incomingWhatsApp ? 'Responder / Compartir' : 'Compartir'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentDisplayedText.trim()) return;
                  navigator.clipboard.writeText(currentDisplayedText.trim());
                  showToast('¡Copiado al portapapeles!');
                }}
                disabled={!currentDisplayedText.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-semibold border border-slate-700 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </button>
            </div>

            {/* Borrado integral */}
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3000);
                  return;
                }
                setIncomingWhatsApp(null);
                handleFullReset();
              }}
              disabled={!rawText && !transformedText && !backupAudioBlob && !isRecording && !incomingWhatsApp}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                confirmClear
                  ? 'bg-red-600 text-white border-red-500 animate-pulse'
                  : 'bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border-slate-800'
              }`}
              title="Borrado total"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmClear ? '¿Borrar todo?' : 'Borrar'}</span>
            </button>
          </div>
        </section>

        {/* LOS 6 BOTONES DE TRANSFORMACIÓN RÁPIDA (CON DESPLEGABLE HACIA ARRIBA EN REDES SOCIALES) */}
        <section className="shrink-0 pt-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(['improve', 'email', 'social', 'ai_prompt', 'shopping_list', 'translate'] as const).map((key) => {
              const meta = PROMPT_META[key];
              const IconComponent = meta.icon;
              const isThisActive =
                isProcessing &&
                (activeMode === key ||
                  (key === 'social' && (activeMode === 'social_x' || activeMode === 'social_instagram')));

              if (key === 'social') {
                return (
                  <div key={key} ref={socialMenuRef} className="relative">
                    {/* Desplegable hacia arriba para elegir X (Twitter) o Instagram */}
                    {showSocialMenu && (
                      <div className="absolute bottom-full left-0 right-0 sm:min-w-[230px] mb-2 z-40 bg-slate-900/95 backdrop-blur-xl border border-pink-500/50 rounded-2xl p-1.5 shadow-2xl shadow-black/80 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
                          <span>Elegir Red Social</span>
                          <span className="text-pink-400">AudioCar Pro</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSocialMenu(false);
                            handleTransform('social_x');
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                        >
                          <div className="w-7 h-7 rounded-lg bg-black border border-slate-700 flex items-center justify-center text-white font-black text-xs shrink-0">
                            𝕏
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white leading-tight truncate">
                              X (Twitter)
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Post directo &lt;280c · 2 opciones
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSocialMenu(false);
                            handleTransform('social_instagram');
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/50 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                            IG
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white leading-tight truncate">
                              Instagram
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Post / Reel visual · 2 opciones
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSocialMenu((prev) => !prev)}
                      disabled={isProcessing}
                      className={`w-full p-2 sm:p-2.5 rounded-2xl bg-[#0b1120] hover:bg-slate-800/80 border ${
                        showSocialMenu ? 'border-pink-400 ring-1 ring-pink-500/40 bg-slate-800/90' : meta.border
                      } flex items-center justify-between gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm select-none touch-manipulation`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                          {isThisActive ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                          {activeMode === 'social_x'
                            ? 'Redes (X)'
                            : activeMode === 'social_instagram'
                            ? 'Redes (IG)'
                            : meta.label}
                        </span>
                      </div>
                      <ChevronUp
                        className={`w-3.5 h-3.5 text-pink-400 shrink-0 transition-transform duration-150 ${
                          showSocialMenu ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setShowSocialMenu(false);
                    handleTransform(key);
                  }}
                  disabled={isProcessing}
                  className={`p-2 sm:p-2.5 rounded-2xl bg-[#0b1120] hover:bg-slate-800/80 border ${
                    meta.border
                  } flex items-center gap-2 sm:gap-2.5 transition-all active:scale-95 cursor-pointer shadow-sm select-none touch-manipulation`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    {isThisActive ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                    {meta.label}
                  </span>
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

            {/* Pestañas de los Prompts (incluyendo X e Instagram separados) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-2 bg-slate-950/60 border-b border-slate-800 shrink-0">
              {(['improve', 'email', 'social_x', 'social_instagram', 'ai_prompt', 'shopping_list', 'translate'] as const).map((key) => {
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
                    {key === 'social_x' && '𝕏 Post X'}
                    {key === 'social_instagram' && '📸 Insta'}
                    {key === 'ai_prompt' && '🤖 Prompt'}
                    {key === 'shopping_list' && '🛒 Compra'}
                    {key === 'translate' && '🌐 Traducir'}
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
                  Restaurar todos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERFIL / FOTO DE USUARIO */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm sm:text-base font-bold text-white">Perfil de Usuario</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowPhotoUrlForm(false);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Foto de perfil grande interactiva */}
            <div className="flex flex-col items-center gap-2.5 py-1 text-center">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl ring-4 ring-indigo-500/30">
                  {userPicture ? (
                    <img
                      src={userPicture}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                      onError={() => setUserPicture('')}
                    />
                  ) : (
                    <span>C</span>
                  )}
                </div>
                {/* Botón flotante de cámara para cambiar foto con un toque */}
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md border-2 border-slate-900 cursor-pointer transition-all"
                  title="Cambiar foto de perfil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">César</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
                <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Propietario Verificado</span>
                </div>
              </div>
            </div>

            {/* Acciones para la foto de perfil */}
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{userPicture ? 'Cambiar foto desde el móvil' : 'Subir foto desde el móvil'}</span>
              </button>

              {!showPhotoUrlForm ? (
                <button
                  type="button"
                  onClick={() => setShowPhotoUrlForm(true)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pegar enlace o URL de foto de Google</span>
                </button>
              ) : (
                <form onSubmit={handleSavePhotoUrl} className="flex flex-col gap-1.5 p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Pega la URL de tu foto de Google o de internet:</span>
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!photoUrlInput.trim()}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}

              {userPicture && (
                <button
                  type="button"
                  onClick={handleRemoveProfilePhoto}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar foto (usar letra inicial)</span>
                </button>
              )}
            </div>

            {/* Pie de modal */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleLogout();
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowPhotoUrlForm(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}