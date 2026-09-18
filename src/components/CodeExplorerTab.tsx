import React, { useState } from 'react';
import { CodeModuleFile } from '../types';
import { codeModuleFiles } from '../data/codeModules';
import { Copy, Check, FileCode, Database, Smartphone, Globe } from 'lucide-react';

export const CodeExplorerTab: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const currentFile = codeModuleFiles[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith('.kt')) return <Smartphone className="w-4 h-4 text-amber-500" />;
    if (path.endsWith('.json')) return <Database className="w-4 h-4 text-emerald-500" />;
    return <Globe className="w-4 h-4 text-sky-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Code Ecosystem Explorer</h2>
          <p className="text-sm text-slate-500">Full implementation source code for Android Kotlin and Chrome Extension (Manifest V3).</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Files: {codeModuleFiles.length} Modules
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* File Tree Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">
            Project Modules
          </h3>
          <div className="space-y-1">
            {codeModuleFiles.map((file, idx) => {
              const isSelected = selectedFileIndex === idx;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-sm transition ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-medium border border-indigo-200/60 shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {getFileIcon(file.path)}
                  <div className="truncate flex-1">
                    <div className="font-mono text-xs truncate">{file.path}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code View Area */}
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                {currentFile.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{currentFile.description}</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado al Portapapeles' : 'Copiar Código'}
            </button>
          </div>

          <div className="p-6 overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
