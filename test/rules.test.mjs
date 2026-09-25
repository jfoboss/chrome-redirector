import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegex, validateRule, toDnrRules } from '../extension/rules.js';

const matches = (rule, url) => new RegExp(buildRegex(rule)).test(url);

test('exact: корень сайта, слэш и параметры не важны', () => {
  const r = { match: 'exact', from: 'https://cloud.vk.ru', to: 'https://msk.cloud.vk.ru/app' };
  assert.ok(matches(r, 'https://cloud.vk.ru/'));
  assert.ok(matches(r, 'http://cloud.vk.ru/?utm=1'));
  assert.ok(!matches(r, 'https://cloud.vk.ru/app'));
  assert.ok(!matches(r, 'https://msk.cloud.vk.ru/'));
  assert.ok(!matches(r, 'https://cloud.vk.ru.evil.com/'));
});

test('exact: путь', () => {
  const r = { match: 'exact', from: '1cmycloud.com/welcome/', to: '1cmycloud.com/console' };
  assert.ok(matches(r, 'https://1cmycloud.com/welcome'));
  assert.ok(matches(r, 'https://1cmycloud.com/welcome/?x'));
  assert.ok(!matches(r, 'https://1cmycloud.com/welcome2'));
  assert.equal(validateRule(r), null);
});

test('domain и prefix', () => {
  assert.ok(matches({ match: 'domain', from: 'example.com' }, 'https://example.com/a/b'));
  assert.ok(!matches({ match: 'domain', from: 'example.com' }, 'https://example.community/'));
  assert.ok(matches({ match: 'prefix', from: 'https://ex.com/docs' }, 'http://ex.com/docs/x'));
});

test('защита от зацикливания', () => {
  assert.match(validateRule({ match: 'domain', from: '1cmycloud.com', to: '1cmycloud.com/console' }), /бесконечный/);
  assert.equal(validateRule({ match: 'exact', from: '1cmycloud.com', to: '1cmycloud.com/console' }), null);
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
