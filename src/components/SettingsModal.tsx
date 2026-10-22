import React, { useState } from 'react';
import {
  X,
  Sliders,
  Shield,
  Sparkles,
  Mail,
  MessageSquare,
  Bot,
  RotateCcw,
  Save,
  Mic,
  Bell,
  Battery,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { PromptConfig, DEFAULT_PROMPTS } from '../data/defaultPrompt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptConfig;
  onSavePrompts: (newPrompts: PromptConfig) => void;
  onResetPrompts: () => void;
  micPermissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  notificationPermissionState: NotificationPermission | 'unsupported';
  wakeLockActive: boolean;
  onRequestMic: () => Promise<boolean>;
  onRequestNotification: () => Promise<NotificationPermission>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  prompts,
  onSavePrompts,
  onResetPrompts,
  micPermissionState,
  notificationPermissionState,
  wakeLockActive,
  onRequestMic,
  onRequestNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'permissions'>('prompts');
  const [localPrompts, setLocalPrompts] = useState<PromptConfig>(prompts);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [expandedPrompt, setExpandedPrompt] = useState<keyof PromptConfig | null>('general');
  const [micTesting, setMicTesting] = useState<boolean>(false);
  const [notifTesting, setNotifTesting] = useState<boolean>(false);

  // Sync if outer prompts change
  React.useEffect(() => {
    setLocalPrompts(prompts);
  }, [prompts]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePrompts(localPrompts);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  const handleReset = () => {
    if (window.confirm('¿Restaurar los 4 prompts a los valores de fábrica?')) {
      onResetPrompts();
      setLocalPrompts(DEFAULT_PROMPTS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2200);
    }
  };

  const handleTestMic = async () => {
    setMicTesting(true);
    await onRequestMic();
    setMicTesting(false);
  };

  const handleTestNotif = async () => {
    setNotifTesting(true);
    await onRequestNotification();
    setNotifTesting(false);
  };

  const promptCards: Array<{
    key: keyof PromptConfig;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'general',
      title: '1. Mejorar Texto (Opción General)',
      description: 'Corrige puntuación, gramática, suprime muletillas y mejora la fluidez sin cambiar el tono.',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'email',
      title: '2. Correo Electrónico',
      description: 'Estructura el dictado con Asunto profesional, saludo cordial, cuerpo claro y despedida.',
      icon: <Mail className="w-4 h-4 text-sky-400" />,
    },
    {
      key: 'social',
      title: '3. Redes Sociales & Mensajería',
      description: 'Adapta el dictado para WhatsApp, Telegram o LinkedIn con gancho, emojis y hashtags.',
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'prompt',
      title: '4. Prompt para IA',
      description: 'Convierte el dictado en un mega-prompt estructurado con Rol, Contexto, Tarea y Formato.',
      icon: <Bot className="w-4 h-4 text-violet-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0b0f19] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Ajustes de Mywhis</h2>
              <p className="text-xs text-slate-400">Configuración de prompts, permisos y optimización continua</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex px-5 pt-3 border-b border-white/5 bg-black/20 gap-2">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'prompts'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1. Personalizar Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>2. Permisos, Batería & Pantalla Apagada</span>
          </button>
        </div>

        {/* Modal Body with internal scrolling */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'prompts' ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs text-slate-400">
                  Edita las instrucciones exactas del sistema para cada uno de los 4 botones rápidos de Gemini:
                </p>
                {savedSuccess && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ¡Guardado!
                  </span>
                )}
              </div>

              {promptCards.map((card) => {
                const isExpanded = expandedPrompt === card.key;
                return (
                  <div
                    key={card.key}
                    className="rounded-2xl bg-[#0f1523] border border-white/5 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedPrompt(isExpanded ? null : card.key)}
                      className="flex items-center justify-between w-full p-3.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                          {card.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                          <p className="text-xs text-slate-400">{card.description}</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3.5 pt-0 border-t border-white/5">
                        <textarea
                          rows={6}
                          value={localPrompts[card.key]}
                          onChange={(e) =>
                            setLocalPrompts((prev) => ({
                              ...prev,
                              [card.key]: e.target.value,
                            }))
                          }
                          className="w-full mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y"
                          placeholder="Instrucciones para este botón..."
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Action Buttons for Prompts */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                  title="Restaurar prompts por defecto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar de fábrica</span>
                </button>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Prompts</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Permission 1: Microphone */}
              <div className="p-4 rounded-2xl bg-[#0f1523] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Permiso de Micrófono</h4>
                      <p className="text-xs text-slate-400">Requerido para dictar y grabar audio</p>
                    </div>
                  </div>

                  {micPermissionState === 'granted' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concedido
                    </span>
                  ) : micPermissionState === 'denied' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Bloqueado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                      Pendiente
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleTestMic}
                    disabled={micTesting}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium active:scale-95 transition-all"
                  >
                    {micTesting ? 'Comprobando...' : 'Comprobar y Solicitar Micrófono'}
                  </button>
                </div>

                {micPermissionState === 'denied' && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 space-y-1">
                    <p className="font-semibold">Cómo desbloquear el micrófono:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-rose-300">
                      <li>Haz clic en el icono del candado o sintonizador a la izquierda de la barra de direcciones.</li>
                      <li>Localiza <strong>Micrófono</strong> y cámbialo a <strong>Permitir</strong>.</li>
                      <li>Recarga la página para aplicar los cambios.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Permission 2: Notifications */}
              <div className="p-4 rounded-2xl bg-[#0f1523] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Notificaciones en Segundo Plano</h4>
                      <p className="text-xs text-slate-400">Avisa de que la grabación sigue activa si cambias de app</p>
                    </div>
                  </div>

                  {notificationPermissionState === 'granted' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activadas
                    </span>
                  ) : notificationPermissionState === 'denied' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-medium">
                      Desactivadas
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                      No configurado
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    onClick={handleTestNotif}
                    disabled={notifTesting || notificationPermissionState === 'granted'}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium active:scale-95 transition-all disabled:opacity-40"
                  >
                    {notificationPermissionState === 'granted'
                      ? 'Notificaciones Habilitadas'
                      : notifTesting
                      ? 'Activando...'
                      : 'Activar Notificaciones'}
                  </button>
                </div>
              </div>

              {/* Guide 3: Battery & Screen Off 30-40 min */}
              <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Battery className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Grabación de 30 a 40 minutos con Pantalla Apagada
                    </h4>
                    <p className="text-xs text-slate-400">Garantiza que el sistema operativo no congele la grabación</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5">
                  <p className="font-semibold text-cyan-300">
                    Mecanismos automáticos ya activos en Mywhis:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>
                      <strong>Screen WakeLock API:</strong> Bloquea la suspensión de pantalla mientras grabas.
                    </li>
                    <li>
                      <strong>Bucle de audio silencioso & MediaSession:</strong> Mantiene vivo el proceso en iOS y Android con la pantalla apagada.
                    </li>
                    <li>
                      <strong>Grabadora paralela de respaldo:</strong> Guarda el audio crudo en segundo plano para transcribir con Gemini si el navegador pausó el reconocimiento en vivo.
                    </li>
                  </ul>

                  <div className="pt-2 border-t border-white/10">
                    <p className="font-semibold text-amber-300 mb-1">
                      📱 Configuración recomendada en Android (para 40 min sin cortes):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      <li>Abre <strong>Ajustes del teléfono &gt; Aplicaciones</strong>.</li>
                      <li>Busca <strong>Chrome</strong> (o la app instalada de Mywhis).</li>
                      <li>Toca en <strong>Batería</strong> y selecciona <strong>"Sin restricciones" (Unrestricted)</strong>.</li>
                      <li>Así el ahorro de batería de Android nunca congelará el micrófono tras 10 minutos de inactividad de pantalla.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
