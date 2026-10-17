import { ChatMessage, LLMProvider } from './types';

export interface ChatResult {
  text: string;
  provider: string;
}

/** Tries providers in order (e.g. local first, then cloud) until one succeeds. */
export class LLMRouter {
  constructor(private providers: LLMProvider[]) {
    if (providers.length === 0) throw new Error('LLMRouter requires at least one provider');
  }

  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatResult> {
    const errors: string[] = [];
    for (const p of this.providers) {
      try {
        return { text: await p.chat(messages, signal), provider: p.name };
      } catch (e) {
        if (signal?.aborted) throw e;
        errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new Error(`All LLM providers failed: ${errors.join('; ')}`);
  }
}
