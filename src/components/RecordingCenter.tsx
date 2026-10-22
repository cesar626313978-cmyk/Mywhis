import React from 'react';
import { Mic, Square, Pause, Play, Clock, FileText } from 'lucide-react';

interface RecordingCenterProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds: number;
  wordCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  timerString: string;
}

export const RecordingCenter: React.FC<RecordingCenterProps> = ({
  isRecording,
  isPaused,
  wordCount,
  onStart,
  onPause,
  onResume,
  onStop,
  timerString,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 select-none">
      {/* Central Interactive Microphone Button & Pulse Waves */}
      <div className="relative flex items-center justify-center mb-3">
        {/* Animated concentric rings when actively recording */}
        {isRecording && !isPaused && (
          <>
            <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
            <div className="absolute w-36 h-36 rounded-full bg-rose-500/10 animate-pulse pointer-events-none" />
          </>
        )}

        {!isRecording ? (
          // Idle state: Big Start Button
          <button
            onClick={onStart}
            className="group relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-500/30 cursor-pointer"
            aria-label="Iniciar grabación de voz"
          >
            <Mic className="w-10 h-10 group-hover:scale-110 transition-transform duration-200" />
            <span className="sr-only">Iniciar grabación</span>
          </button>
        ) : (
          // Recording active controls
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Pause / Resume Button */}
            <button
              onClick={isPaused ? onResume : onPause}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-white/10 shadow-lg transition-all focus:outline-none cursor-pointer"
              title={isPaused ? 'Reanudar dictado' : 'Pausar dictado'}
              aria-label={isPaused ? 'Reanudar' : 'Pausar'}
            >
              {isPaused ? <Play className="w-5 h-5 fill-current ml-0.5" /> : <Pause className="w-5 h-5 fill-current" />}
            </button>

            {/* Stop Recording Button */}
            <button
              onClick={onStop}
              className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-600 to-rose-700 text-white shadow-xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/30 cursor-pointer"
              title="Detener y conservar texto"
              aria-label="Detener grabación"
            >
              <Square className="w-8 h-8 fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* Timer and Word Counter Row */}
      <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
          isRecording
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-white/5 border-white/5 text-slate-400'
        }`}>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono tracking-wider">{timerString}</span>
          <span className="text-[10px] text-slate-500">/ 40:00</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>{wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}</span>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] sm:text-xs text-slate-400 text-center">
        {!isRecording
          ? 'Toca el micrófono para comenzar a dictar (sesiones cortas o de hasta 40 min)'
          : isPaused
          ? 'Grabación en pausa. Pulsa reproducir para continuar hablando.'
          : 'Escuchando en directo... Puedes apagar la pantalla del móvil sin cortar la grabación.'}
      </p>
    </div>
  );
};
