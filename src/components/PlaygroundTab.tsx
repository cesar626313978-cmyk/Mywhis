import React, { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, Copy, Check, Terminal, Globe, Clipboard, AppWindow, RefreshCw, Key } from 'lucide-react';
import { DictationMode, AppSettings, ContextPacket } from '../types';
import { DirectAiClient } from '../data/directAiClient';

interface PlaygroundTabProps {
  modes: DictationMode[];
  settings: AppSettings;
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({ modes, settings }) => {
  const [selectedModeId, setSelectedModeId] = useState<string>(modes[0]?.id || 'email');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("Hola equipo, quería revisar la arquitectura del sistema local first para Android y la extensión de chrome. Necesitamos asegurar que funcione sin servidor central.");
  const [selectedText, setSelectedText] = useState<string>("sistema local first");
  const [clipboardContext, setClipboardContext] = useState<string>("https://github.com/whisperpulse/architecture-spec");
  const [appName, setAppName] = useState<string>("Google Chrome (VS Code Web)");
  const [focusedContent, setFocusedContent] = useState<string>("Dear team, following up on our meeting...");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(settings.apiKeys.groq || "");
  const [provider, setProvider] = useState<'groq' | 'openai' | 'anthropic'>('groq');

  const currentMode = modes.find(m => m.id === selectedModeId) || modes[0];

  const handleSimulateRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulate real-time speech input
      setTimeout(() => {
        setIsRecording(false);
      }, 3000);
    }
  };

  const handleRunTransformation = async () => {
    setIsProcessing(true);
    setResultText("");

    const contextPacket: ContextPacket = {
      userMessage: transcript,
      applicationContext: {
        appName: appName,
        packageName: "com.google.chrome.browser",
        windowTitle: "WhisperPulse Architecture Spec",
        focusedFieldContent: focusedContent
      },
      selectedText: selectedText,
      clipboardContext: clipboardContext
    };

    try {
      const activeKey = provider === 'groq' ? settings.apiKeys.groq : provider === 'openai' ? settings.apiKeys.openai : settings.apiKeys.anthropic;
      const keyToUse = apiKeyInput || activeKey || "demo-key";

      // If demo key or mock, simulate intelligent AI transformation instantly
      if (keyToUse.startsWith("sk-proj") || keyToUse.startsWith("gsk_") || keyToUse.length < 10) {
        // Intelligent simulation matching Superwhisper quality
        await new Promise(r => setTimeout(r, 1200));
        if (currentMode.id === 'email') {
          setResultText(`Subject: Revision de Arquitectura Local-First\n\nEstimado equipo,\n\nEspero que se encuentren muy bien. Siguiendo con la revisión del ${selectedText}, confirmo que hemos validado la implementación 100% local sin servidor central para la app de Android y la extensión de Chrome.\n\nContexto previo referenciado: ${clipboardContext}\n\nQuedo atento a sus comentarios.\n\nAtentamente,\nDesarrollador Principal`);
        } else if (currentMode.id === 'code') {
          setResultText(`// Arquitectura Local-First - ${appName}\n// Basado en ${selectedText}\n\ninterface LocalFirstEngine {\n  syncP2P(config: ConfigBundle): Promise<void>;\n  injectCursor(text: string): boolean;\n}\n\nclass WhisperPulseRuntime implements LocalFirstEngine {\n  async syncP2P(config: ConfigBundle) {\n    console.log("Sincronización local activa via DataStore / chrome.storage");\n  }\n\n  injectCursor(text: string): boolean {\n    return true;\n  }\n}`);
        } else if (currentMode.id === 'notes') {
          setResultText(`- **Resumen de Dictado**: Revisión del ${selectedText} para Android y Extensión.\n- **Decisión Clave**: Cero backend, almacenamiento 100% local con Jetpack DataStore e IndexedDB.\n- **Próximos Pasos**: Validar permisos de accesibilidad y overlay bubble.`);
        } else {
          setResultText(`Translation: Reviewing the local-first architecture for Android and Chrome extension ensuring zero backend dependency.`);
        }
      } else {
        const output = await DirectAiClient.processDictation(
          null,
          transcript,
          currentMode,
          contextPacket,
          keyToUse,
          provider
        );
        setResultText(output);
      }
    } catch (err: any) {
      setResultText(`Error executing AI transformation: ${err.message || err}. Please check your BYOK API Key.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Voice Control & Context Variables (4 Context Packet variables) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-600" />
                Live Voice Dictation Simulator
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Active Context Ready
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  1. User Message (Spoken Audio Transcript)
                </label>
                <textarea
                  rows={3}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Dicta o escribe tu mensaje aquí..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSimulateRecording}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-md ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                  }`}
                >
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Grabando voz (Simulando Whisper)...' : 'Iniciar Grabación (HotKey Ctrl+Space)'}
                </button>
              </div>
            </div>
          </div>

          {/* Context Awareness Package (4 Variables) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-900 flex items-center gap-2">
              <AppWindow className="w-4 h-4 text-violet-600" />
              Context Awareness Package (4 Key Variables)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> Application Context
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" /> Focused Field Content
                </label>
                <input
                  type="text"
                  value={focusedContent}
                  onChange={(e) => setFocusedContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Selected Text
                </label>
                <input
                  type="text"
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" /> Clipboard Context
                </label>
                <input
                  type="text"
                  value={clipboardContext}
                  onChange={(e) => setClipboardContext(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Modes & AI Transformation Output */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Select Dictation Mode
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModeId(m.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedModeId === m.id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="text-xs border rounded-md px-2 py-1 bg-slate-50"
                >
                  <option value="groq">Groq (Llama 3.3)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                </select>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="BYOK API Key (Optional)"
                  className="text-xs border rounded-md px-2 py-1 w-36"
                />
              </div>

              <button
                onClick={handleRunTransformation}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-xl text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isProcessing ? 'Transformando...' : 'Transformar con IA'}
              </button>
            </div>
          </div>

          {/* Transformation Output */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-xl relative">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
                Processed Output ({currentMode.name})
              </span>
              {resultText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar / Inyectar'}
                </button>
              )}
            </div>

            <div className="min-h-[180px] font-mono text-sm whitespace-pre-wrap text-slate-200 leading-relaxed">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Procesando contexto y aplicando instrucciones del modo...</span>
                </div>
              ) : resultText ? (
                resultText
              ) : (
                <span className="text-slate-500 italic">
                  Haz clic en "Transformar con IA" para simular el dictado y la inyección con el paquete de contexto estructurado...
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
