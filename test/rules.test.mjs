import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegex, validateRule, toDnrRules, requiredOrigins } from '../extension/rules.js';

const matches = (rule, url) => new RegExp(buildRegex(rule)).test(url);

test('exact: корень сайта, слэш и параметры не важны', () => {
  const r = { match: 'exact', from: 'https://example.com', to: 'https://app.example.com/app' };
  assert.ok(matches(r, 'https://example.com/'));
  assert.ok(matches(r, 'http://example.com/?utm=1'));
  assert.ok(!matches(r, 'https://example.com/app'));
  assert.ok(!matches(r, 'https://app.example.com/'));
  assert.ok(!matches(r, 'https://example.com.evil.com/'));
});

test('exact: путь', () => {
  const r = { match: 'exact', from: 'example.com/welcome/', to: 'example.com/console' };
  assert.ok(matches(r, 'https://example.com/welcome'));
  assert.ok(matches(r, 'https://example.com/welcome/?x'));
  assert.ok(!matches(r, 'https://example.com/welcome2'));
  assert.equal(validateRule(r), null);
});

test('domain и prefix', () => {
  assert.ok(matches({ match: 'domain', from: 'example.com' }, 'https://example.com/a/b'));
  assert.ok(!matches({ match: 'domain', from: 'example.com' }, 'https://example.community/'));
  assert.ok(matches({ match: 'prefix', from: 'https://ex.com/docs' }, 'http://ex.com/docs/x'));
});

test('защита от зацикливания', () => {
  assert.match(validateRule({ match: 'domain', from: 'example.com', to: 'example.com/console' }), /errLoop/);
  assert.equal(validateRule({ match: 'exact', from: 'example.com', to: 'example.com/console' }), null);
});

test('toDnrRules: приоритет, выключенные и неверные правила пропускаются', () => {
  const dnr = toDnrRules([
    { match: 'exact', from: 'a.com', to: 'b.com', enabled: true },
    { match: 'exact', from: 'c.com', to: 'd.com', enabled: false },
    { match: 'exact', from: '', to: 'd.com' },
    { match: 'regex', from: '^https://old\\.com/(.*)', to: 'https://new.com/\\1' },
  ]);
  assert.equal(dnr.length, 2);
  assert.deepEqual(dnr.map((r) => r.id), [1, 2]);
  assert.ok(dnr[0].priority > dnr[1].priority);
  assert.equal(dnr[0].action.redirect.url, 'https://b.com/');
  assert.equal(dnr[1].action.redirect.regexSubstitution, 'https://new.com/\\1');
  assert.deepEqual(dnr[0].condition.resourceTypes, ['main_frame']);
});

test('requiredOrigins: только нужные сайты, для регулярок — все сайты', () => {
  const a = { match: 'exact', from: 'https://example.com:8080/a', to: 'https://example.com/b' };
  const b = { match: 'domain', from: 'example.org', to: 'https://example.com/' };
  const off = { match: 'exact', from: 'example.net', to: 'example.com', enabled: false };
  assert.deepEqual(requiredOrigins([a, b, off, { ...a }]), ['*://example.com/*', '*://example.org/*']);
  assert.deepEqual(requiredOrigins([a, { match: 'regex', from: '^https://x\\.com/', to: 'https://y.com/' }]), ['*://*/*']);
  assert.deepEqual(requiredOrigins([]), []);
});
