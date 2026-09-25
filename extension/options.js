import { MATCH_TYPES, validateRule, buildRegex } from './rules.js';

const $ = (id) => document.getElementById(id);
const tbody = $('rules');
let rules = [];

function newRule(from = '') {
  return { id: crypto.randomUUID(), match: 'exact', from, to: '', enabled: true };
}

function render(errors = {}) {
  tbody.replaceChildren();
  rules.forEach((rule, i) => {
    const tr = document.createElement('tr');
    tr.classList.toggle('disabled', !rule.enabled);
    if (errors[rule.id]) tr.classList.add('invalid');

    const enabled = Object.assign(document.createElement('input'), { type: 'checkbox', checked: rule.enabled, title: 'Включить / выключить' });
    enabled.onchange = () => { rule.enabled = enabled.checked; tr.classList.toggle('disabled', !rule.enabled); };

    const match = document.createElement('select');
    for (const [value, label] of Object.entries(MATCH_TYPES)) match.add(new Option(label, value, false, value === rule.match));
    match.onchange = () => { rule.match = match.value; };

    const from = Object.assign(document.createElement('input'), { type: 'text', value: rule.from, placeholder: 'https://example.com' });
    from.oninput = () => { rule.from = from.value; };
    const to = Object.assign(document.createElement('input'), { type: 'text', value: rule.to, placeholder: 'https://example.com/page' });
    to.oninput = () => { rule.to = to.value; };

    const btn = (text, title, onclick) => Object.assign(document.createElement('button'), { textContent: text, title, onclick });
    const move = (d) => { const j = i + d; if (j < 0 || j >= rules.length) return; [rules[i], rules[j]] = [rules[j], rules[i]]; render(); };

    const cell = (cls, ...children) => { const td = document.createElement('td'); if (cls) td.className = cls; td.append(...children); return td; };
    const fromCell = cell('from', from);
    if (errors[rule.id]) fromCell.append(Object.assign(document.createElement('div'), { className: 'error', textContent: errors[rule.id] }));

    tr.append(
      cell('', enabled),
      cell('type', match),
      fromCell,
      cell('arrow', '→'),
      cell('to', to),
      cell('row-btns',
        btn('↑', 'Выше', () => move(-1)),
        btn('↓', 'Ниже', () => move(1)),
        btn('✕', 'Удалить', () => { rules.splice(i, 1); render(); })),
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
    const err = validateRule(rule);
    if (err) { errors[rule.id] = err; continue; }
    const { isSupported, reason } = await chrome.declarativeNetRequest.isRegexSupported({ regex: buildRegex(rule) });
    if (!isSupported) errors[rule.id] = `Chrome не поддерживает это выражение: ${reason}`;
  }
  return errors;
}

async function save() {
  rules = rules.filter((r) => r.from.trim() || r.to.trim());
  const errors = await validateAll();
  render(errors);
  if (Object.keys(errors).length) return setStatus('Исправьте ошибки в выделенных правилах', true);
  await chrome.storage.sync.set({ rules });
  setStatus('Сохранено');
}

async function load() {
  const data = await chrome.storage.sync.get(['rules', 'enabled']);
  rules = data.rules || [];
  $('enabled').checked = data.enabled !== false;
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
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'redirector-rules.json' });
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
    if (!Array.isArray(list)) throw new Error('ожидается массив правил');
    rules.push(...list.map((r) => ({ ...newRule(), ...r, id: crypto.randomUUID(), from: String(r.from ?? ''), to: String(r.to ?? '') })));
    render();
    setStatus(`Импортировано: ${list.length}. Нажмите «Сохранить».`);
  } catch (e) {
    setStatus(`Ошибка импорта: ${e.message}`, true);
  }
};

load();
