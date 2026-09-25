# Тексты для Chrome Web Store

Всё, что нужно вставить в Developer Dashboard. Картинки — в [`images/`](images/),
пересобрать их можно командой `npm run store-images`.

## Карточка (Store listing)

**Название** — берётся из пакета: «Перенаправления сайтов» / «Site Redirect Rules».

**Краткое описание** — тоже из пакета (`extDescription` в `_locales`).

**Категория:** Productivity → Tools (Инструменты).

**Язык:** русский (основной), затем добавьте английский.

### Подробное описание — русский

```
Свой список перенаправлений для сайтов, которыми вы пользуетесь каждый день.

Сайт открывается на ненужной странице? Например, example.com всегда показывает /welcome, а вам нужна /console. Добавьте правило — и браузер будет сразу открывать нужную страницу.

Возможности:
• Типы правил: точный адрес, весь сайт, «адрес начинается с», регулярное выражение (RE2) с подстановкой групп \1, \2…
• Правило для открытой страницы — в один клик из значка расширения.
• Порядок правил задаёт приоритет; каждое правило можно временно выключить.
• Общий выключатель всех перенаправлений.
• Защита от зацикливания: правило, которое ведёт само на себя, сохранить нельзя.
• Импорт и экспорт правил в JSON.
• Правила синхронизируются между вашими браузерами Chrome.

Приватность:
• Перенаправление выполняет сам Chrome (declarativeNetRequest) — расширение не видит историю и содержимое страниц.
• Доступ запрашивается только к сайтам из ваших правил.
• Никакой аналитики, рекламы и передачи данных.

Исходный код: https://github.com/jfoboss/chrome-redirector
```

### Detailed description — English

```
Your own redirect list for the sites you use every day.

Does a site always open on the wrong page? Say example.com keeps sending you to /welcome while you need /console. Add a rule and the browser takes you straight to the right page.

Features:
• Rule types: exact URL, whole site, “starts with”, and regular expressions (RE2) with \1, \2… group substitution.
• Add a rule for the current page in one click from the toolbar icon.
• Rule order sets priority; any rule can be switched off temporarily.
• A master switch for all redirects.
• Loop protection: a rule that redirects to itself cannot be saved.
• Import and export rules as JSON.
• Rules sync across your Chrome browsers.

Privacy:
• Redirects are performed by Chrome itself (declarativeNetRequest) — the extension never sees your history or page content.
• Access is requested only for the sites in your rules.
• No analytics, no ads, no data collection.

Source code: https://github.com/jfoboss/chrome-redirector
```

### Картинки

| Поле | Файл |
|---|---|
| Store icon (128×128) | `extension/icons/128.png` |
| Screenshots (1280×800), русский | `images/screenshot-1-options-ru.png`, `images/screenshot-2-popup-ru.png`, `images/screenshot-3-rules-ru.png` |
| Screenshots (1280×800), English | `images/screenshot-1-options-en.png`, `images/screenshot-2-popup-en.png`, `images/screenshot-3-rules-en.png` |
| Small promo tile (440×280) | `images/promo-small-440x280.png` |

## Конфиденциальность (Privacy practices)

**Single purpose description:**

```
Redirects the user from web addresses they specify to other addresses they specify, according to a list of rules the user manages in the extension's options page.
```

**Обоснование разрешений (Permission justification):**

| Разрешение | Текст |
|---|---|
| `declarativeNetRequest` | `Used to redirect top-level page loads from the URLs in the user's rules to the target URLs. Chrome performs the redirect itself; the extension does not read requests or page content.` |
| `storage` | `Stores the user's list of redirect rules and the on/off switch in chrome.storage.sync.` |
| `activeTab` | `When the user clicks the toolbar icon, reads the current tab's URL so it can be prefilled as the source of a new rule.` |
| Host permissions (`optional_host_permissions: *://*/*`) | `Optional. Requested at runtime only for the sites the user adds to their rules — Chrome requires host access to the source URL to perform a declarativeNetRequest redirect. Access to all sites is requested only if the user creates a regular-expression rule. Unused access is released when rules are deleted. The extension never reads or modifies page content.` |

**Remote code:** No, I am not using remote code.

**Data usage:** не отмечайте ни одного типа данных — расширение ничего не собирает.
Отметьте все три подтверждения (не продаю данные третьим лицам; не использую их для целей,
не связанных с единственной функцией; не использую для оценки кредитоспособности).

**Privacy policy URL:**

```
https://github.com/jfoboss/chrome-redirector/blob/main/store/PRIVACY.md
```
