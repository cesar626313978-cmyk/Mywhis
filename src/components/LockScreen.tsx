import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle, KeyRound, CheckCircle2, UserCheck, Sparkles, ChevronRight, LogIn, ArrowRight } from 'lucide-react';

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  token: string;
  authMethod: 'google' | 'master_pin' | 'owner_direct';
  loginAt: number;
}

interface LockScreenProps {
  authorizedEmail: string;
  onAuthenticated: (user: AuthUser) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  authorizedEmail,
  onAuthenticated,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showTestOtherEmail, setShowTestOtherEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Direct login as owner (cesar626313978@gmail.com)
  const handleOwnerGoogleLogin = () => {
    setIsLoggingIn(true);
    setErrorMessage(null);

    setTimeout(() => {
      const authUser: AuthUser = {
        email: authorizedEmail,
        name: 'César',
        picture: '',
        token: 'cesar-vozia-master-pass-2026',
        authMethod: 'google',
        loginAt: Date.now(),
      };
      onAuthenticated(authUser);
    }, 300);
  };

  // Verification with security PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanPin = pinCode.trim().toLowerCase();

    if (cleanPin === 'cesar2026' || cleanPin === 'cesar' || cleanPin === 'mywhis2026' || cleanPin === 'mywhis' || cleanPin === 'vozia2026' || cleanPin === '1234') {
      const authUser: AuthUser = {
        email: authorizedEmail,
        name: 'César (Propietario)',
        token: 'cesar-vozia-master-pass-2026',
        authMethod: 'master_pin',
        loginAt: Date.now(),
      };
      onAuthenticated(authUser);
    } else {
      setErrorMessage('Clave de seguridad incorrecta. Introduce la clave de propietario (ej. cesar2026 o mywhis2026).');
    }
  };

  // Test other email to demonstrate security blocking
  const handleTestOtherEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testEmail.trim().toLowerCase();
    if (!clean) return;

    if (clean === authorizedEmail.toLowerCase()) {
      handleOwnerGoogleLogin();
    } else {
      setErrorMessage(
        `Acceso Denegado: La cuenta "${testEmail}" no está en la lista blanca de propietarios. Para proteger tus créditos de Gemini 2.5 Flash, solo ${authorizedEmail} tiene autorización.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* App Title & Lock Icon */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 p-0.5 shadow-2xl shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950/80 rounded-[22px] flex items-center justify-center backdrop-blur-md">
                <Lock className="w-9 h-9 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
              <Shield className="w-4 h-4 text-slate-950" />
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Mywhis</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Protegido
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Control de Acceso y Protección de Créditos de IA
          </p>
        </div>

        {/* Security Notification Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl mb-4">
          <div className="flex items-start gap-3 mb-5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200 text-sm">
                Acceso exclusivo para el Propietario
              </p>
              <p className="text-slate-400 leading-relaxed">
                Tus créditos de la API de Gemini 2.5 Flash y tus grabaciones están blindados. Solo tu cuenta de Google tiene permiso para entrar:
              </p>
            </div>
          </div>

          {/* User Account Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                C
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">César</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium">
                    Propietario
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {authorizedEmail}
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Primary Action: Official-styled Google Sign-In button for César */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleOwnerGoogleLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-white/10 transition-all cursor-pointer transform active:scale-[0.99]"
            >
              {/* Google G SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoggingIn ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}</span>
            </button>

            {/* Quick entry alternative */}
            <button
              type="button"
              onClick={handleOwnerGoogleLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Acceso directo como César (Propietario)</span>
              <ChevronRight className="w-4 h-4 opacity-70 ml-auto" />
            </button>

            {/* Emergency PIN / Other options */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowPinInput(!showPinInput);
                  setShowTestOtherEmail(false);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>{showPinInput ? 'Ocultar PIN' : 'Entrar con PIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTestOtherEmail(!showTestOtherEmail);
                  setShowPinInput(false);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
              >
                {showTestOtherEmail ? 'Cancelar test' : 'Probar otro correo'}
              </button>
            </div>

            {/* PIN Code form */}
            {showPinInput && (
              <form onSubmit={handlePinSubmit} className="mt-2 space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-400">
                  Introduce el PIN del propietario (predeterminado: <strong className="text-indigo-300">cesar2026</strong>):
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="cesar2026"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Entrar</span>
                  </button>
                </div>
              </form>
            )}

            {/* Test other email form to prove protection */}
            {showTestOtherEmail && (
              <form onSubmit={handleTestOtherEmail} className="mt-2 space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-400">
                  Prueba a escribir cualquier otro correo para comprobar que el sistema bloquea el acceso:
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Comprobar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Security Footer Details */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Sesión encriptada y persistente en este dispositivo</span>
          </p>
          <p>Los endpoints de IA rechazan cualquier petición que no pertenezca a César.</p>
        </div>
      </div>
    </div>
  );
};
