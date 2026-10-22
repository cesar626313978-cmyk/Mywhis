import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  wordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  wordCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-[#0f1422] border border-white/10 p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">¿Borrar todo el texto?</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {wordCount > 0
                ? `Tienes un borrador con ${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}. Se eliminará tanto el dictado original como las transformaciones de IA.`
                : 'Se limpiará el lienzo de texto por completo.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:bg-white/5 border border-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sí, borrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
