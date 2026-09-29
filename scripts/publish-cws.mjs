#!/usr/bin/env node
// Загружает ZIP в Chrome Web Store и отправляет его на проверку (Chrome Web Store API V2).
//
//   node scripts/publish-cws.mjs dist/site-redirect-rules-X.Y.Z.zip
//
// Переменные окружения:
//   CWS_SERVICE_ACCOUNT_KEY — JSON-ключ сервисного аккаунта Google Cloud (целиком).
//                             Без него скрипт ничего не делает и завершается успешно.
//   CWS_PUBLISHER_ID        — ID издателя из Developer Dashboard (Account → Publisher ID).
//   CWS_EXTENSION_ID        — ID расширения в магазине.
//   CWS_PUBLISH             — "false": только загрузить пакет, на проверку не отправлять.
//   CWS_API_BASE            — адрес API (для тестов).
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const API = process.env.CWS_API_BASE || 'https://chromewebstore.googleapis.com';
const POLL_MS = Number(process.env.CWS_POLL_MS || 5000);
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const b64url = (data) => Buffer.from(data).toString('base64url');

// Обмен подписанного JWT сервисного аккаунта на access token (OAuth 2.0 JWT bearer).
export async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key.private_key, 'base64url');
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Не удалось получить токен: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}

async function call(token, method, url, body) {
  const res = await fetch(url, { method, headers: { authorization: `Bearer ${token}` }, body });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  return json;
}

const inProgress = (state) => state === 'IN_PROGRESS' || state === 'UPLOAD_IN_PROGRESS';

export async function publish({ key, publisherId, extensionId, zip, expectedVersion, submit = true, log = console.log }) {
  const item = `publishers/${publisherId}/items/${extensionId}`;
  const token = await getAccessToken(key);

  log(`Загрузка ${zip} → ${item}`);
  let upload = await call(token, 'POST', `${API}/upload/v2/${item}:upload`, readFileSync(zip));
  let state = upload.uploadState;
  for (const started = Date.now(); inProgress(state);) {
    if (Date.now() - started > POLL_TIMEOUT_MS) throw new Error('Магазин слишком долго обрабатывает пакет');
    await new Promise((r) => setTimeout(r, POLL_MS));
    const status = await call(token, 'GET', `${API}/v2/${item}:fetchStatus`);
    state = status.lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') throw new Error(`Загрузка не удалась: ${JSON.stringify(upload)}`);
  if (upload.crxVersion && expectedVersion && upload.crxVersion !== expectedVersion) {
    throw new Error(`Магазин принял версию ${upload.crxVersion}, а ожидалась ${expectedVersion}`);
  }
  log(`Пакет загружен${upload.crxVersion ? `, версия ${upload.crxVersion}` : ''}`);

  if (!submit) {
    log('CWS_PUBLISH=false — на проверку не отправляем, пакет ждёт в Developer Dashboard');
    return { uploaded: true, submitted: false };
  }
  const result = await call(token, 'POST', `${API}/v2/${item}:publish`, '{}');
  for (const w of result.warningInfo?.warnings || []) log(`Предупреждение магазина: ${JSON.stringify(w)}`);
  log(`Отправлено на проверку, состояние: ${result.state}`);
  return { uploaded: true, submitted: true, state: result.state };
}

async function main() {
  const zip = process.argv[2];
  const { CWS_SERVICE_ACCOUNT_KEY: rawKey, CWS_PUBLISHER_ID: publisherId, CWS_EXTENSION_ID: extensionId } = process.env;
  if (!rawKey) {
    console.log('CWS_SERVICE_ACCOUNT_KEY не задан — публикация в Chrome Web Store пропущена');
    return;
  }
  if (!zip || !publisherId || !extensionId) {
    throw new Error('Нужны путь к ZIP, CWS_PUBLISHER_ID и CWS_EXTENSION_ID');
  }
  const expectedVersion = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url))).version;
  await publish({
    key: JSON.parse(rawKey),
    publisherId,
    extensionId,
    zip,
    expectedVersion,
    submit: process.env.CWS_PUBLISH !== 'false',
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`::error::${e.message}`);
    process.exit(1);
  });
}
