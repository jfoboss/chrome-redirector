# Политика конфиденциальности / Privacy Policy

**Site Redirect Rules (Перенаправления сайтов)** — расширение для Google Chrome.

_Последнее обновление / Last updated: 2026-09-25_

## Русский

Расширение **не собирает, не хранит у себя на серверах и не передаёт третьим лицам** никакие данные пользователя.

- Список правил перенаправления хранится в `chrome.storage.sync` — встроенном хранилище браузера.
  Если в Chrome включена синхронизация, Google синхронизирует его между вашими устройствами
  по своим правилам; разработчик расширения к этим данным доступа не имеет.
- Перенаправление выполняет сам Chrome через API `declarativeNetRequest`: расширение не видит
  историю, адреса открываемых страниц и их содержимое.
- Доступ к сайтам запрашивается только для адресов из ваших правил и нужен Chrome,
  чтобы разрешить перенаправление. Расширение не читает и не изменяет страницы.
- Расширение не использует аналитику, рекламу, сторонние сервисы и не загружает удалённый код.

Вопросы: https://github.com/jfoboss/chrome-redirector/issues

## English

The extension **does not collect, store on any server, or share with third parties** any user data.

- Your redirect rules are kept in `chrome.storage.sync`, the browser's built-in storage.
  If Chrome sync is on, Google syncs it across your devices under its own terms;
  the developer has no access to this data.
- Redirects are performed by Chrome itself via the `declarativeNetRequest` API: the extension
  never sees your browsing history, the URLs you visit, or page content.
- Site access is requested only for the URLs in your rules and is required by Chrome to allow
  the redirect. The extension never reads or modifies pages.
- No analytics, ads, third-party services, or remote code.

Contact: https://github.com/jfoboss/chrome-redirector/issues
