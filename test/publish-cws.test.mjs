import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPairSync, createVerify } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const zip = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cws-')), 'ext.zip');
fs.writeFileSync(zip, 'PK-fake-zip');

// Поддельный Chrome Web Store + OAuth: проверяет подпись JWT и токен в каждом запросе.
async function mockStore({ uploadState = 'SUCCEEDED', asyncResult = 'SUCCEEDED', crxVersion = '9.9.9' } = {}) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = Buffer.alloc(0);
    for await (const chunk of req) body = Buffer.concat([body, chunk]);
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: body.toString() });
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/token') {
      const assertion = new URLSearchParams(body.toString()).get('assertion');
      const [h, c, s] = assertion.split('.');
      const ok = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, s, 'base64url');
      const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
      if (!ok || claims.scope !== 'https://www.googleapis.com/auth/chromewebstore' || claims.iss !== 'bot@example.iam.gserviceaccount.com') {
        return send(400, { error: 'invalid_grant' });
      }
      return send(200, { access_token: 'tok-123' });
    }
    if (req.headers.authorization !== 'Bearer tok-123') return send(401, { error: 'unauthorized' });
    if (req.url === '/upload/v2/publishers/pub/items/ext:upload') {
      return send(200, { uploadState, ...(uploadState === 'SUCCEEDED' ? { crxVersion } : {}) });
    }
    if (req.url === '/v2/publishers/pub/items/ext:fetchStatus') return send(200, { lastAsyncUploadState: asyncResult });
    if (req.url === '/v2/publishers/pub/items/ext:publish') return send(200, { state: 'PENDING_REVIEW' });
    send(404, {});
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.CWS_API_BASE = base;
  process.env.CWS_POLL_MS = '10';
  const key = {
    client_email: 'bot@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    token_uri: `${base}/token`,
  };
  return { calls, key, close: () => server.close() };
}

// Модуль читает CWS_API_BASE при загрузке, поэтому импортируем после настройки окружения.
const load = () => import(`../scripts/publish-cws.mjs?${Math.random()}`);
const quiet = () => {};

test('загрузка и отправка на проверку', async () => {
  const store = await mockStore();
  const { publish } = await load();
  const result = await publish({ key: store.key, publisherId: 'pub', extensionId: 'ext', zip, expectedVersion: '9.9.9', log: quiet });
  store.close();
  assert.deepEqual(result, { uploaded: true, submitted: true, state: 'PENDING_REVIEW' });
  const upload = store.calls.find((c) => c.url.endsWith(':upload'));
  assert.equal(upload.body, 'PK-fake-zip');
  assert.ok(store.calls.some((c) => c.url.endsWith(':publish')));
});

test('асинхронная обработка пакета: ждём fetchStatus', async () => {
  const store = await mockStore({ uploadState: 'IN_PROGRESS' });
  const { publish } = await load();
  const result = await publish({ key: store.key, publisherId: 'pub', extensionId: 'ext', zip, log: quiet });
  store.close();
  assert.equal(result.submitted, true);
  assert.ok(store.calls.some((c) => c.url.endsWith(':fetchStatus')));
});

test('CWS_PUBLISH=false: только загрузка', async () => {
  const store = await mockStore();
  const { publish } = await load();
  const result = await publish({ key: store.key, publisherId: 'pub', extensionId: 'ext', zip, submit: false, log: quiet });
  store.close();
  assert.deepEqual(result, { uploaded: true, submitted: false });
  assert.ok(!store.calls.some((c) => c.url.endsWith(':publish')));
});

test('ошибки: отказ загрузки и не та версия', async () => {
  let store = await mockStore({ uploadState: 'FAILED' });
  let { publish } = await load();
  await assert.rejects(publish({ key: store.key, publisherId: 'pub', extensionId: 'ext', zip, log: quiet }), /Загрузка не удалась/);
  store.close();

  store = await mockStore({ crxVersion: '1.0.0' });
  ({ publish } = await load());
  await assert.rejects(publish({ key: store.key, publisherId: 'pub', extensionId: 'ext', zip, expectedVersion: '2.0.0', log: quiet }), /ожидалась 2\.0\.0/);
  assert.ok(!store.calls.some((c) => c.url.endsWith(':publish')), 'не та версия — на проверку не отправляем');
  store.close();
});

test('неверный ключ — понятная ошибка', async () => {
  const store = await mockStore();
  const { publish } = await load();
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  await assert.rejects(publish({ key: { ...store.key, private_key: other }, publisherId: 'pub', extensionId: 'ext', zip, log: quiet }), /Не удалось получить токен/);
  store.close();
});
