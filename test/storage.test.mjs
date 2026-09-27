import test from 'node:test';
import assert from 'node:assert/strict';
import { toChunks, fromStored, storedBytes, ruleBytes, MAX_RULE_BYTES, SYNC_QUOTA_BYTES } from '../extension/storage.js';

const rule = (i) => ({
  id: crypto.randomUUID(), match: 'exact', enabled: true,
  from: `https://service-${i}.example.com/welcome`, to: `https://service-${i}.example.com/console`,
});

// Как chrome.storage.sync.set: разложить части по ключам.
const store = (rules) => {
  const chunks = toChunks(rules);
  return Object.fromEntries([['rulesChunks', chunks.length], ...chunks.map((c, i) => [`rules_${i}`, c])]);
};

test('части влезают в лимит одного ключа (8 КБ)', () => {
  const data = store(Array.from({ length: 300 }, (_, i) => rule(i)));
  for (const [key, value] of Object.entries(data)) {
    assert.ok(new TextEncoder().encode(JSON.stringify(value)).length + key.length <= 8192, key);
  }
});

test('сохранение и загрузка дают тот же список без служебных id', () => {
  const rules = Array.from({ length: 120 }, (_, i) => rule(i));
  const loaded = fromStored(store(rules));
  assert.deepEqual(loaded, rules.map(({ id, ...r }) => r));
});

test('старый формат 1.1.0 (один ключ rules) читается', () => {
  const legacy = [{ match: 'exact', from: 'a.com', to: 'b.com', enabled: true }];
  assert.deepEqual(fromStored({ rules: legacy }), legacy);
  assert.deepEqual(fromStored({}), []);
});

test('в синхронизацию влезают сотни обычных правил, а не ~50', () => {
  const rules = Array.from({ length: 500 }, (_, i) => rule(i));
  assert.ok(storedBytes(rules) < SYNC_QUOTA_BYTES - 2048, `${storedBytes(rules)} байт`);
});

test('правило максимального размера помещается в одну часть', () => {
  const big = { match: 'regex', enabled: true, from: 'x'.repeat(MAX_RULE_BYTES - 100), to: 'y' };
  assert.ok(ruleBytes(big) <= MAX_RULE_BYTES);
  const data = store([rule(1), big, rule(2)]);
  for (const [key, value] of Object.entries(data)) {
    assert.ok(new TextEncoder().encode(JSON.stringify(value)).length + key.length <= 8192, key);
  }
});
