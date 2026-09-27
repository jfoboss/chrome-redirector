// Хранение правил в chrome.storage.sync.
//
// У sync жёсткие лимиты: 8 КБ на один ключ и ~100 КБ всего. Одним ключом влезало бы
// ~50 правил, поэтому список режется на части rules_0, rules_1, … по ~7.5 КБ.
// Служебные id правил не хранятся — страница настроек выдаёт их при загрузке.

const PREFIX = 'rules_';
const COUNT = 'rulesChunks';
const LEGACY = 'rules'; // формат версии 1.1.0: весь список одним ключом
const CHUNK_BYTES = 7500; // с запасом до QUOTA_BYTES_PER_ITEM = 8192
// Размер одного правила, при котором оно гарантированно влезает в часть.
export const MAX_RULE_BYTES = CHUNK_BYTES - 100;

const bytes = (s) => new TextEncoder().encode(s).length;

export const isRulesKey = (key) => key === COUNT || key === LEGACY || key.startsWith(PREFIX);

const strip = ({ id, ...rule }) => rule;

export function ruleBytes(rule) {
  return bytes(JSON.stringify(strip(rule)));
}

// Режет список на части так, чтобы каждая помещалась в один ключ.
export function toChunks(rules) {
  const chunks = [];
  let chunk = [];
  let size = 2; // []
  for (const rule of rules.map(strip)) {
    const n = bytes(JSON.stringify(rule)) + 1;
    if (chunk.length && size + n > CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = [];
      size = 2;
    }
    chunk.push(rule);
    size += n;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

export function fromStored(data) {
  if (typeof data[COUNT] !== 'number') return data[LEGACY] || [];
  const rules = [];
  for (let i = 0; i < data[COUNT]; i++) rules.push(...(data[PREFIX + i] || []));
  return rules;
}

export async function loadRules() {
  return fromStored(await chrome.storage.sync.get(null));
}

// Сохраняет список одной операцией и удаляет лишние части и старый ключ.
// Если не хватает места, бросает ошибку от Chrome — список при этом не меняется.
export async function saveRules(rules) {
  const chunks = toChunks(rules);
  const data = { [COUNT]: chunks.length };
  chunks.forEach((chunk, i) => { data[PREFIX + i] = chunk; });
  await chrome.storage.sync.set(data);
  const stale = Object.keys(await chrome.storage.sync.get(null))
    .filter((k) => k === LEGACY || (k.startsWith(PREFIX) && Number(k.slice(PREFIX.length)) >= chunks.length));
  if (stale.length) await chrome.storage.sync.remove(stale);
}

// Сколько байт займёт список в sync — для понятного сообщения до попытки сохранить.
export function storedBytes(rules) {
  return toChunks(rules).reduce((sum, chunk, i) => sum + bytes(JSON.stringify(chunk)) + (PREFIX + i).length, 0);
}

export const SYNC_QUOTA_BYTES = 102400;
