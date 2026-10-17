import type { Skill } from './index';

/** Declarative description of an external capability (e.g. a tool from another repo) wrapped as a skill. */
export interface AdapterManifest {
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  /** Where the capability comes from (repo or tool); informational only. */
  source?: string;
  /** Argument name -> expected primitive type. Listed args are required. */
  args?: Record<string, 'string' | 'number' | 'boolean'>;
  /** Max run time in ms (default 10000). */
  timeoutMs?: number;
}

export interface AdapterSkill extends Skill {
  manifest: AdapterManifest;
}

const SECRET = /\b(sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~+\/=-]{12,})/g;

/** Masks common credential shapes in any string, including nested results. */
export function redact<T>(value: T): T {
  if (typeof value === 'string') return value.replace(SECRET, '[REDACTED]') as unknown as T;
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)])) as T;
  }
  return value;
}

/**
 * Wraps an implementation in a skill that validates args, enforces a timeout
 * and redacts secrets from results and errors. Consent is still applied by SkillRegistry.
 */
export function defineAdapter(
  manifest: AdapterManifest,
  impl: (args: Record<string, unknown>) => Promise<unknown>,
): AdapterSkill {
  if (!manifest.name) throw new Error('Adapter needs a name');
  const timeoutMs = manifest.timeoutMs ?? 10_000;
  return {
    manifest,
    name: manifest.name,
    risk: manifest.risk,
    async run(args) {
      for (const [k, t] of Object.entries(manifest.args ?? {})) {
        if (typeof args[k] !== t) throw new Error(`Adapter ${manifest.name}: arg "${k}" must be a ${t}`);
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error(`Adapter ${manifest.name} timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      try {
        return redact(await Promise.race([impl(args), timeout]));
      } catch (e) {
        throw new Error(redact(e instanceof Error ? e.message : String(e)));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
