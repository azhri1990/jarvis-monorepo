import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MemoryStore } from '../src';

const file = () => join(mkdtempSync(join(tmpdir(), 'mem-')), 'sub', 'm.json');

test('persists across instances and searches', async () => {
  const f = file();
  const a = new MemoryStore(f);
  await a.add('Favourite colour is blue', ['prefs']);
  await a.add('Meeting at 5pm');
  const b = new MemoryStore(f);
  assert.equal((await b.search('BLUE')).length, 1);
  assert.equal((await b.search('prefs')).length, 1);
});

test('concurrent adds get unique ids; remove works', async () => {
  const s = new MemoryStore(file());
  const es = await Promise.all([s.add('a'), s.add('b'), s.add('c')]);
  assert.equal(new Set(es.map((e) => e.id)).size, 3);
  assert.equal(await s.remove(es[0].id), true);
  assert.equal(await s.remove(999), false);
  assert.equal((await s.search('')).length, 2);
});
