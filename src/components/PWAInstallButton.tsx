import React, { useState } from 'react';
import { Download, Share, PlusSquare, Check, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PearLogo } from './PearLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already installed and running as standalone app, don't show prompt
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
          <Check className="w-4 h-4" />
          <span>Mywhis ya está instalada como aplicación en este dispositivo</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs active:scale-95 ${className}`}
          title="Instalar Mywhis en el teléfono"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar App</span>
        </button>
      )}

      {variant === 'settings' && (
        <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <PearLogo className="w-4 h-4 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Instalar en la pantalla de inicio</h4>
                <p className="text-[11px] text-slate-500">Accede a Mywhis como app nativa a pantalla completa</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      )}

      {/* Guide Modal for Manual Installation or iOS Safari */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 border border-slate-200 animate-slideUp relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <PearLogo className="w-7 h-7 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Descargar Mywhis</h3>
                <p className="text-xs text-slate-500">Aplicación web progresiva (PWA)</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-700 space-y-3 border border-slate-200/80">
              <p className="font-semibold text-slate-900">Cómo instalarla en tu teléfono:</p>
              
              {isIOS ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                    <p className="leading-snug">
                      Toca el botón <strong className="inline-flex items-center gap-0.5 text-blue-600"><Share className="w-3.5 h-3.5 inline" /> Compartir</strong> en la barra inferior de Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                    <p className="leading-snug">
                      Desplaza hacia abajo y selecciona <strong className="inline-flex items-center gap-0.5 text-blue-600"><PlusSquare className="w-3.5 h-3.5 inline" /> Añadir a la pantalla de inicio</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                    <p className="leading-snug">Pulsa <strong>Añadir</strong> en la esquina superior derecha.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                    <p className="leading-snug">
                      En el menú de Chrome o tu navegador (los <strong>tres puntos ⋮</strong> arriba a la derecha).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                    <p className="leading-snug">
                      Pulsa sobre <strong className="text-blue-600">Instalar aplicación</strong> o <strong>Añadir a la pantalla de inicio</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                    <p className="leading-snug">Confirma y Mywhis se añadirá como app nativa a tu móvil.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {isInstallable && (
                <button
                  onClick={async () => {
                    await install();
                    setShowGuideModal(false);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Directamente</span>
                </button>
              )}
              <button
                onClick={() => setShowGuideModal(false)}
                className={`py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition ${isInstallable ? '' : 'w-full'}`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
