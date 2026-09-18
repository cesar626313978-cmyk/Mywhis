/**
 * Direct AI Client supporting OpenAI, Groq, Anthropic with Bring-Your-Own-Key (BYOK)
 */

import { ContextPacket, DictationMode } from '../types';

export class DirectAiClient {
  
  static async processDictation(
    audioBlob: Blob | null,
    transcriptText: string,
    mode: DictationMode,
    contextPacket: ContextPacket,
    apiKey: string,
    provider: 'openai' | 'groq' | 'anthropic' = 'groq'
  ): Promise<string> {
    
    // Construct rich prompt with 4 context variables
    const prompt = `
=== CONTEXT PACKET ===
1. User Message (Raw Speech): ${transcriptText}
2. Application Context: App: ${contextPacket.applicationContext.appName} | Focused Field: "${contextPacket.applicationContext.focusedFieldContent}"
3. Selected Text: "${contextPacket.selectedText}"
4. Clipboard Context: "${contextPacket.clipboardContext}"
======================

Task: Follow the system instructions and mode rules to transform the User Message into the final output text.
`;

    if (provider === 'groq') {
      return await this.callGroq(prompt, mode, apiKey);
    } else if (provider === 'openai') {
      return await this.callOpenAI(prompt, mode, apiKey);
    } else {
      return await this.callAnthropic(prompt, mode, apiKey);
    }
  }

  private static async callGroq(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: mode.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: mode.temperature,
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private static async callOpenAI(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: mode.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: mode.temperature,
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private static async callAnthropic(prompt: string, mode: DictationMode, apiKey: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        system: mode.systemPrompt,
        messages: [{ role: "user", content: prompt }],
        max_tokens: mode.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }
}
