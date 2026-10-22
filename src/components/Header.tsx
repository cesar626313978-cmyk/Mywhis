import React from 'react';
import { Settings, Mic, Sparkles, ShieldCheck, Radio } from 'lucide-react';

interface HeaderProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessingAI: boolean;
  wakeLockActive: boolean;
  timerString: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  isPaused,
  isProcessingAI,
  wakeLockActive,
  timerString,
  onOpenSettings,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#0d111a]/80 backdrop-blur-md border-b border-white/5 select-none z-20">
      {/* Brand logo & name */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <Mic className="w-5 h-5 text-white" />
          {isRecording && !isPaused && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">Mywhis</span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              Pro
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Voz continua & Transformación Gemini
          </p>
        </div>
      </div>

      {/* System state indicators */}
      <div className="flex items-center gap-2">
        {isProcessingAI ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Procesando IA</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{isPaused ? 'En pausa' : `Grabando ${timerString}`}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Listo</span>
          </div>
        )}

        {/* Screen-off / WakeLock active badge */}
        {wakeLockActive && isRecording && (
          <div
            title="Modo pantalla protegida activo: la grabación no se detendrá al apagar la pantalla"
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pantalla protegida</span>
          </div>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Abrir Ajustes de Mywhis"
          className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Ajustes"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
