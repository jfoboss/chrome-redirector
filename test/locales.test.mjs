import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dir = new URL('../extension/', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, dir), 'utf8');
const locales = fs.readdirSync(new URL('_locales/', dir));
const messages = Object.fromEntries(locales.map((l) => [l, JSON.parse(read(`_locales/${l}/messages.json`))]));

test('во всех языках одинаковый набор строк', () => {
  const [first, ...rest] = locales;
  for (const l of rest) assert.deepEqual(Object.keys(messages[l]).sort(), Object.keys(messages[first]).sort(), l);
});

test('все ключи из кода и разметки есть в переводах', () => {
  const sources = fs.readdirSync(dir).filter((f) => /\.(js|html|json)$/.test(f)).map(read).join('\n');
  const used = new Set([
    ...[...sources.matchAll(/\bt\('(\w+)'/g)].map((m) => m[1]),
    ...[...sources.matchAll(/data-i18n(?:-html|-title)?="(\w+)"/g)].map((m) => m[1]),
    ...[...sources.matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]),
    ...[...read('options.js').matchAll(/: '(match\w+)'/g)].map((m) => m[1]),
  ]);
  for (const key of used) assert.ok(messages.ru[key], `нет строки ${key}`);
});

test('ограничения Chrome Web Store на название и описание', () => {
  for (const l of locales) {
    assert.ok(messages[l].extName.message.length <= 75, `${l}: название длиннее 75`);
    assert.ok(messages[l].extShortName.message.length <= 12, `${l}: короткое название длиннее 12`);
    assert.ok(messages[l].extDescription.message.length <= 132, `${l}: описание длиннее 132`);
  }
});
