import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConsentGate, Action } from '../src';

const act = (risk: Action['risk'], skill = 's', name = 'n'): Action => ({ skill, name, risk });

test('low allowed, medium/high denied without a prompter', async () => {
  const g = new ConsentGate();
  assert.equal(await g.check(act('low')), true);
  assert.equal(await g.check(act('medium')), false);
  assert.equal(await g.check(act('high')), false);
});

test('prompter decides ask; failures deny', async () => {
  assert.equal(await new ConsentGate({}, async () => true).check(act('high')), true);
  assert.equal(await new ConsentGate({}, async () => false).check(act('high')), false);
  assert.equal(await new ConsentGate({}, async () => { throw new Error('x'); }).check(act('high')), false);
});

test('most specific override wins; deny beats low risk', async () => {
  const g = new ConsentGate({ overrides: { door: 'deny', 'door.status': 'allow' } });
  assert.equal(await g.check(act('low', 'door', 'unlock')), false);
  assert.equal(await g.check(act('high', 'door', 'status')), true);
});

test('every check is audited', async () => {
  const g = new ConsentGate();
  await g.check(act('low'));
  await g.check(act('high'));
  assert.deepEqual(g.audit().map((r) => r.allowed), [true, false]);
});
