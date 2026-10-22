import React, { useState } from 'react';
import { Share2, Copy, Trash2, Check, AlertCircle } from 'lucide-react';

interface ActionBarProps {
  currentText: string;
  hasText: boolean;
  onClearRequest: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  currentText,
  hasText,
  onClearRequest,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCopy = async () => {
    if (!currentText.trim()) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      showToast('¡Texto copiado al portapapeles!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Error al copiar. Selecciona y copia manualmente.');
    }
  };

  const handleShare = async () => {
    if (!currentText.trim()) return;

    if (navigator?.share) {
      try {
        await navigator.share({
          title: 'Texto desde Mywhis',
          text: currentText,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fallback to copy
          await handleCopy();
        }
      }
    } else {
      // Fallback
      await handleCopy();
      showToast('Compartir no soportado en este navegador. ¡Texto copiado para pegar!');
    }
  };

  return (
    <div className="relative w-full pt-2">
      {/* Visual Toast Notification */}
      {toastMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 animate-in fade-in zoom-in-95 duration-200 z-30">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Compartir */}
        <button
          onClick={handleShare}
          disabled={!hasText}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Compartir por WhatsApp, Telegram, Gmail, etc."
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir</span>
        </button>

        {/* Copiar */}
        <button
          onClick={handleCopy}
          disabled={!hasText}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs sm:text-sm border border-white/10 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Copiar texto actual al portapapeles"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Copiar</span>
            </>
          )}
        </button>

        {/* Borrar */}
        <button
          onClick={onClearRequest}
          disabled={!hasText}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 font-medium text-xs sm:text-sm border border-rose-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Borrar lienzo (con confirmación de seguridad)"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Borrar</span>
        </button>
      </div>
    </div>
  );
};
