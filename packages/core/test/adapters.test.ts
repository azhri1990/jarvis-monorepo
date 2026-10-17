import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineAdapter, SkillRegistry } from '../src';

test('adapter validates args, redacts secrets, and runs through consent', async () => {
  const a = defineAdapter(
    { name: 'scrape', description: 'x', risk: 'low', args: { url: 'string' } },
    async (args) => ({ url: args.url, token: 'ghp_abcdefghijklmnopqrstuv' }),
  );
  const reg = new SkillRegistry({ check: async () => true });
  reg.register(a);
  await assert.rejects(reg.run('scrape', {}), /must be a string/);
  assert.deepEqual(await reg.run('scrape', { url: 'u' }), { url: 'u', token: '[REDACTED]' });
});

test('adapter times out and redacts error messages', async () => {
  const slow = defineAdapter({ name: 's', description: '', risk: 'low', timeoutMs: 20 }, () => new Promise(() => {}));
  await assert.rejects(slow.run({}), /timed out/);
  const bad = defineAdapter({ name: 'b', description: '', risk: 'low' }, async () => { throw new Error('key sk-abcdefghijkl'); });
  await assert.rejects(bad.run({}), (e: Error) => !e.message.includes('sk-abc'));
});
