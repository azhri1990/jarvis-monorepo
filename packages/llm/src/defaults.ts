import { LLMProvider } from "./types";
import { OllamaProvider, OpenAICompatibleProvider } from './providers';
import { LLMRouter } from './router';

type Env = Record<string, string | undefined>;

/**
 * Zero-config router: local Ollama only (no API key, no cost).
 * A paid/cloud fallback is added only if JARVIS_CLOUD_API_KEY is explicitly set.
 */
export function createDefaultRouter(env: Env = process.env): LLMRouter {
  const providers: LLMProvider[] = [
    new OllamaProvider(env.JARVIS_LOCAL_MODEL || 'llama3.2', env.OLLAMA_HOST || 'http://localhost:11434'),
  ];
  if (env.JARVIS_CLOUD_API_KEY) {
    providers.push(
      new OpenAICompatibleProvider(
        'cloud',
        env.JARVIS_CLOUD_MODEL || 'gpt-4o-mini',
        env.JARVIS_CLOUD_API_KEY,
        env.JARVIS_CLOUD_BASE_URL
      )
    );
  }
  return new LLMRouter(providers);
}
