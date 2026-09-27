import { t, toDnrRules, rulesWithoutAccess } from './rules.js';
import { loadRules, isRulesKey } from './storage.js';

async function sync() {
  const [rules, { enabled = true }] = await Promise.all([loadRules(), chrome.storage.sync.get('enabled')]);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = enabled ? toDnrRules(rules) : [];
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((r) => r.id),
      addRules,
    });
  } catch (e) {
    // Chrome отклонил набор целиком (например, превышен лимит правил) — работают старые правила.
    console.error(e);
    await chrome.action.setBadgeText({ text: 'err' });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    await chrome.action.setTitle({ title: t('badgeError', e.message) });
    return;
  }

  const noAccess = enabled ? (await rulesWithoutAccess(rules)).length : 0;
  let text = addRules.length ? String(addRules.length) : '';
  let color = '#2563eb';
  let title = t('extName');
  if (!enabled) {
    text = 'off';
    color = '#9ca3af';
  } else if (noAccess) {
    text = '!';
    color = '#d97706';
    title = t('badgeNoAccess', String(noAccess));
  }
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({ title });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  sync();
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(sync);
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && Object.keys(changes).some((k) => k === 'enabled' || isRulesKey(k))) sync();
});
