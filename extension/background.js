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

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    const { rules } = await chrome.storage.sync.get('rules');
    if (!rules) {
      await chrome.storage.sync.set({
        enabled: true,
        rules: [
          { id: crypto.randomUUID(), match: 'exact', from: 'https://1cmycloud.com/', to: 'https://1cmycloud.com/console', enabled: true },
          { id: crypto.randomUUID(), match: 'exact', from: 'https://1cmycloud.com/welcome', to: 'https://1cmycloud.com/console', enabled: true },
          { id: crypto.randomUUID(), match: 'exact', from: 'https://cloud.vk.ru/', to: 'https://msk.cloud.vk.ru/app', enabled: true },
        ],
      });
      return; // onChanged вызовет sync
    }
  }
  sync();
});

chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.rules || changes.enabled)) sync();
});
