import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LLMRouter, LLMProvider, OllamaProvider } from '../src';

const ok = (name: string): LLMProvider => ({ name, chat: async () => `hi from ${name}` });
const bad = (name: string): LLMProvider => ({ name, chat: async () => { throw new Error('down'); } });
const msgs = [{ role: 'user' as const, content: 'hello' }];

test('uses first healthy provider', async () => {
  const r = await new LLMRouter([ok('a'), ok('b')]).chat(msgs);
  assert.deepEqual(r, { text: 'hi from a', provider: 'a' });
});

test('falls back when local fails', async () => {
  const r = await new LLMRouter([bad('local'), ok('cloud')]).chat(msgs);
  assert.equal(r.provider, 'cloud');
});

test('throws aggregated error when all fail', async () => {
  await assert.rejects(new LLMRouter([bad('a'), bad('b')]).chat(msgs), /a: down; b: down/);
});

test('ollama adapter parses response and surfaces HTTP errors', async () => {
  const good = (async () => new Response(JSON.stringify({ message: { content: 'yo' } }))) as typeof fetch;
  assert.equal(await new OllamaProvider('m', undefined, good).chat(msgs), 'yo');
  const fail = (async () => new Response('', { status: 500 })) as typeof fetch;
  await assert.rejects(new OllamaProvider('m', undefined, fail).chat(msgs), /HTTP 500/);
});

test('default router is keyless: local only unless a cloud key is set', async () => {
  const { createDefaultRouter } = await import('../src');
  const local = (createDefaultRouter({}) as any).providers;
  assert.deepEqual(local.map((p: LLMProvider) => p.name), ['ollama']);
  const both = (createDefaultRouter({ JARVIS_CLOUD_API_KEY: 'x' }) as any).providers;
  assert.deepEqual(both.map((p: LLMProvider) => p.name), ['ollama', 'cloud']);
});

test('circuit breaker skips a failing provider after threshold, then recovers', async () => {
  let calls = 0;
  let t = 0;
  const flaky: LLMProvider = { name: 'flaky', chat: async () => { calls++; throw new Error('x'); } };
  const r = new LLMRouter([flaky, ok('b')], { failureThreshold: 2, cooldownMs: 1000, cacheSize: 0, now: () => t });
  for (let i = 0; i < 4; i++) await r.chat(msgs);
  assert.equal(calls, 2);
  t = 2000;
  await r.chat(msgs);
  assert.equal(calls, 3);
});

test('times out a hung provider and falls back', async () => {
  const hung: LLMProvider = { name: 'hung', chat: () => new Promise(() => {}) };
  const r = await new LLMRouter([hung, ok('b')], { timeoutMs: 20 }).chat(msgs);
  assert.equal(r.provider, 'b');
});

test('caches identical conversations', async () => {
  let calls = 0;
  const p: LLMProvider = { name: 'p', chat: async () => { calls++; return 'ans'; } };
  const router = new LLMRouter([p]);
  await router.chat(msgs);
  const second = await router.chat(msgs);
  assert.equal(calls, 1);
  assert.equal(second.cached, true);
});
