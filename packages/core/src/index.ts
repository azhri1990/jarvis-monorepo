/** Structural interfaces so core stays decoupled from (and works with) @jarvis/llm, memory and consent. */
export interface Chat { chat(m: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<{ text: string }>; }
export interface Memory {
  add(text: string): Promise<unknown>;
  search(q: string, limit?: number): Promise<{ text: string }[]>;
}
export interface Gate { check(a: { skill: string; name: string; risk: 'low' | 'medium' | 'high' }): Promise<boolean>; }

type Handler = (payload: any) => void | Promise<void>;

/** Minimal event bus; a failing handler never affects others or the emitter. */
export class EventBus {
  private handlers = new Map<string, Set<Handler>>();
  on(event: string, h: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(h);
    return () => this.handlers.get(event)?.delete(h);
  }
  async emit(event: string, payload?: unknown): Promise<void> {
    await Promise.all([...(this.handlers.get(event) ?? [])].map(async (h) => { try { await h(payload); } catch { /* isolated */ } }));
  }
}

export interface Skill {
  name: string;
  risk: 'low' | 'medium' | 'high';
  run(args: Record<string, unknown>): Promise<unknown>;
}

/** Skills are the only way to act; every run passes the consent gate. */
export class SkillRegistry {
  private skills = new Map<string, Skill>();
  constructor(private gate: Gate, private bus?: EventBus) {}
  register(s: Skill): void {
    if (this.skills.has(s.name)) throw new Error(`Skill already registered: ${s.name}`);
    this.skills.set(s.name, s);
  }
  list(): string[] { return [...this.skills.keys()]; }
  async run(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const s = this.skills.get(name);
    if (!s) throw new Error(`Unknown skill: ${name}`);
    if (!(await this.gate.check({ skill: name, name: 'run', risk: s.risk }))) {
      await this.bus?.emit('skill.denied', { name });
      throw new Error(`Consent denied for skill: ${name}`);
    }
    const result = await s.run(args);
    await this.bus?.emit('skill.ran', { name });
    return result;
  }
}

/** Retrieves relevant memories into the prompt, answers, and records the exchange. */
export class Assistant {
  private history: { role: 'user' | 'assistant'; content: string }[] = [];
  constructor(private llm: Chat, private memory?: Memory, private bus?: EventBus, private system = 'You are JARVIS, a concise, helpful assistant.') {}

  async ask(input: string): Promise<string> {
    const facts = this.memory ? await this.memory.search(input, 5).catch(() => []) : [];
    const sys = facts.length ? `${this.system}\nKnown facts:\n${facts.map((f) => `- ${f.text}`).join('\n')}` : this.system;
    this.history.push({ role: 'user', content: input });
    const { text } = await this.llm.chat([{ role: 'system', content: sys }, ...this.history.slice(-20)]);
    this.history.push({ role: 'assistant', content: text });
    await this.bus?.emit('assistant.replied', { input, text });
    return text;
  }

  remember(fact: string): Promise<unknown> {
    if (!this.memory) throw new Error('No memory configured');
    return this.memory.add(fact);
  }
}

export * from './adapters';
