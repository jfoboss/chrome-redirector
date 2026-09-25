// Подставляет локализованные строки: data-i18n (текст), data-i18n-html (разметка из _locales),
// data-i18n-title, data-i18n-placeholder.
import { t } from './rules.js';

document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0];
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
