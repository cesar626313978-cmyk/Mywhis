import React, { useState } from 'react';
import { 
  Mic, Layers, Lock, Bell, Zap, Shield, ChevronDown, ChevronUp, 
  ExternalLink, CheckCircle2, AlertTriangle, Info, HelpCircle, ArrowRight, Moon
} from 'lucide-react';

interface AndroidPermissionsGuideProps {
  onLaunchWizard: () => void;
  onLaunchAudit: () => void;
}

interface PermissionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  importance: 'critical' | 'recommended';
  path: string;
  howTo: string[];
  note?: string;
}

export const AndroidPermissionsGuide: React.FC<AndroidPermissionsGuideProps> = ({
  onLaunchWizard,
  onLaunchAudit,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>('overlay');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const permissions: PermissionItem[] = [
    {
      id: 'microphone',
      title: '1. Permiso de Micrófono',
      subtitle: 'Permite a Mywhis capturar y transcribir tu voz',
      icon: <Mic className="w-4 h-4 text-emerald-600" />,
      badge: 'Imprescindible',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      importance: 'critical',
      path: 'Ajustes > Aplicaciones > Mywhis > Permisos > Micrófono',
      howTo: [
        'Abre la app y pulsa el botón del micrófono o la Pera.',
        'Cuando aparezca el diálogo nativo de Android, pulsa "Permitir solo mientras la app está en uso" (o "Permitir siempre").',
        'Si lo denegaste antes, ve a Ajustes de Android > Aplicaciones > Mywhis > Permisos > Micrófono y actívalo.',
      ],
      note: 'El procesamiento se realiza con protección de privacidad. No se graba audio en reposo.',
    },
    {
      id: 'overlay',
      title: '2. Mostrar sobre otras aplicaciones',
      subtitle: 'Permite que la Pera flote sobre WhatsApp, Telegram, etc.',
      icon: <Layers className="w-4 h-4 text-blue-600" />,
      badge: 'Burbuja Flotante',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      importance: 'critical',
      path: 'Ajustes > Aplicaciones > Acceso especial > Mostrar sobre otras apps > Mywhis',
      howTo: [
        'Abre Ajustes de tu móvil Android.',
        'Dirígete a Aplicaciones y pulsa el menú superior ⋮ o busca "Acceso especial de aplicaciones".',
        'Selecciona "Mostrar sobre otras aplicaciones" (o "Aparecer encima").',
        'Localiza Mywhis en la lista y activa el interruptor de permiso.',
      ],
      note: 'Necesario para tener la burbuja lista en cualquier pantalla sin tener que abrir la app principal.',
    },
    {
      id: 'accessibility',
      title: '3. Servicio de Accesibilidad',
      subtitle: 'Para pegar el texto dictado automáticamente donde esté el cursor',
      icon: <Lock className="w-4 h-4 text-amber-600" />,
      badge: 'Escritura Directa',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      importance: 'recommended',
      path: 'Ajustes > Accesibilidad > Aplicaciones instaladas / Servicios descargados > Mywhis',
      howTo: [
        'Ve a Ajustes de tu teléfono > Accesibilidad.',
        'Pulsa en "Aplicaciones instaladas" o "Servicios descargados".',
        'Busca y pulsa sobre "Mywhis".',
        'Activa el interruptor principal y pulsa "Permitir" en la advertencia de seguridad.',
      ],
      note: '⚠️ Android 13/14+ ("Ajuste restringido"): Si Android bloquea el interruptor, ve a Ajustes > Aplicaciones > Mywhis > Pulsa los tres puntos (⋮) arriba a la derecha > "Permitir ajustes restringidos". Luego vuelve a Accesibilidad y ya te dejará activarlo.',
    },
    {
      id: 'notifications',
      title: '4. Notificaciones y Servicio en Primer Plano',
      subtitle: 'Evita que Android cierre Mywhis cuando cambias de app',
      icon: <Bell className="w-4 h-4 text-indigo-600" />,
      badge: 'Segundo Plano',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      importance: 'recommended',
      path: 'Ajustes > Aplicaciones > Mywhis > Notificaciones > Permitir',
      howTo: [
        'Ve a Ajustes de Android > Aplicaciones > Mywhis > Notificaciones.',
        'Asegúrate de que "Permitir notificaciones" esté activado.',
        'Esto habilita el icono discreto en la barra de estado que mantiene vivo el dictado rápido.',
      ],
    },
    {
      id: 'battery',
      title: '5. Exención de Ahorro de Batería',
      subtitle: 'Garantiza respuesta instantánea sin retrasos ni cierres',
      icon: <Zap className="w-4 h-4 text-purple-600" />,
      badge: 'Rendimiento',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      importance: 'recommended',
      path: 'Ajustes > Aplicaciones > Mywhis > Batería > Sin restricciones',
      howTo: [
        'Ve a Ajustes > Aplicaciones > Mywhis > Uso de batería (o Batería).',
        'Selecciona la opción "Sin restricciones" (en MIUI/HyperOS: "Sin restricciones de ahorro de energía").',
        'Esto resuelve la pantalla de "One last thing" y evita que el sistema suspenda la burbuja tras minutos de inactividad.',
      ],
    },
    {
      id: 'screen_off',
      title: '6. Grabación con Pantalla Apagada (hasta 40 min)',
      subtitle: 'Permite grabar conversaciones o notas largas con el móvil bloqueado',
      icon: <Moon className="w-4 h-4 text-indigo-600" />,
      badge: 'Segundo Plano',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      importance: 'recommended',
      path: 'Ajustes > Aplicaciones > Mywhis > Batería > Sin restricciones + Wake Lock',
      howTo: [
        'Pulsa el botón de la Pera para comenzar a grabar en modo 1 Voz o 2 Voces.',
        'Bloquea la pantalla pulsando el botón físico de encendido o déjala apagarse.',
        'El hardware de audio se mantiene activo mediante Foreground Service y Wake Lock hasta un máximo de 40 minutos.',
        'Al desbloquear o pulsar el botón de detener, la transcripción completa se procesará de inmediato.'
      ],
      note: 'El tope de 40 minutos previene el agotamiento accidental de batería y preserva los recursos del teléfono.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Section Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-xs text-slate-900 tracking-tight">
            Guía de Permisos de Android
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
          Para que Mywhis dicte y flote sobre tus apps, Android requiere los siguientes permisos del sistema:
        </p>
      </div>

      {/* Accordion / List of permissions */}
      <div className="divide-y divide-slate-100">
        {permissions.map((perm) => {
          const isExpanded = expandedId === perm.id;
          return (
            <div key={perm.id} className="transition-colors">
              <button
                type="button"
                onClick={() => toggleExpand(perm.id)}
                className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                    {perm.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-800">
                        {perm.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${perm.badgeColor}`}>
                        {perm.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {perm.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 shrink-0 pl-1">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-700 bg-slate-50/40 border-t border-slate-100/60 space-y-3">
                  {/* Path box */}
                  <div className="bg-slate-100/90 rounded-xl p-2.5 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Ruta en los Ajustes de Android:
                    </span>
                    <code className="text-[11px] font-mono font-semibold text-slate-800 break-words">
                      {perm.path}
                    </code>
                  </div>

                  {/* Steps */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      Cómo activarlo paso a paso:
                    </span>
                    <ol className="space-y-1.5 pl-1">
                      {perm.howTo.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                          <span className="w-4 h-4 rounded-full bg-slate-200/90 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Optional Note / Warning */}
                  {perm.note && (
                    <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200/70 text-[11px] text-amber-900 leading-snug flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>{perm.note}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Helper Triggers */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onLaunchWizard}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-xs active:scale-98"
        >
          <span>Asistente Visual Guiado</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onLaunchAudit}
          className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          <span>Auditoría Técnica</span>
        </button>
      </div>
    </div>
  );
};
