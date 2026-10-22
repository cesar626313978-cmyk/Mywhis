import React, { useState } from 'react';
import { Sparkles, RotateCcw, Check, HelpCircle, Mail, MessageSquare, Bot, FileText } from 'lucide-react';
import { 
  DEFAULT_GENERAL_PROMPT, 
  DEFAULT_EMAIL_PROMPT, 
  DEFAULT_SOCIAL_PROMPT, 
  DEFAULT_PROMPT_BUILDER_PROMPT,
  DEFAULT_PROMPTS
} from '../data/defaultPrompt';

export interface CustomPromptsMap {
  general: string;
  email: string;
  social: string;
  prompt: string;
}

interface PromptSettingsCardProps {
  prompts: CustomPromptsMap;
  onChangePrompt: (key: keyof CustomPromptsMap, value: string) => void;
  onResetPrompt: (key: keyof CustomPromptsMap) => void;
  onResetAll: () => void;
}

export const PROMPT_SECTIONS_CONFIG = [
  {
    key: 'general' as const,
    title: '1. Mejorar texto (General)',
    shortTitle: 'General',
    icon: FileText,
    badgeColor: 'amber',
    description: 'Instrucciones para la opción de mejora general (listas, puntuación, fluidez y detección inteligente).',
    defaultText: DEFAULT_GENERAL_PROMPT,
    helperText: 'Aplica corrección de puntuación, elimina tartamudeos, formatea listas y detecta intenciones generales.',
  },
  {
    key: 'email' as const,
    title: '2. Mejorar correo electrónico',
    shortTitle: 'Correo',
    icon: Mail,
    badgeColor: 'rose',
    description: 'Instrucciones para estructurar correos electrónicos profesionales con Asunto, Saludo, Párrafos y Firma.',
    defaultText: DEFAULT_EMAIL_PROMPT,
    helperText: 'Genera un email estructurado listo para enviar con asunto conciso, cuerpo fluido y despedida cordial.',
  },
  {
    key: 'social' as const,
    title: '3. Mejorar texto para WhatsApp o Telegram',
    shortTitle: 'WhatsApp / Chat',
    icon: MessageSquare,
    badgeColor: 'emerald',
    description: 'Instrucciones para redactar mensajes ágiles, directos, cercanos y con emojis oportunos.',
    defaultText: DEFAULT_SOCIAL_PROMPT,
    helperText: 'Adapta el tono a mensajería instantánea con párrafos cortos, fluidez y lectura cómoda en dispositivos móviles.',
  },
  {
    key: 'prompt' as const,
    title: '4. Mejorar prompts para IA o constructor de IA',
    shortTitle: 'Prompts IA',
    icon: Bot,
    badgeColor: 'indigo',
    description: 'Instrucciones para transformar dictados informales en prompts optimizados y estructurados para IA.',
    defaultText: DEFAULT_PROMPT_BUILDER_PROMPT,
    helperText: 'Genera un prompt técnico con Rol, Contexto, Instrucciones paso a paso, Reglas y Formato de salida esperada.',
  },
];

export const PromptSettingsCard: React.FC<PromptSettingsCardProps> = ({
  prompts,
  onChangePrompt,
  onResetPrompt,
  onResetAll,
}) => {
  const [activeTab, setActiveTab] = useState<keyof CustomPromptsMap>('general');
  const [showHelper, setShowHelper] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const currentConfig = PROMPT_SECTIONS_CONFIG.find(c => c.key === activeTab) || PROMPT_SECTIONS_CONFIG[0];
  const currentPromptValue = prompts[activeTab] || currentConfig.defaultText;
  const isCurrentCustomized = currentPromptValue.trim() !== currentConfig.defaultText.trim();

  const handleSave = () => {
    try {
      localStorage.setItem('mywhis_prompt_general', prompts.general);
      localStorage.setItem('mywhis_prompt_email', prompts.email);
      localStorage.setItem('mywhis_prompt_social', prompts.social);
      localStorage.setItem('mywhis_prompt_prompt', prompts.prompt);
    } catch (e) {}
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-4 transition">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Prompts de Inteligencia Artificial (IA)
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Personaliza las instrucciones de la IA para las 4 alternativas de mejora.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
          title="Ayuda y consejos sobre variables de prompts"
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Helper Collapse */}
      {showHelper && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 animate-fadeIn">
          <p className="font-semibold text-slate-700">💡 Consejos para personalizar los 4 prompts:</p>
          <p>
            • Cada uno de los 4 prompts define el comportamiento exacto de la IA cuando utilizas las distintas alternativas en la pantalla principal.
          </p>
          <p>
            • Puedes añadir tus propias directrices de tono, idioma, firma corporativa o estilo preferido.
          </p>
          <p>
            • Si colocas <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px] text-slate-800">{`{TEXTO}`}</code>, el dictado se insertará en esa posición exacta.
          </p>
        </div>
      )}

      {/* 4 Tabs Selector for Prompts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
        {PROMPT_SECTIONS_CONFIG.map(section => {
          const Icon = section.icon;
          const isActive = activeTab === section.key;
          const sectionVal = prompts[section.key] || section.defaultText;
          const isCustom = sectionVal.trim() !== section.defaultText.trim();

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveTab(section.key)}
              className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{section.shortTitle}</span>
              </div>
              {isCustom && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Personalizado" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Section Info Header */}
      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <currentConfig.icon className="w-4 h-4 text-blue-600 shrink-0" />
            <h4 className="font-bold text-xs text-slate-900">{currentConfig.title}</h4>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
              isCurrentCustomized
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isCurrentCustomized ? 'Personalizado' : 'Original Mywhis'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          {currentConfig.description}
        </p>
      </div>

      {/* Prompt Editor Textarea */}
      <div className="relative">
        <textarea
          value={currentPromptValue}
          onChange={(e) => {
            const val = e.target.value;
            onChangePrompt(activeTab, val);
            try {
              localStorage.setItem(`mywhis_prompt_${activeTab}`, val);
            } catch (err) {}
          }}
          rows={9}
          placeholder={`Escribe aquí las instrucciones para "${currentConfig.shortTitle}"...`}
          className="w-full text-xs font-mono text-slate-800 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed resize-y transition shadow-inner"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1 font-sans">
          <span>{currentPromptValue.length} caracteres</span>
          <span>{currentPromptValue.trim().split(/\s+/).filter(Boolean).length} palabras</span>
        </div>
      </div>

      {/* Action Footer: Volver al original (Pestaña) vs Volver todos + Guardar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onResetPrompt(activeTab)}
            disabled={!isCurrentCustomized}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition active:scale-95 ${
              isCurrentCustomized
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
                : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
            }`}
            title="Restablecer este prompt al original de Mywhis"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer esta opción</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
};
