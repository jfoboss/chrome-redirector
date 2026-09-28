import { t, ALL_SITES, MATCH_TYPES, validateRule, buildRegex, requiredOrigin, requiredOrigins, planImport } from './rules.js';
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
    const note = (className, textContent, title = '') => fromCell.append(Object.assign(document.createElement('div'), { className, textContent, title }));
    if (errors[rule.id]) {
      note('error', errors[rule.id]);
    } else if (rule.enabled && !validateRule(rule)) {
      // Правило могло прийти из импорта или доступ отозвали в настройках Chrome.
      chrome.permissions.contains({ origins: [requiredOrigin(rule)] }).then((ok) => { if (!ok) note('warning', t('noAccess'), t('noAccessWhy')); });
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

// Сохраняет правила, когда доступ к нужным сайтам уже есть.
async function persist(origins) {
  try {
    await saveRules(rules);
  } catch (e) {
    // Например, превышен лимит синхронизации Chrome на число записей в минуту.
    return setStatus(t('errSave', e.message), true);
  }
  await releaseUnusedOrigins(origins);
  render();
  setStatus(t('saved'));
}

// Запрашивает доступ и сохраняет. Вызывается по клику «Продолжить» в пояснении:
// permissions.request работает только в ответ на действие пользователя.
async function grantAndSave(origins, dropAllSites) {
  // Пока выдан доступ ко всем сайтам, Chrome считает отдельные сайты уже разрешёнными и не
  // запоминает их. Если «все сайты» больше не нужны, отзываем их, чтобы запросить нужные явно.
  if (dropAllSites) await chrome.permissions.remove({ origins: [ALL_SITES] });
  const granted = await chrome.permissions.request({ origins });
  if (!granted) {
    render();
    return setStatus(t('permissionDenied'), true);
  }
  await persist(origins);
}

const siteLabel = (origin) => (origin === ALL_SITES ? t('accessAllSites') : origin.slice('*://'.length, -'/*'.length));

// Перед системным окном Chrome объясняем, что и зачем он сейчас спросит.
function askForAccess(missing, onContinue) {
  const dialog = $('accessDialog');
  $('accessSites').replaceChildren(...missing.map((o) => Object.assign(document.createElement('li'), { textContent: siteLabel(o) })));
  $('accessContinue').onclick = () => { dialog.close(); onContinue(); };
  $('accessCancel').onclick = () => { dialog.close(); render(); setStatus(t('permissionDenied'), true); };
  dialog.showModal();
}

async function save() {
  rules = rules.filter((r) => r.from.trim() || r.to.trim());
  const size = storedBytes(rules);
  if (size > RULES_BUDGET_BYTES) return setStatus(t('errQuota', kb(size), kb(RULES_BUDGET_BYTES)), true);
  // Каждое правило — это regexFilter, а их у расширения Chrome допускает не больше 1000.
  const maxRules = chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES;
  const active = rules.filter((r) => r.enabled !== false).length;
  if (active > maxRules) return setStatus(t('errTooManyRules', String(active), String(maxRules)), true);
  const errors = await validateAll();
  render(errors);
  if (Object.keys(errors).length) return setStatus(t('fixErrors'), true);

  const origins = requiredOrigins(rules);
  const { origins: current = [] } = await chrome.permissions.getAll();
  const dropAllSites = current.includes(ALL_SITES) && !origins.includes(ALL_SITES);
  // Без «всех сайтов» останутся только явно выданные сайты.
  const has = await Promise.all(origins.map((o) => (dropAllSites
    ? current.includes(o)
    : chrome.permissions.contains({ origins: [o] }))));
  const missing = origins.filter((_, i) => !has[i]);
  if (missing.length) return askForAccess(missing, () => grantAndSave(origins, dropAllSites));
  if (dropAllSites) await chrome.permissions.remove({ origins: [ALL_SITES] });
  await persist(origins);
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
// Показывает правила, у которых такой же адрес уже есть в списке, и даёт выбрать, какие заменить.
function resolveConflicts(conflicts) {
  return new Promise((resolve) => {
    const dialog = $('importDialog');
    const checks = conflicts.map(({ existing, incoming }) => {
      const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: true });
      const tr = document.createElement('tr');
      for (const text of [existing.from, existing.to, incoming.to]) {
        tr.append(Object.assign(document.createElement('td'), { textContent: text }));
      }
      const td = document.createElement('td');
      td.append(check);
      tr.append(td);
      $('importConflicts').append(tr);
      return check;
    });
    const finish = (result) => { dialog.close(); $('importConflicts').replaceChildren(); resolve(result); };
    $('importApply').onclick = () => finish(conflicts.filter((_, i) => checks[i].checked));
    $('importCancel').onclick = () => finish(null);
    dialog.oncancel = (e) => { e.preventDefault(); finish(null); };
    dialog.showModal();
  });
}

$('importFile').onchange = async () => {
  const file = $('importFile').files[0];
  $('importFile').value = '';
  if (!file) return;
  let plan;
  try {
    const list = JSON.parse(await file.text());
    if (!Array.isArray(list)) throw new Error(t('importNotArray'));
    const incoming = list.map((r) => ({ ...newRule(), ...r, id: crypto.randomUUID(), from: String(r.from ?? ''), to: String(r.to ?? '') }));
    plan = planImport(rules, incoming);
  } catch (e) {
    return setStatus(t('importError', e.message), true);
  }
  const replace = plan.conflicts.length ? await resolveConflicts(plan.conflicts) : [];
  if (!replace) return setStatus(t('importCancelled'));
  for (const { existing, incoming } of replace) {
    existing.to = incoming.to;
    existing.enabled = incoming.enabled !== false;
  }
  rules.push(...plan.added);
  render();
  const skipped = plan.duplicates.length + plan.conflicts.length - replace.length;
  setStatus(t('importedSummary', String(plan.added.length), String(replace.length), String(skipped)));
};

load();
