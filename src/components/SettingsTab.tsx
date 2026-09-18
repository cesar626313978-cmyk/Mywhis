import React, { useState } from 'react';
import { AppSettings, DictationMode } from '../types';
import { Settings, Key, Download, Upload, Shield, Check, RefreshCw } from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  modes: DictationMode[];
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, setSettings, modes }) => {
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleKeyChange = (provider: keyof AppSettings['apiKeys'], value: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value
      }
    }));
  };

  const handleExportConfig = () => {
    const configBundle = {
      version: "1.0.0",
      timestamp: Date.now(),
      modes: modes,
      settings: settings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `whisperpulse-config-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg('Archivo config.json exportado correctamente para sincronización P2P.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings) {
          setSettings(parsed.settings);
          setSuccessMsg('Configuración importada correctamente desde config.json.');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } catch (err) {
        alert('Error al parsear el archivo JSON de configuración.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">BYOK & P2P Configuration (`settings.json`)</h2>
          <p className="text-sm text-slate-500">Bring Your Own Key model with zero backend storage and manual P2P config synchronization.</p>
        </div>
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* BYOK API Keys Section */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-semibold text-slate-900">Bring Your Own Key (BYOK) Providers</h3>
              <p className="text-xs text-slate-500">Keys are stored locally on your device (DataStore / chrome.storage).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Groq API Key (Fast Llama 3.3 / Whisper Large v3)
              </label>
              <input
                type="password"
                value={settings.apiKeys.groq}
                onChange={(e) => handleKeyChange('groq', e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                OpenAI API Key (GPT-4o)
              </label>
              <input
                type="password"
                value={settings.apiKeys.openai}
                onChange={(e) => handleKeyChange('openai', e.target.value)}
                placeholder="sk-proj-..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Anthropic API Key (Claude 3.5 Sonnet)
              </label>
              <input
                type="password"
                value={settings.apiKeys.anthropic}
                onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Deepgram API Key (Real-Time Audio Transcription)
              </label>
              <input
                type="password"
                value={settings.apiKeys.deepgram}
                onChange={(e) => handleKeyChange('deepgram', e.target.value)}
                placeholder="dg_..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* P2P Sync & Security Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-slate-900">P2P Configuration Backup</h3>
                <p className="text-xs text-slate-500">Export or import your complete configuration file (`config.json`).</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleExportConfig}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <Download className="w-4 h-4" />
                Exportar config.json (Backup)
              </button>

              <label className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition">
                <Upload className="w-4 h-4 text-slate-500" />
                Importar config.json
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportConfig}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Local-First & Zero Backend Guarantee
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              WhisperPulse never stores your audio recordings or API keys on external servers. All processing happens locally on your device or directly between your browser/extension and the official LLM provider APIs.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
