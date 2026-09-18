import React, { useState } from 'react';
import { DictationMode } from '../types';
import { Sliders, Plus, Save, Trash2, Cpu, Settings } from 'lucide-react';

interface ModesTabProps {
  modes: DictationMode[];
  setModes: React.Dispatch<React.SetStateAction<DictationMode[]>>;
}

export const ModesTab: React.FC<ModesTabProps> = ({ modes, setModes }) => {
  const [selectedModeIndex, setSelectedModeIndex] = useState<number>(0);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const activeMode = modes[selectedModeIndex] || modes[0];

  const handleFieldChange = (field: keyof DictationMode, value: any) => {
    const updated = [...modes];
    updated[selectedModeIndex] = {
      ...updated[selectedModeIndex],
      [field]: value
    };
    setModes(updated);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Custom Dictation Modes (`modes.json`)</h2>
          <p className="text-sm text-slate-500">Configure LLM instructions, voice models, temperature, and context rules for custom modes.</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
        >
          <Save className="w-4 h-4" />
          {savedSuccess ? 'Guardado Exitosamente' : 'Guardar Cambios Modes.json'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Modes Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available Modes
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {modes.length} Modes
            </span>
          </div>

          <div className="space-y-1">
            {modes.map((mode, idx) => {
              const isSelected = selectedModeIndex === idx;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedModeIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-medium border border-indigo-200 shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{mode.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">id: {mode.id}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-white border border-slate-200 font-mono text-slate-600">
                    {mode.llmModel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Configuration Editor */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Editing Mode: {activeMode.name}</h3>
              <p className="text-xs text-slate-500">ID: {activeMode.id}</p>
            </div>
            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
              {activeMode.llmModel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Mode Name
              </label>
              <input
                type="text"
                value={activeMode.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                LLM Model
              </label>
              <input
                type="text"
                value={activeMode.llmModel}
                onChange={(e) => handleFieldChange('llmModel', e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={activeMode.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              System Prompt & Instructions for LLM
            </label>
            <textarea
              rows={5}
              value={activeMode.systemPrompt}
              onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Temperature ({activeMode.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeMode.temperature}
                onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={activeMode.maxTokens}
                onChange={(e) => handleFieldChange('maxTokens', parseInt(e.target.value) || 500)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
