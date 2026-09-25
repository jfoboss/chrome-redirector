// Общая логика: превращает правила пользователя в правила declarativeNetRequest.

export const MATCH_TYPES = {
  exact: 'Точный адрес',
  domain: 'Весь сайт',
  prefix: 'Начинается с',
  regex: 'Регулярное выражение',
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Разбирает адрес, допуская запись без схемы: "cloud.vk.ru" -> https://cloud.vk.ru/
export function parseUrl(input) {
  const s = String(input || '').trim();
  if (!s) throw new Error('Пустой адрес');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  const url = new URL(withScheme);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Поддерживаются только http и https');
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
    if (!re) throw new Error('Пустое регулярное выражение');
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

// Проверка правила. Возвращает текст ошибки или null.
export function validateRule(rule) {
  let regex;
  try {
    regex = buildRegex(rule);
  } catch (e) {
    return `Откуда: ${e.message}`;
  }
  let jsRe;
  try {
    jsRe = new RegExp(regex);
  } catch (e) {
    return `Некорректное регулярное выражение: ${e.message}`;
  }
  if (rule.match === 'regex') {
    if (!String(rule.to || '').trim()) return 'Куда: пустой адрес';
    return null;
  }
  let target;
  try {
    target = normalizeTarget(rule.to);
  } catch (e) {
    return `Куда: ${e.message}`;
  }
  if (jsRe.test(target)) {
    return 'Адрес назначения попадает под это же правило — получится бесконечный редирект';
  }
  return null;
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
