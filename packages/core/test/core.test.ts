import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, SkillRegistry, Assistant } from '../src';

test('bus isolates failing handlers and unsubscribes', async () => {
  const bus = new EventBus();
  const seen: number[] = [];
  bus.on('e', () => { throw new Error('x'); });
  const off = bus.on('e', (p) => { seen.push(p); });
  await bus.emit('e', 1);
  off();
  await bus.emit('e', 2);
  assert.deepEqual(seen, [1]);
});

test('skills run only when consent allows', async () => {
  const bus = new EventBus();
  const events: string[] = [];
  bus.on('skill.denied', () => { events.push('denied'); });
  bus.on('skill.ran', () => { events.push('ran'); });
  const skill = { name: 'lights', risk: 'high' as const, run: async () => 'on' };
  const denied = new SkillRegistry({ check: async () => false }, bus);
  denied.register(skill);
  await assert.rejects(denied.run('lights'), /Consent denied/);
  const allowed = new SkillRegistry({ check: async () => true }, bus);
  allowed.register(skill);
  assert.equal(await allowed.run('lights'), 'on');
  assert.throws(() => allowed.register(skill), /already/);
  await assert.rejects(allowed.run('nope'), /Unknown/);
  assert.deepEqual(events, ['denied', 'ran']);
});

test('assistant injects memories into the prompt', async () => {
  let sys = '';
  const llm = { chat: async (m: any[]) => { sys = m[0].content; return { text: 'ok' }; } };
  const mem = { add: async () => ({}), search: async () => [{ text: 'likes tea' }] };
  const a = new Assistant(llm, mem);
  assert.equal(await a.ask('drink?'), 'ok');
  assert.match(sys, /likes tea/);
});

test('assistant survives memory failure', async () => {
  const llm = { chat: async () => ({ text: 'fine' }) };
  const mem = { add: async () => ({}), search: async () => { throw new Error('disk'); } };
  assert.equal(await new Assistant(llm, mem).ask('hi'), 'fine');
});
