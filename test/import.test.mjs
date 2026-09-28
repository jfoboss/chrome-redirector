import test from 'node:test';
import assert from 'node:assert/strict';
import { planImport, ruleKey } from '../extension/rules.js';

const r = (from, to, match = 'exact') => ({ match, from, to, enabled: true });

test('один и тот же адрес в разной записи — одно правило', () => {
  assert.equal(ruleKey(r('example.com', 'x')), ruleKey(r('http://example.com/', 'y')));
  assert.notEqual(ruleKey(r('example.com', 'x')), ruleKey(r('example.com', 'x', 'domain')));
  assert.notEqual(ruleKey(r('example.com/a', 'x')), ruleKey(r('example.com/b', 'x')));
});

test('новые, конфликтующие и повторяющиеся правила', () => {
  const existing = [r('https://a.com', 'https://a.com/console'), r('https://b.com', 'https://b.com/app')];
  const plan = planImport(existing, [
    r('a.com', 'a.com/console'),          // то же самое — пропуск
    r('https://b.com/', 'https://b.com/dashboard'), // другой адрес назначения — конфликт
    r('https://c.com', 'https://c.com/x'), // новое
    r('https://c.com/', 'https://c.com/y'), // повтор внутри файла — пропуск
  ]);
  assert.deepEqual(plan.added.map((x) => x.from), ['https://c.com']);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].existing, existing[1]);
  assert.equal(plan.conflicts[0].incoming.to, 'https://b.com/dashboard');
  assert.equal(plan.duplicates.length, 2);
});

test('регулярки сравниваются как текст', () => {
  const existing = [r('^https://x\\.com/(.*)', 'https://y.com/\\1', 'regex')];
  const plan = planImport(existing, [r(' ^https://x\\.com/(.*) ', 'https://z.com/\\1', 'regex')]);
  assert.equal(plan.conflicts.length, 1);
});

test('некорректные правила не ломают импорт', () => {
  const plan = planImport([r('', '')], [r('', ''), r('::', 'x')]);
  assert.equal(plan.duplicates.length, 1);
  assert.equal(plan.added.length, 1);
});
