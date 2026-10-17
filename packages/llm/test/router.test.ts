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
