// Общая логика: превращает правила пользователя в правила declarativeNetRequest.

// Локализованная строка; вне расширения (в тестах) возвращает ключ.
export const t = (key, ...subs) => globalThis.chrome?.i18n?.getMessage(key, subs) || key;

export const MATCH_TYPES = ['exact', 'domain', 'prefix', 'regex'];

// Все сайты — нужно только для правил с регулярным выражением.
export const ALL_SITES = '*://*/*';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Разбирает адрес, допуская запись без схемы: "example.com" -> https://example.com/
export function parseUrl(input) {
  const s = String(input || '').trim();
  if (!s) throw new Error(t('errEmptyUrl'));
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(t('errInvalidUrl'));
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(t('errScheme'));
  }
  return url;
}

export function normalizeTarget(input) {
  return parseUrl(input).href;
}

// Регулярное выражение (RE2-совместимое), по которому правило ловит запросы.
export function buildRegex(rule) {
  if (rule.match === 'regex') {
    const re = String(rule.from || '').trim();
    if (!re) throw new Error(t('errEmptyRegex'));
    return re;
  }
  const url = parseUrl(rule.from);
  const host = escapeRegex(url.host);
  if (rule.match === 'domain') {
    return `^https?://${host}(?:[/?#].*)?$`;
  }
  if (rule.match === 'prefix') {
    const rest = escapeRegex(url.host + url.pathname + url.search);
    return `^https?://${rest}`;
  }
  // exact: тот же хост и путь, слэш в конце и query-параметры не важны
  const path = escapeRegex(url.pathname.replace(/\/+$/, ''));
  return `^https?://${host}${path}/?(?:[?#].*)?$`;
}

// Шаблон сайта, к которому расширению нужен доступ, чтобы правило срабатывало.
// Chrome выполняет перенаправление, только если есть доступ к исходному адресу.
export function requiredOrigin(rule) {
  if (rule.match === 'regex') return ALL_SITES;
  return `*://${parseUrl(rule.from).hostname}/*`;
}

// Проверка правила. Возвращает текст ошибки или null.
export function validateRule(rule) {
  let regex;
  try {
    regex = buildRegex(rule);
  } catch (e) {
    return t('errFrom', e.message);
  }
  let jsRe;
  try {
    jsRe = new RegExp(regex);
  } catch (e) {
    return t('errBadRegex', e.message);
  }
  if (rule.match === 'regex') {
    if (!String(rule.to || '').trim()) return t('errTo', t('errEmptyUrl'));
    return null;
  }
  let target;
  try {
    target = normalizeTarget(rule.to);
  } catch (e) {
    return t('errTo', e.message);
  }
  if (jsRe.test(target)) return t('errLoop');
  return null;
}

// Сайты, доступ к которым нужен для включённых корректных правил.
export function requiredOrigins(rules) {
  const origins = rules
    .filter((r) => r.enabled !== false && !validateRule(r))
    .map(requiredOrigin);
  return origins.includes(ALL_SITES) ? [ALL_SITES] : [...new Set(origins)];
}

// Список правил пользователя -> правила declarativeNetRequest.
// Правила выше в списке имеют больший приоритет.
export function toDnrRules(rules) {
  const active = rules.filter((r) => r.enabled !== false && !validateRule(r));
  return active.map((r, i) => {
    const regexFilter = buildRegex(r);
    const redirect = r.match === 'regex'
      ? { regexSubstitution: String(r.to).trim() }
      : { url: normalizeTarget(r.to) };
    return {
      id: i + 1,
      priority: active.length - i,
      action: { type: 'redirect', redirect },
      condition: { regexFilter, resourceTypes: ['main_frame'] },
    };
  });
}
