import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Square, Copy, Check, Sparkles, Settings, RefreshCw, 
  ChevronLeft, X, Shield, Sliders, Bell, Layers, Lock, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowRight, Eye, Code, Volume2, Info, Moon, Sun, Smartphone,
  Share2, Send, MessageSquare, Mail, FileDown, Trash2, Wand2, Users, User, MessageCircle,
  Undo2, Redo2
} from 'lucide-react';
import { AppSettings } from './types';
import { initialSettings, codeModules } from './data/codeModules';
import { PearLogo } from './components/PearLogo';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AndroidPermissionsGuide } from './components/AndroidPermissionsGuide';
import { useRealSpeechRecognition } from './hooks/useRealSpeechRecognition';

// Helper to parse dialogue into structured speaker turns
function parseConversationTurns(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const turns: { speaker: string; text: string }[] = [];
  
  const speakerRegex = /^(Persona \d+|Voz [A-Z]|\*\*Persona \d+\*\*|\*\*Voz [A-Z]\*\*|Hablante \d+):?\s*(.*)$/i;
  
  for (const line of lines) {
    const match = line.match(speakerRegex);
    if (match) {
      const rawSpeaker = match[1].replace(/\*\*/g, '').trim();
      const content = match[2].trim();
      turns.push({ speaker: rawSpeaker, text: content });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += ' ' + line;
    } else {
      turns.push({ speaker: 'Persona 1', text: line });
    }
  }
  return turns;
}

export default function App() {
  // Navigation tabs / views
  // 'clean_screen' | 'onboarding_wizard' | 'permissions_audit' | 'settings'
  const [activeView, setActiveView] = useState<'clean_screen' | 'onboarding_wizard' | 'permissions_audit' | 'settings'>('clean_screen');

  // Recording Mode: single speaker vs 2 speakers conversation
  const [recordingMode, setRecordingMode] = useState<'dictation' | 'conversation'>('dictation');
  const [dialogueViewTab, setDialogueViewTab] = useState<'dialogue' | 'plain'>('dialogue');

  const performStopRef = useRef<((isAutoMax?: boolean) => Promise<void>) | null>(null);

  // Real Speech Recognition & Dictation with 40-minute maximum and screen-off keepalive
  const speech = useRealSpeechRecognition({
    maxDurationSeconds: 2400, // 40 minutes (2400 seconds)
    onMaxDurationReached: () => {
      performStopRef.current?.(true);
    },
  });
  const [processedText, setProcessedText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [improvedWithAi, setImprovedWithAi] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  // Onboarding Wizard step (0 to 7 matching user photos)
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [simulatedAndroidDialog, setSimulatedAndroidDialog] = useState<boolean>(false);
  const [simulatedAccessibilityModal, setSimulatedAccessibilityModal] = useState<boolean>(false);
  const [grantedPermissions, setGrantedPermissions] = useState<{
    microphone: boolean;
    overlay: boolean;
    accessibility: boolean;
    notifications: boolean;
    batteryExemption: boolean;
  }>({
    microphone: true,
    overlay: true,
    accessibility: true,
    notifications: true,
    batteryExemption: true
  });

  const performStopRecording = async (isAutoMax: boolean = false) => {
    if (!speech.isRecording) return;
    const liveDraft = speech.transcript.trim();
    setIsProcessing(true);
    if (isAutoMax) {
      setShareSuccessToast('⏱️ ¡Límite máximo de 40 minutos alcanzado! Transcribiendo grabación...');
    }
    try {
      const transcribedText = await speech.stopRecording({ mode: recordingMode });
      if (transcribedText && transcribedText.trim()) {
        const cleanText = transcribedText.trim();
        setOriginalText(cleanText);
        if (liveDraft && liveDraft !== cleanText && liveDraft.length > 5) {
          setUndoHistory([liveDraft]);
        } else {
          setUndoHistory([]);
        }
        setRedoHistory([]);
        setProcessedText(cleanText);
        setImprovedWithAi(true);
        const toastMsg = isAutoMax
          ? '¡Sesión de 40 min completada y transcrita con éxito!'
          : (recordingMode === 'conversation'
              ? '¡Conversación transcrita con identificación de 2 voces!'
              : '¡Texto dictado listo para compartir!');
        setShareSuccessToast(toastMsg);
        setTimeout(() => setShareSuccessToast(null), 3500);
      } else {
        setProcessedText('');
        setOriginalText('');
        setUndoHistory([]);
        setRedoHistory([]);
        setShareSuccessToast('No se detectó voz en la grabación. Habla más cerca del micrófono.');
        setTimeout(() => setShareSuccessToast(null), 3500);
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    performStopRef.current = (isAutoMax?: boolean) => performStopRecording(isAutoMax);
  });

  const toggleRecording = async () => {
    if (speech.isRecording) {
      await performStopRecording(false);
    } else {
      // Start recording
      setProcessedText('');
      setOriginalText('');
      setUndoHistory([]);
      setRedoHistory([]);
      setImprovedWithAi(false);
      speech.clearError();
      setShowNotificationToast(true);
      await speech.startRecording();
    }
  };

  const handleImproveText = async () => {
    if (!processedText.trim() || isImproving) return;
    setIsImproving(true);
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: processedText, mode: recordingMode }),
      });
      const data = await res.json();
      if (res.ok && data.text && data.text.trim()) {
        const cleanImproved = data.text.trim();
        const beforeText = processedText;
        if (cleanImproved !== beforeText) {
          setUndoHistory(prev => [...prev, beforeText]);
          setRedoHistory([]);
          if (!originalText) {
            setOriginalText(beforeText);
          }
          setProcessedText(cleanImproved);
          setImprovedWithAi(true);
          setShareSuccessToast('¡Texto mejorado: puntuación, comas y repeticiones corregidas!');
        } else {
          setShareSuccessToast('El texto ya cuenta con una redacción óptima');
        }
        setTimeout(() => setShareSuccessToast(null), 3000);
      } else {
        setShareSuccessToast(data.error || 'No se pudo conectar con el redactor IA');
        setTimeout(() => setShareSuccessToast(null), 3000);
      }
    } catch (err) {
      console.error('Error improving text with AI:', err);
      setShareSuccessToast('Error al conectar con la IA');
      setTimeout(() => setShareSuccessToast(null), 2500);
    } finally {
      setIsImproving(false);
    }
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    setRedoHistory(prev => [...prev, processedText]);
    setProcessedText(previous);
    setShareSuccessToast('Texto devuelto a la versión anterior');
    setTimeout(() => setShareSuccessToast(null), 2500);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setUndoHistory(prev => [...prev, processedText]);
    setProcessedText(next);
    setShareSuccessToast('Texto restablecido a la versión mejorada');
    setTimeout(() => setShareSuccessToast(null), 2500);
  };

  const handleProcessDictation = async (rawSpeech: string) => {
    const cleanSpeech = rawSpeech.trim();
    if (!cleanSpeech) {
      setProcessedText('');
      return;
    }
    setProcessedText(cleanSpeech);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (textToShare?: string) => {
    const content = textToShare || processedText;
    if (!content) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Mywhis Dictado',
          text: content,
        });
        setShareSuccessToast('¡Compartido con éxito!');
        setTimeout(() => setShareSuccessToast(null), 2500);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const shareToApp = (appName: string, urlGenerator: (text: string) => string | null, directAction?: () => void) => {
    if (directAction) {
      directAction();
      setShareSuccessToast(`Acción completada: ${appName}`);
      setTimeout(() => setShareSuccessToast(null), 2500);
      setShowShareModal(false);
      return;
    }

    const url = urlGenerator(processedText);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setShareSuccessToast(`Abriendo en ${appName}...`);
      setTimeout(() => setShareSuccessToast(null), 2500);
      setShowShareModal(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!processedText) return;
    const blob = new Blob([processedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictado_mywhis_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareSuccessToast('Archivo de texto guardado');
    setTimeout(() => setShareSuccessToast(null), 2500);
    setShowShareModal(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="fixed inset-0 w-full h-full max-h-[100dvh] bg-[#fafafc] text-slate-900 flex flex-col justify-between selection:bg-blue-500 selection:text-white font-sans overflow-hidden">
      
      {/* Top Header: Brand, PWA Install & Settings */}
      <header className="w-full max-w-lg mx-auto px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-1 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
            <PearLogo className="w-5 h-5 text-slate-800" strokeWidth={2.4} />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">Mywhis</span>
        </div>

        <div className="flex items-center space-x-2">
          <PWAInstallButton variant="header" />
          <button
            onClick={() => setActiveView(activeView === 'settings' ? 'clean_screen' : 'settings')}
            className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition shadow-xs active:scale-95"
            title="Configuración"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Subtle Dotted Horizon Guideline */}
      <div className="w-full border-b border-dotted border-slate-300/80 pointer-events-none shrink-0"></div>

      {/* VIEW 1: CLEAN MAIN SCREEN */}
      {activeView === 'clean_screen' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-lg mx-auto px-4 py-1 relative min-h-0 overflow-hidden">

            {/* Active Android Foreground Notification Pill Toast (Optional Simulation) */}
            {/* Center Airy Space with Live Speech / Results */}
            <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 relative z-10 w-full max-w-md mx-auto min-h-0 overflow-hidden">
              
              {/* Mic Permission Warning / Error Card */}
              {speech.errorMessage ? (
                <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-3 animate-fadeIn shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <MicOff className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-rose-900">Sin permiso de micrófono</h4>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {speech.errorMessage}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={async () => {
                        speech.clearError();
                        await speech.startRecording();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
                    >
                      Conceder permiso
                    </button>
                    <button
                      onClick={() => setActiveView('settings')}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-800 font-semibold text-xs hover:bg-rose-50 transition"
                    >
                      Ver Ajustes de Android
                    </button>
                  </div>
                </div>
              ) : speech.isRecording ? (
                /* Active Recording State */
                <div className="text-center space-y-3.5 animate-fadeIn max-w-xs w-full">
                  <div className="flex items-center justify-center space-x-1 h-12">
                    {speech.waveform.map((h, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(8, h * 0.45)}px` }}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          recordingMode === 'conversation' ? 'bg-indigo-600' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-1.5">
                      {recordingMode === 'conversation' ? (
                        <>
                          <Users className="w-4 h-4 text-indigo-600 animate-pulse" />
                          <span>Grabando conversación (2 voces)...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-blue-600" />
                          <span>Escuchando voz...</span>
                        </>
                      )}
                    </p>

                    {/* Timer with 40-minute limit and progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 font-mono text-xs font-bold text-blue-600">
                        <span>{formatTime(speech.recordingSeconds)}</span>
                        <span className="text-slate-400 font-normal">/</span>
                        <span className="text-slate-500 font-normal">40:00</span>
                      </div>
                      <div className="w-full max-w-[200px] mx-auto bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            speech.timeRemainingSeconds <= 300 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, (speech.recordingSeconds / speech.maxDurationSeconds) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {speech.timeRemainingSeconds <= 120 && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        Quedan {Math.ceil(speech.timeRemainingSeconds / 60)} min
                      </div>
                    )}
                  </div>

                  {speech.transcript && (
                    <div className="bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-800 text-left max-h-28 overflow-y-auto">
                      "{speech.transcript}"
                    </div>
                  )}
                </div>
              ) : (isProcessing || speech.isTranscribing) ? (
                /* Processing State */
                <div className="text-center space-y-2 animate-fadeIn py-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-800">
                    {recordingMode === 'conversation'
                      ? 'Analizando audio e identificando 2 voces...'
                      : (speech.recordingSeconds > 60
                          ? `Procesando grabación (${formatTime(speech.recordingSeconds)})...`
                          : 'Transcribiendo audio...')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {speech.recordingSeconds > 120
                      ? 'Las grabaciones largas tardan solo unos segundos en sintetizarse'
                      : 'Un momento por favor'}
                  </p>
                </div>
              ) : processedText ? (
                /* Finished Result State - Single Voice or 2-Voice Dialogue */
                (() => {
                  const turns = parseConversationTurns(processedText);
                  const isDialogue = turns.length > 1 && (
                    processedText.toLowerCase().includes('persona 1') ||
                    processedText.toLowerCase().includes('persona 2') ||
                    recordingMode === 'conversation'
                  );

                  return (
                    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-md space-y-2.5 animate-fadeIn max-h-[50vh] flex flex-col min-h-0">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {isDialogue ? 'Conversación (2 Voces)' : 'Texto Dictado'}
                          </span>
                          {isDialogue && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded-md border border-indigo-200/60 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              2 Voces
                            </span>
                          )}
                          {improvedWithAi && (
                            <span className="text-[10px] bg-violet-50 text-violet-700 font-medium px-1.5 py-0.5 rounded-md border border-violet-200/60 flex items-center gap-1">
                              ✨ IA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Botón Mejorar con IA */}
                          <button
                            onClick={handleImproveText}
                            disabled={isImproving}
                            className="flex items-center gap-1 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-2.5 py-1 rounded-full transition shadow-sm font-medium active:scale-95 disabled:opacity-50"
                            title="Tratamiento con IA: depurar diálogos, corregir puntuación y eliminar muletillas"
                          >
                            {isImproving ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              <Wand2 className="w-3 h-3 text-amber-300" />
                            )}
                            <span>{isImproving ? 'Mejorando...' : 'Mejorar'}</span>
                          </button>

                          {/* Pequeña flecha de vuelta atrás por si no nos gusta la mejora */}
                          {undoHistory.length > 0 && (
                            <button
                              onClick={handleUndo}
                              className="flex items-center gap-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-2 py-1 rounded-full transition shadow-xs font-semibold active:scale-95 animate-fadeIn"
                              title="Volver atrás al texto original si no te gusta la mejora"
                            >
                              <Undo2 className="w-3.5 h-3.5 text-amber-700" />
                              <span className="text-[11px]">Atrás</span>
                            </button>
                          )}

                          {/* Botón Rehacer si se volvió atrás */}
                          {redoHistory.length > 0 && (
                            <button
                              onClick={handleRedo}
                              className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2 py-1 rounded-full transition shadow-xs font-medium active:scale-95 animate-fadeIn"
                              title="Rehacer la mejora de IA"
                            >
                              <Redo2 className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-[11px] hidden sm:inline">Rehacer</span>
                            </button>
                          )}

                          {/* Botón Compartir - Acción principal destacada para móvil */}
                          <button
                            onClick={() => handleShare(processedText)}
                            className="flex items-center gap-1.5 text-xs sm:text-[13px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all shadow-sm hover:shadow-md font-semibold active:scale-95 ring-2 ring-blue-500/25"
                            title="Compartir con WhatsApp, Telegram, correo o cualquier app"
                          >
                            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" strokeWidth={2.4} />
                            <span>Compartir</span>
                          </button>

                          {/* Botón Copiar */}
                          <button
                            onClick={() => handleCopy(processedText)}
                            className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-full transition shadow-xs font-medium active:scale-95"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copiado' : 'Copiar'}</span>
                          </button>

                          {/* Botón Borrar */}
                          <button
                            onClick={() => {
                              setProcessedText('');
                              setOriginalText('');
                              setUndoHistory([]);
                              setRedoHistory([]);
                              setImprovedWithAi(false);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition active:scale-90"
                            title="Borrar texto dictado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tab selector if dialogue detected: Diálogo vs Texto plano */}
                      {isDialogue && (
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
                            <button
                              type="button"
                              onClick={() => setDialogueViewTab('dialogue')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                dialogueViewTab === 'dialogue'
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              💬 Diálogo separado
                            </button>
                            <button
                              type="button"
                              onClick={() => setDialogueViewTab('plain')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                dialogueViewTab === 'plain'
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              📄 Texto plano
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {turns.length} intervenciones
                          </span>
                        </div>
                      )}

                      {/* Content Area */}
                      {isDialogue && dialogueViewTab === 'dialogue' ? (
                        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 flex-1 min-h-0">
                          {turns.map((turn, i) => {
                            const isPerson1 = turn.speaker.toLowerCase().includes('1') || turn.speaker.toLowerCase().includes('a');
                            return (
                              <div
                                key={i}
                                className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                                  isPerson1
                                    ? 'bg-blue-50/60 border-blue-100/90 text-slate-800'
                                    : 'bg-emerald-50/60 border-emerald-100/90 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1 font-semibold text-[11px]">
                                  {isPerson1 ? (
                                    <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded-md">
                                      <User className="w-3 h-3" />
                                      {turn.speaker}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                                      <Users className="w-3 h-3" />
                                      {turn.speaker}
                                    </span>
                                  )}
                                </div>
                                <p className="pl-1">{turn.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap max-h-[30vh] overflow-y-auto pr-1 flex-1 min-h-0">
                          {processedText}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                          <span>Auto-inyectado en app con foco</span>
                          {undoHistory.length > 0 ? (
                            <button
                              onClick={handleUndo}
                              className="text-[10px] text-amber-700 hover:text-amber-900 hover:underline font-semibold flex items-center gap-1"
                              title="Deshacer mejora y volver a la versión previa"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Volver al texto anterior</span>
                            </button>
                          ) : originalText && originalText !== processedText ? (
                            <button
                              onClick={() => {
                                const temp = processedText;
                                setProcessedText(originalText);
                                setOriginalText(temp);
                              }}
                              className="text-[10px] text-indigo-600 hover:underline font-medium flex items-center gap-1"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Ver versión anterior</span>
                            </button>
                          ) : null}
                        </div>
                        <span>Mywhis IA</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Empty Clean State - Pristine Minimalism & Centered */
                <div className="text-center space-y-1.5 py-4 opacity-80 hover:opacity-100 transition duration-300">
                  <p className="text-xs text-slate-600 font-medium">Mywhis está listo</p>
                  <p className="text-[11px] text-slate-400">Pulsa la Pera abajo para hablar</p>
                </div>
              )}

            </div>

            {/* Bottom Section: Mode Selector & The Iconic Pear Stadium Button */}
            <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-0.5 flex flex-col items-center justify-end z-20 shrink-0">
              
              {/* Voice Mode Selector Pill */}
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-full border border-slate-300/60 shadow-2xs text-xs mb-2">
                <button
                  type="button"
                  onClick={() => setRecordingMode('dictation')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    recordingMode === 'dictation'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Modo dictado individual (1 sola voz)"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>1 Voz (Dictado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingMode('conversation')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    recordingMode === 'conversation'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Modo conversación / entrevista (identifica 2 voces y separa intervenciones)"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2 Voces (Conversación)</span>
                </button>
              </div>

              <div className="p-1 rounded-full border-2 border-slate-300/80 bg-slate-200/50 shadow-inner">
                <button
                  onClick={toggleRecording}
                  className={`w-24 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                    speech.isRecording 
                      ? 'bg-rose-500 text-white ring-4 ring-rose-300/50 scale-95' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 active:scale-95'
                  }`}
                  title={speech.isRecording ? "Detener grabación" : "Pulsar para hablar"}
                >
                  {speech.isRecording ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    /* The Iconic Rounded Mywhis Pear Logo */
                    <PearLogo className="w-7 h-7 text-slate-700" strokeWidth={2.4} />
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: INTERACTIVE ONBOARDING / PERMISSIONS WIZARD (Step by Step Matching Images 2 to 10) */}
        {activeView === 'onboarding_wizard' && (
          <div className="flex-1 flex flex-col w-full max-w-lg mx-auto bg-white my-2 rounded-2xl border border-slate-200 shadow-xs relative overflow-y-auto min-h-0">
            
            {/* Top Navigation & Stepper */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
              <button
                onClick={() => {
                  if (wizardStep > 0) setWizardStep(s => s - 1);
                  else setActiveView('clean_screen');
                }}
                className="text-slate-600 hover:text-slate-900 p-1"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Stepper Dots (from screenshots) */}
              <div className="flex items-center space-x-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      wizardStep === idx 
                        ? 'w-6 bg-slate-700' 
                        : 'w-1.5 bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setActiveView('clean_screen')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Skip
              </button>
            </div>

            {/* WIZARD STEP 0: Welcome ("Let's set up Mywhis") - Matching Image 9 */}
            {wizardStep === 0 && (
              <div className="flex-1 p-6 flex flex-col justify-between items-center text-center">
                <div className="flex-1 flex flex-col justify-center items-center max-w-xs">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mb-6 shadow-sm">
                    <PearLogo className="w-9 h-9 text-slate-800" strokeWidth={2.4} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">
                    Let's set up<br />Mywhis
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    We'll guide you through permissions and make sure Mywhis works the way you want.
                  </p>
                </div>
                <button
                  onClick={() => setWizardStep(1)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Start setup
                </button>
              </div>
            )}

            {/* WIZARD STEP 1: Microphone Permission - Matching Image 7 & 8 */}
            {wizardStep === 1 && (
              <div className="flex-1 p-6 flex flex-col justify-between relative">
                {/* Waveform graphic from screenshot */}
                <div className="flex items-end justify-center space-x-1 h-32 pt-6 opacity-70">
                  {[25, 45, 65, 80, 55, 95, 75, 40, 60, 85, 50, 70, 45, 30, 65].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1.5 bg-gradient-to-t from-slate-200 to-slate-400 rounded-full"
                    />
                  ))}
                </div>

                <div className="space-y-3 my-auto">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Allow Mywhis to use your microphone
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    To turn your voice into beautiful text, we need access to your microphone.
                  </p>
                  <a href="#privacy" className="inline-flex items-center gap-1 text-xs text-[#007AFF] font-medium pt-1">
                    <span>👤 Learn how we protect your privacy</span>
                  </a>
                </div>

                <button
                  onClick={() => setSimulatedAndroidDialog(true)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Allow microphone access
                </button>

                {/* Simulated Native Android Dialog (Matching Image 7) */}
                {simulatedAndroidDialog && (
                  <div className="absolute inset-0 bg-black/40 z-40 flex items-end p-3 animate-fadeIn">
                    <div className="w-full bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-slideUp">
                      <div className="flex items-center space-x-2 text-amber-700">
                        <Mic className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900">
                        ¿Permitir que <span className="font-bold">Mywhis</span> grabe audio?
                      </h3>
                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => {
                            setSimulatedAndroidDialog(false);
                            setGrantedPermissions(p => ({ ...p, microphone: true }));
                            setWizardStep(2);
                          }}
                          className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-900"
                        >
                          Mientras se usa la aplicación
                        </button>
                        <button
                          onClick={() => {
                            setSimulatedAndroidDialog(false);
                            setGrantedPermissions(p => ({ ...p, microphone: true }));
                            setWizardStep(2);
                          }}
                          className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-900"
                        >
                          Solo esta vez
                        </button>
                        <button
                          onClick={() => setSimulatedAndroidDialog(false)}
                          className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-500"
                        >
                          No permitir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 2: Enable the Floating Bubble - Matching Image 10 */}
            {wizardStep === 2 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center mt-2 mb-6">
                    Enable the<br />floating bubble
                  </h2>
                  
                  {/* Phone Preview with Keyboard & Bubble (from screenshot) */}
                  <div className="w-48 mx-auto bg-slate-100 rounded-3xl border-4 border-slate-300 p-3 h-52 flex flex-col justify-end relative shadow-inner overflow-hidden">
                    {/* Floating Bubble Graphic over mock keyboard */}
                    <div className="absolute top-16 right-4 bg-slate-950 text-white rounded-full px-2 py-1 flex items-center space-x-1.5 shadow-md">
                      <span className="text-[9px] text-slate-400">×</span>
                      <div className="flex items-center space-x-0.5">
                        <span className="w-0.5 h-2 bg-slate-200 rounded-full"></span>
                        <span className="w-0.5 h-3.5 bg-slate-200 rounded-full"></span>
                        <span className="w-0.5 h-1.5 bg-slate-200 rounded-full"></span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div>
                    </div>

                    {/* Mock Chat Input */}
                    <div className="bg-white rounded-xl p-1.5 mb-2 flex items-center justify-between border border-slate-200">
                      <span className="w-0.5 h-3 bg-blue-500 animate-pulse"></span>
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">↑</div>
                    </div>

                    {/* Mock Keyboard Grid */}
                    <div className="grid grid-cols-5 gap-1 opacity-70">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="h-2.5 bg-slate-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setWizardStep(3)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Set up authorizations
                </button>
              </div>
            )}

            {/* WIZARD STEP 3: Display over other apps toggle - Matching Image 5 */}
            {wizardStep === 3 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Go to</p>
                    <p className="text-base font-bold text-slate-900">
                      Display over other apps &gt; Mywhis
                    </p>
                    <p className="text-xs text-slate-400 pt-2">Then, enable</p>
                    <p className="text-base font-bold text-slate-900">
                      Display over other apps toggle
                    </p>
                  </div>

                  {/* Preview Card matching Image 5 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white p-2 shadow">
                        <PearLogo className="w-7 h-7 text-white" strokeWidth={2.4} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">Mywhis</h4>
                        <p className="text-[10px] text-slate-500">6,97 MB</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Display over other apps</p>
                        <p className="text-[10px] text-slate-400">Allows app to appear on top</p>
                      </div>
                      <div className="w-11 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1 shadow-inner">
                        <div className="w-4 h-4 rounded-full bg-white shadow"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGrantedPermissions(p => ({ ...p, overlay: true }));
                    setWizardStep(4);
                  }}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Open display over other apps
                </button>
              </div>
            )}

            {/* WIZARD STEP 4: Accessibility Permission Required - Matching Image 3 */}
            {wizardStep === 4 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Accessibility permission required
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mywhis types what you dictate straight into the app you are using. Android OS only allows that once you grant accessibility access.
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">Why Mywhis needs this</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      When you stop speaking, the text has to go into the field you were already typing in. Finding that field, and placing the text at the right point in it, is what accessibility access is for.
                    </p>

                    <h4 className="text-xs font-bold text-slate-800 pt-1">What Mywhis accesses</h4>
                    <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4">
                      <li>Which app is in front, and which text field has focus, so the text goes where you were typing</li>
                      <li className="font-medium text-slate-700">The type of that field, so Mywhis can tell a password box from an ordinary one (seguridad garantizada)</li>
                      <li>The text already in the field, so your dictation is appended with the right spacing instead of replacing what is there</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setGrantedPermissions(p => ({ ...p, accessibility: true }));
                      setWizardStep(5);
                    }}
                    className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3 rounded-2xl transition shadow-sm text-sm"
                  >
                    Agree
                  </button>
                  <button
                    onClick={() => setWizardStep(5)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-2xl transition text-xs"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 5: Accessibility > Downloaded Apps Toggle - Matching Image 4 & 6 */}
            {wizardStep === 5 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Go to</p>
                    <p className="text-base font-bold text-slate-900">
                      Accessibility &gt; Downloaded apps &gt; Mywhis
                    </p>
                    <p className="text-xs text-slate-400 pt-2">Then, enable</p>
                    <p className="text-base font-bold text-slate-900">
                      Mywhis toggle
                    </p>
                  </div>

                  {/* List preview matching Image 4 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-200 text-xs">
                    <div className="p-3 flex items-center justify-between bg-blue-50/60 rounded-t-2xl">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center p-1.5 shadow">
                          <PearLogo className="w-5 h-5 text-white" strokeWidth={2.4} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Mywhis</p>
                          <p className="text-[10px] text-slate-400">Servicio de accesibilidad</p>
                        </div>
                      </div>
                      <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end px-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-white"></div>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between opacity-50">
                      <span className="text-slate-600">Servicio de llamadas</span>
                      <div className="w-8 h-4 bg-slate-300 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setWizardStep(6)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Open accessibility
                </button>
              </div>
            )}

            {/* WIZARD STEP 6: Notification Access - Matching Image 2 */}
            {wizardStep === 6 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  {/* Phone Graphic with Notification Banner */}
                  <div className="w-56 mx-auto bg-slate-100 rounded-3xl border-4 border-slate-300 p-3 h-48 flex flex-col justify-start relative shadow-inner overflow-hidden mb-6">
                    <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-md space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <PearLogo className="w-3 h-3 text-slate-800" strokeWidth={2.4} />
                          Mywhis
                        </span>
                        <span>• now</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">Keep the bubble active?</p>
                      <p className="text-[10px] text-slate-500">Stop it when you don't need it.</p>
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center mb-2">
                    Allow Mywhis to<br />send you notifications
                  </h2>
                  <p className="text-xs text-slate-500 text-center max-w-xs mx-auto">
                    See when the bubble is active and stop it anytime from your notifications.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setGrantedPermissions(p => ({ ...p, notifications: true }));
                    setWizardStep(7);
                  }}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Allow notification access
                </button>
              </div>
            )}

            {/* WIZARD STEP 7: One Last Thing (Battery & Inactivity) - Matching Image 1 & 4 */}
            {wizardStep === 7 && (
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-4 pt-4">
                  {/* Floating bubble preview */}
                  <div className="mx-auto w-fit bg-slate-950 text-white rounded-full px-3 py-1.5 flex items-center space-x-2 shadow-md">
                    <span className="text-[11px] text-slate-400">×</span>
                    <div className="flex items-center space-x-0.5">
                      <span className="w-0.5 h-2.5 bg-slate-200 rounded-full"></span>
                      <span className="w-0.5 h-4 bg-slate-200 rounded-full"></span>
                      <span className="w-0.5 h-2 bg-slate-200 rounded-full"></span>
                    </div>
                    <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
                  </div>

                  <div className="space-y-2 pt-2 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      One last thing
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                      Android OS turns the bubble off after the app is inactive for a while. When it does, a reminder appears here. Tap it to turn it back on.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¡Todos los permisos y servicios están configurados correctamente!</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGrantedPermissions(p => ({ ...p, batteryExemption: true }));
                    setActiveView('clean_screen');
                  }}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-medium py-3.5 rounded-2xl transition shadow-sm text-sm"
                >
                  Got it!
                </button>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: TECHNICAL AUDIT / VERIFICACIÓN DE PERMISOS ANDROID */}
        {activeView === 'permissions_audit' && (
          <div className="flex-1 flex flex-col w-full max-w-lg mx-auto bg-white p-5 my-2 rounded-2xl border border-slate-200 shadow-xs overflow-y-auto min-h-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-sm text-slate-900">Auditoría Permisos Android</h2>
              </div>
              <button
                onClick={() => setActiveView('clean_screen')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Volver
              </button>
            </div>

            <div className="space-y-3.5 pt-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Verificación técnica completa para Mywhis en Android:
              </p>

              {/* Item 1: Audio */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">1. Micrófono (`RECORD_AUDIO`)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">100% OK</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Declarado en AndroidManifest.xml y solicitado en tiempo de ejecución con diálogo nativo.
                </p>
              </div>

              {/* Item 2: Overlay Bubble */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">2. Superposición (`SYSTEM_ALERT_WINDOW`)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">100% OK</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Implementado en <code className="text-blue-600">OverlayBubbleManager.kt</code> con <code className="text-slate-700">TYPE_APPLICATION_OVERLAY</code> para flotar sobre WhatsApp, Gmail, Slack, etc.
                </p>
              </div>

              {/* Item 3: Accessibility */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">3. Accesibilidad (`BIND_ACCESSIBILITY_SERVICE`)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">100% OK</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Implementado en <code className="text-blue-600">VoiceDictationAccessibilityService.kt</code> con:
                </p>
                <ul className="text-[10px] text-slate-600 list-disc pl-4 space-y-0.5">
                  <li>Identificación de app y campo con foco</li>
                  <li><strong>Filtro de seguridad:</strong> Salta campos de contraseña (<code className="text-slate-800">!isPassword</code>)</li>
                  <li><strong>Espaciado inteligente:</strong> Concatena con espacio sin borrar texto previo</li>
                </ul>
              </div>

              {/* Item 4: Notifications & Foreground */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">4. Notificaciones (`POST_NOTIFICATIONS`)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">100% OK</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Foreground Service con canal permanente para evitar que Android mate la burbuja flotante en segundo plano.
                </p>
              </div>

              {/* Item 5: Battery Optimization */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">5. Exención Batería (`IGNORE_BATTERY_OPTIMIZATIONS`)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">100% OK</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Resuelve "One last thing": evita el apagado involuntario de la burbuja tras periodos de inactividad.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveView('onboarding_wizard');
                    setWizardStep(0);
                  }}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-medium hover:bg-slate-800 transition text-xs"
                >
                  Probar Flujo de Permisos en la App
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: SETTINGS & OPTIONS */}
        {activeView === 'settings' && (
          <div className="flex-1 flex flex-col w-full max-w-lg mx-auto bg-white p-4 sm:p-5 my-1 rounded-2xl border border-slate-200 shadow-xs overflow-y-auto min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Configuración Mywhis</h2>
              <button
                onClick={() => setActiveView('clean_screen')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <PWAInstallButton variant="settings" />

              {/* Guía Completa de Permisos de Android */}
              <AndroidPermissionsGuide 
                onLaunchWizard={() => {
                  setActiveView('onboarding_wizard');
                  setWizardStep(0);
                }}
                onLaunchAudit={() => setActiveView('permissions_audit')}
              />

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-800">Privacidad y Seguridad</h3>
                <p className="text-[11px] text-slate-500">
                  • 100% Local o BYOK: Tus datos y grabaciones no se comparten ni se usan para entrenamiento.
                </p>
                <p className="text-[11px] text-slate-500">
                  • Protección activa: Nunca registra campos clasificados como contraseña en Android.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveView('onboarding_wizard');
                  setWizardStep(0);
                }}
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl font-medium hover:bg-blue-100 transition text-xs"
              >
                Reiniciar asistente de permisos
              </button>
            </div>
          </div>
        )}

        {/* Android Native-Style System Share Sheet Modal (ACTION_SEND Chooser) */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl border-t sm:border border-slate-200 w-full sm:max-w-md max-h-[85%] flex flex-col animate-slideUp">
              {/* Handle */}
              <div 
                onClick={() => setShowShareModal(false)}
                className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 cursor-pointer hover:bg-slate-400 transition"
              />
              
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Compartir con...</h3>
                  <p className="text-[11px] text-slate-500">Enviar a cualquier aplicación compatible en el terminal</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dictated text snippet */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-4">
                <p className="text-[11px] text-slate-700 line-clamp-2 italic font-sans">
                  "{processedText}"
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/60">
                  <span>{processedText.length} caracteres</span>
                  <span>{processedText.split(/\s+/).filter(Boolean).length} palabras</span>
                </div>
              </div>

              {/* Target Applications Grid (Android Intent ACTION_SEND apps) */}
              <div className="grid grid-cols-4 gap-2.5 mb-4">
                {/* WhatsApp */}
                <button
                  onClick={() => shareToApp('WhatsApp', (txt) => `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => shareToApp('Telegram', (txt) => `https://t.me/share/url?text=${encodeURIComponent(txt)}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Telegram</span>
                </button>

                {/* Gmail / Correo */}
                <button
                  onClick={() => shareToApp('Correo', (txt) => `mailto:?subject=${encodeURIComponent('Dictado Mywhis')}&body=${encodeURIComponent(txt)}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Gmail</span>
                </button>

                {/* Mensajes / SMS */}
                <button
                  onClick={() => shareToApp('Mensajes SMS', (txt) => `sms:?body=${encodeURIComponent(txt)}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Mensajes</span>
                </button>

                {/* Copiar */}
                <button
                  onClick={() => shareToApp('Portapapeles', () => null, () => handleCopy(processedText))}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Copy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Copiar</span>
                </button>

                {/* Guardar .txt */}
                <button
                  onClick={handleDownloadTxt}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Guardar .txt</span>
                </button>

                {/* X / Twitter */}
                <button
                  onClick={() => shareToApp('X', (txt) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">X / Tweet</span>
                </button>

                {/* Sistema / Más */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Mywhis Dictado', text: processedText }).catch(() => {});
                    } else {
                      handleCopy(processedText);
                      setShareSuccessToast('Copiado listo para pegar en cualquier app');
                      setTimeout(() => setShareSuccessToast(null), 2500);
                    }
                    setShowShareModal(false);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium text-center">Más apps</span>
                </button>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Share Success Toast Feedback */}
        {shareSuccessToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full shadow-xl flex items-center gap-1.5 animate-fadeIn border border-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">{shareSuccessToast}</span>
          </div>
        )}

        {/* PWA Offline Mode Indicator */}
        <OfflineIndicator />

    </div>
  );
}
