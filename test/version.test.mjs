import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// release-please поднимает версию во всех трёх местах одним release PR.
test('версия одинакова в manifest.json, version.txt и .release-please-manifest.json', () => {
  const manifest = JSON.parse(read('extension/manifest.json')).version;
  assert.equal(read('version.txt').trim(), manifest, 'version.txt');
  assert.equal(JSON.parse(read('.release-please-manifest.json'))['.'], manifest, '.release-please-manifest.json');
});
