import { t } from './rules.js';

const $ = (id) => document.getElementById(id);

const { rules = [], enabled = true } = await chrome.storage.sync.get(['rules', 'enabled']);
$('enabled').checked = enabled;
$('count').textContent = t('popupCount', String(rules.length), String(rules.filter((r) => r.enabled !== false).length));
$('enabled').onchange = () => chrome.storage.sync.set({ enabled: $('enabled').checked });

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const url = tab?.url || '';
if (/^https?:/.test(url)) {
  const u = new URL(url);
  const from = u.origin + u.pathname;
  $('addCurrent').title = from;
  $('addCurrent').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL(`options.html?from=${encodeURIComponent(from)}`) });
    window.close();
  };
} else {
  $('addCurrent').disabled = true;
}

$('options').onclick = () => { chrome.runtime.openOptionsPage(); window.close(); };
