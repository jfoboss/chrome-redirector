import { toDnrRules } from './rules.js';

async function sync() {
  const { rules = [], enabled = true } = await chrome.storage.sync.get(['rules', 'enabled']);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = enabled ? toDnrRules(rules) : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules,
  });
  const text = enabled ? (addRules.length ? String(addRules.length) : '') : 'off';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? '#2563eb' : '#9ca3af' });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  sync();
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.rules || changes.enabled)) sync();
});
