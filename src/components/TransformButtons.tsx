import React from 'react';
import { Sparkles, Mail, MessageSquare, Bot, Loader2 } from 'lucide-react';

export type TransformationType = 'improve' | 'email' | 'social' | 'prompt';

interface TransformButtonsProps {
  onTransform: (type: TransformationType) => void;
  activeTransforming: TransformationType | null;
  disabled: boolean;
}

export const TransformButtons: React.FC<TransformButtonsProps> = ({
  onTransform,
  activeTransforming,
  disabled,
}) => {
  const buttons: Array<{
    id: TransformationType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    border: string;
    bgHover: string;
    shadow: string;
  }> = [
    {
      id: 'improve',
      label: 'Mejorar Texto',
      sublabel: 'Gramática, puntuación y fluidez',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-200',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      bgHover: 'hover:bg-amber-500/10',
      shadow: 'hover:shadow-amber-500/10',
    },
    {
      id: 'email',
      label: 'Correo Electrónico',
      sublabel: 'Asunto, saludo, cuerpo y firma',
      icon: <Mail className="w-5 h-5 text-sky-400" />,
      color: 'from-sky-500/20 to-sky-600/10 text-sky-200',
      border: 'border-sky-500/30 hover:border-sky-500/60',
      bgHover: 'hover:bg-sky-500/10',
      shadow: 'hover:shadow-sky-500/10',
    },
    {
      id: 'social',
      label: 'Redes Sociales',
      sublabel: 'Gancho, estructura y hashtags',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-200',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      bgHover: 'hover:bg-emerald-500/10',
      shadow: 'hover:shadow-emerald-500/10',
    },
    {
      id: 'prompt',
      label: 'Prompt para IA',
      sublabel: 'Rol, Contexto, Tarea y Formato',
      icon: <Bot className="w-5 h-5 text-violet-400" />,
      color: 'from-violet-500/20 to-violet-600/10 text-violet-200',
      border: 'border-violet-500/30 hover:border-violet-500/60',
      bgHover: 'hover:bg-violet-500/10',
      shadow: 'hover:shadow-violet-500/10',
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {buttons.map((btn) => {
          const isLoading = activeTransforming === btn.id;
          const isAnyLoading = Boolean(activeTransforming);

          return (
            <button
              key={btn.id}
              onClick={() => onTransform(btn.id)}
              disabled={disabled || isAnyLoading}
              className={`group relative flex flex-col items-start p-3 sm:p-3.5 rounded-2xl bg-[#0e1320] border transition-all duration-200 text-left select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${btn.border} ${btn.bgHover} hover:shadow-lg ${btn.shadow} active:scale-[0.98]`}
              aria-label={btn.label}
            >
              {/* Icon & Spinner header */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${btn.color} border border-white/5`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    btn.icon
                  )}
                </div>
                {isLoading && (
                  <span className="text-[10px] font-semibold tracking-wide text-violet-300 animate-pulse">
                    Generando...
                  </span>
                )}
              </div>

              {/* Title & Microcopy */}
              <div className="w-full">
                <h4 className="text-xs sm:text-sm font-semibold text-white tracking-tight group-hover:text-white transition-colors">
                  {btn.label}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                  {btn.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
