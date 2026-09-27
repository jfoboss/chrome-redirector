import { t, ALL_SITES, MATCH_TYPES, validateRule, buildRegex, requiredOrigin, requiredOrigins } from './rules.js';
import { loadRules, saveRules, ruleBytes, storedBytes, MAX_RULE_BYTES, SYNC_QUOTA_BYTES } from './storage.js';

// Запас под остальные ключи (общий выключатель, служебные) в общем лимите storage.sync.
const RULES_BUDGET_BYTES = SYNC_QUOTA_BYTES - 2048;
const kb = (n) => String(Math.ceil(n / 1024));

const $ = (id) => document.getElementById(id);
const tbody = $('rules');
let rules = [];

const MATCH_LABELS = { exact: 'matchExact', domain: 'matchDomain', prefix: 'matchPrefix', regex: 'matchRegex' };

function newRule(from = '') {
  return { id: crypto.randomUUID(), match: 'exact', from, to: '', enabled: true };
}

function render(errors = {}) {
  tbody.replaceChildren();
  $('empty').hidden = rules.length > 0;
  rules.forEach((rule, i) => {
    const tr = document.createElement('tr');
    tr.classList.toggle('disabled', !rule.enabled);
    if (errors[rule.id]) tr.classList.add('invalid');

    const enabled = Object.assign(document.createElement('input'), { type: 'checkbox', checked: rule.enabled, title: t('toggleRule') });
    enabled.onchange = () => { rule.enabled = enabled.checked; tr.classList.toggle('disabled', !rule.enabled); };

    const match = document.createElement('select');
    for (const value of MATCH_TYPES) match.add(new Option(t(MATCH_LABELS[value]), value, false, value === rule.match));
    match.onchange = () => { rule.match = match.value; };

    const from = Object.assign(document.createElement('input'), { type: 'text', value: rule.from, placeholder: 'https://example.com' });
    from.oninput = () => { rule.from = from.value; };
    const to = Object.assign(document.createElement('input'), { type: 'text', value: rule.to, placeholder: 'https://example.com/page' });
    to.oninput = () => { rule.to = to.value; };

    const btn = (text, title, onclick) => Object.assign(document.createElement('button'), { textContent: text, title, onclick });
    const move = (d) => { const j = i + d; if (j < 0 || j >= rules.length) return; [rules[i], rules[j]] = [rules[j], rules[i]]; render(); };

    const cell = (cls, ...children) => { const td = document.createElement('td'); if (cls) td.className = cls; td.append(...children); return td; };
    const fromCell = cell('from', from);
    const note = (className, textContent) => fromCell.append(Object.assign(document.createElement('div'), { className, textContent }));
    if (errors[rule.id]) {
      note('error', errors[rule.id]);
    } else if (rule.enabled && !validateRule(rule)) {
      // Правило могло прийти из импорта или доступ отозвали в настройках Chrome.
      chrome.permissions.contains({ origins: [requiredOrigin(rule)] }).then((ok) => { if (!ok) note('warning', t('noAccess')); });
    }

    tr.append(
      cell('', enabled),
      cell('type', match),
      fromCell,
      cell('arrow', '→'),
      cell('to', to),
      cell('row-btns',
        btn('↑', t('moveUp'), () => move(-1)),
        btn('↓', t('moveDown'), () => move(1)),
        btn('✕', t('deleteRule'), () => { rules.splice(i, 1); render(); })),
    );
    tbody.append(tr);
  });
}

function setStatus(text, isErr = false) {
  $('status').textContent = text;
  $('status').className = isErr ? 'err' : '';
  if (!isErr) setTimeout(() => { if ($('status').textContent === text) $('status').textContent = ''; }, 2000);
}

async function validateAll() {
  const errors = {};
  for (const rule of rules) {
    const err = ruleBytes(rule) > MAX_RULE_BYTES ? t('errRuleTooLong', kb(MAX_RULE_BYTES)) : validateRule(rule);
    if (err) { errors[rule.id] = err; continue; }
    const { isSupported, reason } = await chrome.declarativeNetRequest.isRegexSupported({ regex: buildRegex(rule) });
    if (!isSupported) errors[rule.id] = t('regexUnsupported', reason);
  }
  return errors;
}

// Отзывает доступ к сайтам, которые больше не нужны ни одному правилу.
async function releaseUnusedOrigins(needed) {
  const { origins = [] } = await chrome.permissions.getAll();
  const unused = origins.filter((o) => !needed.includes(o));
  if (unused.length) await chrome.permissions.remove({ origins: unused });
}

async function save() {
  rules = rules.filter((r) => r.from.trim() || r.to.trim());
  // Проверяем объём до запроса доступа, чтобы не спрашивать зря.
  const size = storedBytes(rules);
  if (size > RULES_BUDGET_BYTES) return setStatus(t('errQuota', kb(size), kb(RULES_BUDGET_BYTES)), true);
  // Каждое правило — это regexFilter, а их у расширения Chrome допускает не больше 1000.
  const maxRules = chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES;
  const active = rules.filter((r) => r.enabled !== false).length;
  if (active > maxRules) return setStatus(t('errTooManyRules', String(active), String(maxRules)), true);
  // permissions.request работает только по клику пользователя, поэтому идёт до долгой валидации.
  const origins = requiredOrigins(rules);
  // Пока выдан доступ ко всем сайтам, Chrome считает отдельные сайты уже разрешёнными и не
  // запоминает их. Если «все сайты» больше не нужны, отзываем их заранее, чтобы запросить нужные явно.
  const { origins: current = [] } = await chrome.permissions.getAll();
  if (current.includes(ALL_SITES) && !origins.includes(ALL_SITES)) {
    await chrome.permissions.remove({ origins: [ALL_SITES] });
  }
  const granted = origins.length === 0 || await chrome.permissions.request({ origins });
  if (!granted) {
    render();
    return setStatus(t('permissionDenied'), true);
  }
  const errors = await validateAll();
  render(errors);
  if (Object.keys(errors).length) return setStatus(t('fixErrors'), true);
  try {
    await saveRules(rules);
  } catch (e) {
    // Например, превышен лимит синхронизации Chrome на число записей в минуту.
    return setStatus(t('errSave', e.message), true);
  }
  await releaseUnusedOrigins(origins);
  setStatus(t('saved'));
}

async function load() {
  const [stored, { enabled = true }] = await Promise.all([loadRules(), chrome.storage.sync.get('enabled')]);
  rules = stored.map((r) => ({ ...r, id: crypto.randomUUID() }));
  $('enabled').checked = enabled;
  const from = new URLSearchParams(location.search).get('from');
  if (from) {
    rules.push(newRule(from));
    history.replaceState(null, '', location.pathname);
  }
  render();
  if (from) tbody.lastElementChild?.querySelector('.to input').focus();
}

$('enabled').onchange = () => chrome.storage.sync.set({ enabled: $('enabled').checked });
$('add').onclick = () => { rules.push(newRule()); render(); tbody.lastElementChild.querySelector('.from input').focus(); };
$('save').onclick = save;

$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(rules.map(({ id, ...r }) => r), null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'redirect-rules.json' });
  a.click();
  URL.revokeObjectURL(a.href);
};
$('import').onclick = () => $('importFile').click();
$('importFile').onchange = async () => {
  const file = $('importFile').files[0];
  $('importFile').value = '';
  if (!file) return;
  try {
    const list = JSON.parse(await file.text());
    if (!Array.isArray(list)) throw new Error(t('importNotArray'));
    rules.push(...list.map((r) => ({ ...newRule(), ...r, id: crypto.randomUUID(), from: String(r.from ?? ''), to: String(r.to ?? '') })));
    render();
    setStatus(t('imported', String(list.length)));
  } catch (e) {
    setStatus(t('importError', e.message), true);
  }
};

load();
