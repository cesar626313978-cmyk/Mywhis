import React, { useState } from 'react';
import { Sparkles, RotateCcw, Check, HelpCircle, FileText } from 'lucide-react';
import { DEFAULT_IMPROVE_PROMPT } from '../data/defaultPrompt';

interface PromptSettingsCardProps {
  prompt: string;
  onChange: (value: string) => void;
  onReset: () => void;
}

export const PromptSettingsCard: React.FC<PromptSettingsCardProps> = ({
  prompt,
  onChange,
  onReset
}) => {
  const [showHelper, setShowHelper] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const isCustomized = prompt.trim() !== DEFAULT_IMPROVE_PROMPT.trim();

  const handleManualSave = () => {
    localStorage.setItem('mywhis_custom_prompt', prompt);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3 transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                Prompt de Mejora de Texto (IA)
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isCustomized
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isCustomized ? 'Personalizado' : 'Original'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Instrucciones que sigue la IA para corregir y enriquecer el dictado al pulsar «Mejorar».
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          title="Ayuda sobre variables del prompt"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Helper collapse */}
      {showHelper && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1 animate-fadeIn">
          <p className="font-semibold text-slate-700">💡 Consejos de edición:</p>
          <p>
            • Puedes añadir tus propias reglas de estilo, tono (formal, comercial, técnico) o idioma.
          </p>
          <p>
            • Detecta automáticamente cuando dictas un correo (ej. "crear un email para...") o una lista (ej. "lista de la compra") y aplica el formato adecuado con asunto o guiones.
          </p>
          <p>
            • Si incluyes <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px] text-slate-800">{`{TEXTO}`}</code>, la transcripción se insertará exactamente en esa posición. Si no lo incluyes, se adjuntará automáticamente al final.
          </p>
        </div>
      )}

      {/* Editable Textarea */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => {
            onChange(e.target.value);
            localStorage.setItem('mywhis_custom_prompt', e.target.value);
          }}
          onBlur={() => {
            localStorage.setItem('mywhis_custom_prompt', prompt);
          }}
          rows={9}
          placeholder="Escribe aquí las instrucciones para la IA..."
          className="w-full text-xs font-mono text-slate-800 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed resize-y transition shadow-inner"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1 font-sans">
          <span>{prompt.length} caracteres</span>
          <span>{prompt.trim().split(/\s+/).filter(Boolean).length} palabras</span>
        </div>
      </div>

      {/* Action Buttons: Volver al original + Guardar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onReset}
          disabled={!isCustomized}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition active:scale-95 ${
            isCustomized
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
              : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
          }`}
          title="Restablecer el prompt a la configuración original de Mywhis"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Volver al original</span>
        </button>

        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
