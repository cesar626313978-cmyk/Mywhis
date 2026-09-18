import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900/95 text-white border border-amber-500/50 px-3.5 py-1.5 text-xs font-medium shadow-xl animate-fadeIn">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Modo sin conexión — Mywhis funciona de forma local</span>
    </div>
  );
};
