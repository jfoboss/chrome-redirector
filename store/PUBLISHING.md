# Как опубликовать в Chrome Web Store

## Один раз: аккаунт разработчика

1. Откройте https://chrome.google.com/webstore/devconsole и войдите в Google-аккаунт,
   от имени которого будет опубликовано расширение.
2. Примите соглашение и оплатите регистрацию — **$5 один раз**.
3. В **Account** укажите и подтвердите контактный email. Статус торговца (trader) —
   «не торговец» (non-trader): расширение бесплатное.

## Первая публикация

1. **Соберите пакет.** Любой способ:
   - скачайте ZIP из [последнего релиза на GitHub](https://github.com/jfoboss/chrome-redirector/releases/latest);
   - или локально: `npm run build` → `dist/site-redirect-rules-<версия>.zip`.
2. В Developer Dashboard нажмите **New item** и загрузите ZIP.
3. **Store listing** — заполните по [`listing.md`](listing.md): описание, категория, иконка,
   скриншоты, промо-картинка. Английскую версию добавьте через выбор языка вверху страницы.
4. **Privacy** — single purpose, обоснования разрешений, «No remote code», данные не собираются,
   ссылка на политику — всё есть в [`listing.md`](listing.md).
5. **Distribution:**
   - **Visibility:** `Public` — видно всем в поиске; `Unlisted` — только по прямой ссылке.
   - **Regions:** All regions.
6. Нажмите **Submit for review**. Проверка обычно занимает от нескольких часов до нескольких дней;
   узкие разрешения (доступ только к нужным сайтам) её ускоряют.
7. После одобрения появится ссылка вида
   `https://chromewebstore.google.com/detail/<id>` — её и отправляйте людям.
   Установка: открыть ссылку → «Установить в Chrome».

## Обновления

Смёржите release PR `chore(main): release X.Y.Z`, который держит открытым release-please
(подробнее — в README, раздел «Версионирование и релизы»). GitHub создаст релиз и приложит к нему ZIP.

- **Если настроена [автоматическая публикация](#автоматическая-публикация)** — больше ничего делать
  не нужно: GitHub сам загрузит ZIP в магазин и отправит на проверку. Итог виден в сводке запуска
  [Release](https://github.com/jfoboss/chrome-redirector/actions/workflows/release.yml).
- **Вручную:** скачайте ZIP со [страницы релиза](https://github.com/jfoboss/chrome-redirector/releases/latest),
  затем в Dashboard: ваше расширение → **Package** → **Upload new package** → **Submit for review**.

Магазин не примет одну и ту же версию дважды — release-please поднимает её сам.
Пользователи получат обновление автоматически в течение нескольких часов после одобрения.

## Автоматическая публикация

GitHub загружает ZIP через [Chrome Web Store API](https://developer.chrome.com/docs/webstore/api)
от имени **сервисного аккаунта** Google Cloud — отдельной «учётки для робота» с ключом.
Это надёжнее OAuth-токена от вашего аккаунта: тот при неопубликованном OAuth-приложении
перестаёт работать через 7 дней. Настраивается один раз.

1. **Включите API.** [Google Cloud Console](https://console.cloud.google.com/) → создайте проект
   (например, `chrome-redirector-publish`) → в поиске «Chrome Web Store API» → **Enable**.
2. **Создайте сервисный аккаунт.** **IAM & Admin → Service accounts → Create service account**.
   Имя любое, роли не нужны — пропустите шаг с правами.
3. **Выпустите ключ.** Откройте созданный аккаунт → **Keys → Add key → Create new key → JSON**.
   Скачается файл `….json` — это и есть ключ. Храните его как пароль.
   Если Google пишет, что создание ключей запрещено политикой (`iam.disableServiceAccountKeyCreation`),
   значит проект создан внутри организации — создайте проект без организации или снимите эту политику.
4. **Дайте аккаунту доступ к магазину.** [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   → **Account** → раздел **Service accounts** → добавьте email сервисного аккаунта
   (вида `…@….iam.gserviceaccount.com`, есть в JSON-файле в поле `client_email`).
   Там же, в **Account**, скопируйте **Publisher ID**.
   Для публикации через API у Google-аккаунта должна быть включена двухэтапная аутентификация.
5. **Передайте всё GitHub.** Репозиторий → **Settings → Secrets and variables → Actions**:
   - вкладка **Secrets** → **New repository secret**: `CWS_SERVICE_ACCOUNT_KEY` — всё содержимое JSON-файла;
   - вкладка **Variables** → **New repository variable**: `CWS_PUBLISHER_ID` — Publisher ID.

   После этого JSON-файл с компьютера лучше удалить.

Необязательные переменные (**Variables**):

| Переменная | Что делает |
|---|---|
| `CWS_PUBLISH` = `false` | Только загрузить пакет, на проверку не отправлять — отправите вручную из Dashboard |
| `CWS_EXTENSION_ID` | ID расширения, если он поменяется (по умолчанию `ibkaigdgfdnicobpfdfgjnpnebghbhhb`) |

Проверить настройку можно на ближайшем релизе: в запуске **Release** шаг **Chrome Web Store**
покажет «Пакет загружен… Отправлено на проверку». Пока секрета нет, шаг просто пишет,
что публикация пропущена, и релиз на GitHub выходит как обычно.

Отключить автоматическую публикацию — удалить секрет `CWS_SERVICE_ACCOUNT_KEY`. Если ключ утёк —
удалите его в Google Cloud Console (**Keys**) и выпустите новый.

## Если отклонили

Google присылает письмо с причиной. Чаще всего это текст обоснования разрешений или
расхождение описания с функциональностью — поправьте поле в Dashboard и отправьте снова.
