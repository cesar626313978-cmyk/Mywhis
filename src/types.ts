export interface DictationMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  llmModel: string;
  voiceModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  contextRules: {
    includeAppInfo: boolean;
    includeSelectedText: boolean;
    includeClipboard: boolean;
  };
  replacements: Record<string, string>;
}

export interface AppSettings {
  apiKeys: {
    openai: string;
    groq: string;
    anthropic: string;
    deepgram: string;
    gemini: string;
  };
  defaultModel: string;
  audioSettings: {
    sampleRate: number;
    silenceDetectionMs: number;
    hotkey: string;
  };
  customVocabulary: string[];
  autoReplacements: Record<string, string>;
}

export interface ContextPacket {
  userMessage: string;
  applicationContext: {
    appName: string;
    packageName: string;
    windowTitle: string;
    focusedFieldContent: string;
  };
  selectedText: string;
  clipboardContext: string;
}

export interface CodeModuleFile {
  path: string;
  language: 'kotlin' | 'json' | 'typescript' | 'jsonc' | 'xml';
  title: string;
  description: string;
  content: string;
}
