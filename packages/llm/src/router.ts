import { ChatMessage, LLMProvider } from './types';

export interface ChatResult {
  text: string;
  provider: string;
  cached?: boolean;
}

export interface RouterOptions {
  /** Per-provider timeout in ms (default 30000). */
  timeoutMs?: number;
  /** Consecutive failures before a provider is skipped (default 3). */
  failureThreshold?: number;
  /** How long a tripped provider is skipped, in ms (default 30000). */
  cooldownMs?: number;
  /** Max cached responses; 0 disables caching (default 100). */
  cacheSize?: number;
  now?: () => number;
}

interface Health {
  failures: number;
  openUntil: number;
}

/**
 * Tries providers in order (e.g. local first, then cloud) until one succeeds.
 * Stable: per-provider timeout and circuit breaker so a dead provider is not retried on every call.
 * Fast: identical conversations are answered from an LRU cache.
 */
export class LLMRouter {
  private health = new Map<LLMProvider, Health>();
  private cache = new Map<string, ChatResult>();
  private opts: Required<RouterOptions>;

  constructor(private providers: LLMProvider[], opts: RouterOptions = {}) {
    if (providers.length === 0) throw new Error('LLMRouter requires at least one provider');
    this.opts = { timeoutMs: 30000, failureThreshold: 3, cooldownMs: 30000, cacheSize: 100, now: Date.now, ...opts };
  }

  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatResult> {
    const key = JSON.stringify(messages);
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return { ...hit, cached: true };
    }

    const errors: string[] = [];
    const now = this.opts.now();
    let candidates = this.providers.filter((p) => (this.health.get(p)?.openUntil ?? 0) <= now);
    if (candidates.length === 0) candidates = this.providers; // all tripped: probe anyway

    for (const p of candidates) {
      try {
        const text = await this.callWithTimeout(p, messages, signal);
        this.health.set(p, { failures: 0, openUntil: 0 });
        const result = { text, provider: p.name };
        this.remember(key, result);
        return result;
      } catch (e) {
        if (signal?.aborted) throw e;
        const h = this.health.get(p) ?? { failures: 0, openUntil: 0 };
        h.failures += 1;
        if (h.failures >= this.opts.failureThreshold) h.openUntil = this.opts.now() + this.opts.cooldownMs;
        this.health.set(p, h);
        errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new Error(`All LLM providers failed: ${errors.join('; ')}`);
  }

  private remember(key: string, result: ChatResult): void {
    if (this.opts.cacheSize <= 0) return;
    this.cache.set(key, result);
    if (this.cache.size > this.opts.cacheSize) this.cache.delete(this.cache.keys().next().value as string);
  }

  private async callWithTimeout(p: LLMProvider, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(new Error(`timeout after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);
    });
    try {
      return await Promise.race([p.chat(messages, ctrl.signal), timeout]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
