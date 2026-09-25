// Генерирует картинки для карточки в Chrome Web Store: store/images/*.png
// Запуск: npm run store-images (нужен Chromium для Playwright).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ext = path.join(root, 'extension');
const out = path.join(root, 'store', 'images');
fs.mkdirSync(out, { recursive: true });

const RULES = [
  { match: 'exact', from: 'https://example.com', to: 'https://example.com/console' },
  { match: 'exact', from: 'https://example.com/welcome', to: 'https://example.com/console' },
  { match: 'domain', from: 'https://old-docs.example.org', to: 'https://docs.example.org/' },
  { match: 'regex', from: '^https://example\\.net/wiki/(.*)', to: 'https://wiki.example.net/\\1' },
].map((r, i) => ({ id: `r${i}`, enabled: true, ...r }));

const TEXT = {
  ru: { popup: 'Правило для открытой страницы — в один клик', options: 'Весь список под рукой' },
  en: { popup: 'Add a rule for the current page in one click', options: 'All your redirects in one place' },
};

// Расширение без запросов доступа: для картинок делаем вид, что доступ уже выдан.
const stubs = () => {
  chrome.permissions.contains = async () => true;
  chrome.tabs.query = async () => [{ url: 'https://example.com/welcome' }];
};

async function launch(lang) {
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, `--lang=${lang}`],
    env: { ...process.env, LANGUAGE: lang, LANG: `${lang}.UTF-8` },
    locale: lang,
  });
  const ours = (w) => w.url().endsWith('/background.js');
  const sw = ctx.serviceWorkers().find(ours) ?? await ctx.waitForEvent('serviceworker', { predicate: ours });
  // Сразу после запуска у воркера может ещё не быть API расширения — ждём.
  while (!await sw.evaluate(() => !!globalThis.chrome?.storage)) await new Promise((r) => setTimeout(r, 100));
  await sw.evaluate((rules) => chrome.storage.sync.set({ rules, enabled: true }), RULES);
  await ctx.addInitScript(stubs);
  for (const p of ctx.pages()) await p.close();
  return { ctx, base: `chrome-extension://${new URL(sw.url()).host}` };
}

async function newPage(ctx, width, height) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
  return page;
}

// Оформляет снимок интерфейса в кадр нужного размера с подписью.
async function frame(ctx, { width, height, caption, image, imageWidth }) {
  const page = await newPage(ctx, width, height);
  const src = `data:image/png;base64,${image.toString('base64')}`;
  await page.setContent(`<!doctype html><body style="margin:0;width:${width}px;height:${height}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;background:linear-gradient(135deg,#1e3a8a,#2563eb);font:600 40px system-ui,sans-serif;color:#fff">
    <div>${caption}</div>
    <img src="${src}" style="width:${imageWidth}px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
  </body>`);
  const buf = await page.screenshot();
  await page.close();
  return buf;
}

for (const lang of ['ru', 'en']) {
  const { ctx, base } = await launch(lang);

  const options = await newPage(ctx, 1280, 800);
  await options.goto(`${base}/options.html`);
  await options.locator('details').evaluate((d) => { d.open = true; });
  await options.waitForTimeout(300);
  await options.screenshot({ path: path.join(out, `screenshot-1-options-${lang}.png`) });
  const optionsShot = await options.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 430 } });

  const popup = await newPage(ctx, 608, 400);
  await popup.goto(`${base}/popup.html`);
  await popup.evaluate(() => { document.documentElement.style.zoom = 2; });
  await popup.waitForTimeout(300);
  const popupShot = await popup.screenshot({ clip: await popup.locator('body').boundingBox().then((b) => ({ x: 0, y: 0, width: 608, height: Math.ceil(b.height + b.y * 2) })) });

  fs.writeFileSync(path.join(out, `screenshot-2-popup-${lang}.png`),
    await frame(ctx, { width: 1280, height: 800, caption: TEXT[lang].popup, image: popupShot, imageWidth: 608 }));
  fs.writeFileSync(path.join(out, `screenshot-3-rules-${lang}.png`),
    await frame(ctx, { width: 1280, height: 800, caption: TEXT[lang].options, image: optionsShot, imageWidth: 1100 }));

  if (lang === 'ru') {
    const icon = fs.readFileSync(path.join(ext, 'icons', '128.png')).toString('base64');
    const tile = await newPage(ctx, 440, 280);
    await tile.setContent(`<!doctype html><body style="margin:0;width:440px;height:280px;display:flex;align-items:center;justify-content:center;gap:12px;background:linear-gradient(135deg,#1e3a8a,#2563eb);font:700 30px/1.15 system-ui,sans-serif;color:#fff">
      <img src="data:image/png;base64,${icon}" width="128" height="128"><div>Site Redirect<br>Rules</div></body>`);
    await tile.screenshot({ path: path.join(out, 'promo-small-440x280.png') });
  }
  await ctx.close();
}
console.log(fs.readdirSync(out).join('\n'));
