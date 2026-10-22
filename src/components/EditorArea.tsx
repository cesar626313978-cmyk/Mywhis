import React from 'react';
import { Sparkles, FileText, Check, Undo2, Radio, AudioLines } from 'lucide-react';

interface EditorAreaProps {
  originalText: string;
  transformedText: string;
  activeView: 'original' | 'transformed';
  lastAppliedTransformation: string | null;
  onViewChange: (view: 'original' | 'transformed') => void;
  onOriginalTextChange: (text: string) => void;
  onTransformedTextChange: (text: string) => void;
  hasBackupAudio: boolean;
  isTranscribingBackup: boolean;
  onTranscribeBackup: () => void;
  isRecording: boolean;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  originalText,
  transformedText,
  activeView,
  lastAppliedTransformation,
  onViewChange,
  onOriginalTextChange,
  onTransformedTextChange,
  hasBackupAudio,
  isTranscribingBackup,
  onTranscribeBackup,
  isRecording,
}) => {
  const hasTransformation = Boolean(transformedText.trim());
  const currentText = activeView === 'original' ? originalText : transformedText;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeView === 'original') {
      onOriginalTextChange(e.target.value);
    } else {
      onTransformedTextChange(e.target.value);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-[220px] bg-[#0c1019] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
      {/* Top Bar: View Tabs & Backup audio action */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/5 flex-wrap gap-2">
        {/* Dual Tabs for Original vs Transformed */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
          <button
            onClick={() => onViewChange('original')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'original'
                ? 'bg-slate-700 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Texto Original</span>
            {originalText.trim() && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-600/50 text-slate-300">
                {originalText.trim().split(/\s+/).length}
              </span>
            )}
          </button>

          <button
            onClick={() => onViewChange('transformed')}
            disabled={!hasTransformation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !hasTransformation
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : activeView === 'transformed'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span>
              {lastAppliedTransformation ? `IA: ${lastAppliedTransformation}` : 'Transformado por IA'}
            </span>
            {hasTransformation && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-violet-400/20 text-violet-200">
                {transformedText.trim().split(/\s+/).length}
              </span>
            )}
          </button>
        </div>

        {/* Backup audio transcription button (shown when parallel audio was captured) */}
        {hasBackupAudio && !isRecording && (
          <button
            onClick={onTranscribeBackup}
            disabled={isTranscribingBackup}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-300 border border-indigo-500/20 text-xs font-medium transition-all disabled:opacity-50"
            title="Envía el audio completo grabado en segundo plano a Gemini para transcribir si apagaste la pantalla"
          >
            {isTranscribingBackup ? (
              <>
                <AudioLines className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Transcribiendo audio de respaldo...</span>
              </>
            ) : (
              <>
                <AudioLines className="w-3.5 h-3.5 text-indigo-400" />
                <span>Transcribir audio de respaldo con Gemini</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Textarea */}
      <div className="relative flex-1 p-3">
        <textarea
          value={currentText}
          onChange={handleChange}
          placeholder={
            isRecording
              ? 'Habla con naturalidad... El texto se irá transcribiendo aquí en tiempo real.'
              : 'El texto dictado aparecerá aquí. También puedes escribir o editar a mano...'
          }
          className="w-full h-full min-h-[160px] bg-transparent text-slate-100 placeholder:text-slate-600 text-sm sm:text-base leading-relaxed resize-none focus:outline-none select-text font-normal"
          spellCheck={false}
        />

        {/* Live speech pulse indicator at bottom right of editor while recording */}
        {isRecording && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-pulse">
            <Radio className="w-3 h-3" />
            <span>Transcribiendo en vivo</span>
          </div>
        )}
      </div>

      {/* Editor footer status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-t border-white/5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>Vista: <strong className="text-slate-400">{activeView === 'original' ? 'Original Dictado' : 'Transformado IA'}</strong></span>
          {hasTransformation && (
            <span className="text-slate-600">• Original preservado intacto</span>
          )}
        </div>
        <div>
          <span>{currentText.length} caracteres</span>
        </div>
      </div>
    </div>
  );
};
