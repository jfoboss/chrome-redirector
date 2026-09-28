[Русский](README.md) | **English**

# Site Redirect Rules

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ibkaigdgfdnicobpfdfgjnpnebghbhhb?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ibkaigdgfdnicobpfdfgjnpnebghbhhb)
[![Release](https://img.shields.io/github/v/release/jfoboss/chrome-redirector?sort=semver)](https://github.com/jfoboss/chrome-redirector/releases/latest)
[![Release date](https://img.shields.io/github/release-date/jfoboss/chrome-redirector)](https://github.com/jfoboss/chrome-redirector/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/jfoboss/chrome-redirector/ci.yml?branch=main&label=CI)](https://github.com/jfoboss/chrome-redirector/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License](https://img.shields.io/github/license/jfoboss/chrome-redirector)](LICENSE)

A Chrome extension with your own list of redirects: open a URL and the browser goes straight to the page you actually need.

| From                          | To                                  |
| ----------------------------- | ----------------------------------- |
| `https://example.com/`        | `https://example.com/console`       |
| `https://example.com/welcome` | `https://example.com/console`       |
| `https://example.org/`        | `https://app.example.org/dashboard` |

The interface is available in English and Russian (follows the browser language).

## Why

Many work tools greet everyone on their home page the same way — the first-time visitor and the person who uses the service every day. Cloud consoles, issue trackers, CI, monitoring, internal portals: the root of the domain is a marketing landing page, and the actual work starts behind a “Sign in”, “Console” or “Dashboard” button.

That is right for a new visitor. For an engineer who opens the service ten times a day, it is an extra page and an extra click every single time. The path never changes: type the address or pick it from the address bar suggestions, wait for the landing page, click the button, wait for the page you need.

Some services solve this themselves: GitHub shows a signed-in user their dashboard instead of the marketing page. Many don't, and site owners may have their reasons — the home page is a marketing channel for them, and that is their call. The extension solves it on your side: you decide where to go, and nothing changes for the site or its other visitors.

## How it helps

- **Straight to work.** The address you type out of habit takes you where you actually work: the console, the task board, the right dashboard.
- **Catches every way in.** A bookmark only helps if you open the service through it. A rule works however you get there: typing the address, an address bar suggestion, a link from chat or email.
- **Works with redirect chains.** If the site itself redirects `/` to `/welcome`, a rule for `/welcome` still fires.
- **Keeps the landing page reachable.** An “Exact URL” rule fires only on that page — the rest of the site (pricing, docs, news) opens as usual. Any rule can be switched off with its checkbox, and all of them with the master switch.
- **Same rules on every computer.** The rule list syncs across your Chrome browsers. Site access is granted by Chrome on each computer separately: on a new computer the icon shows “!” — open the rule list and click “Save”.
- **Easy to share with your team.** Export the rules to JSON and import them back — handy for handing colleagues a set of rules for shared work tools. Imported rules are added to yours and start working after you click “Save”. If you already have a rule for the same address, the extension shows the matches and asks which ones to replace; exact copies are skipped.
- **Sees nothing.** Chrome performs the redirect itself; the extension never sees your history or page content (see “Privacy”).

## Examples

| Situation | From | To | Rule type |
| --- | --- | --- | --- |
| A cloud platform shows a landing page; the console is on another path | `https://cloud.example.com/` | `https://cloud.example.com/console` | Exact URL |
| The site itself sends you from the home page to a welcome page | `https://cloud.example.com/welcome` | `https://cloud.example.com/console` | Exact URL |
| Marketing on one domain, the app on another | `https://example.org/` | `https://app.example.org/dashboard` | Exact URL |
| The wiki opens on the general home page, but you need your team's space | `https://wiki.example.com/` | `https://wiki.example.com/spaces/TEAM` | Exact URL |
| A service has moved: any page of the old address goes to the new home page | `https://old-portal.example.com/` | `https://portal.example.com/` | Whole site |
| A service has moved, and old links should lead to the same pages | `^https://old-portal\.example\.com/(.*)` | `https://portal.example.com/\1` | Regular expression |
| Docs open on the latest version, but you work with a specific one | `^https://docs\.example\.com/latest/(.*)` | `https://docs.example.com/v2/\1` | Regular expression |

## Privacy

- The extension is built on `declarativeNetRequest` (Manifest V3): Chrome itself matches URLs against the rules and performs the redirect. The extension never receives your history, the URLs of the pages you open, or their content. The only exception: when you click the extension icon yourself, it learns the current tab's URL to suggest a rule for it.
- Access is requested only for the sites in the “From” column and is released once no rules need a site. The exception is regular-expression rules: they need access to all sites.
- Rules are stored in your browser's `chrome.storage.sync`. If Chrome sync is on, they are synced through your Google account by Chrome itself. Nothing is sent to the extension's developer.

[Privacy policy](store/PRIVACY.md).

## Installation

- **From the Chrome Web Store** — open the [extension's page](https://chromewebstore.google.com/detail/ibkaigdgfdnicobpfdfgjnpnebghbhhb) and click “Add to Chrome”.
  Nothing to build; updates arrive automatically.
- **Without the store** — download the ZIP from the [latest release](https://github.com/jfoboss/chrome-redirector/releases/latest), unpack it and load the folder as described below. You will have to update it manually.
- **For development:** `chrome://extensions` → turn on “Developer mode” →
  “Load unpacked” → select the `extension/` folder.

## Usage

- Extension icon → **Redirect this URL…** — opens the rule list with a new row whose “From” is already set to the current page's URL (without the `?` parameters). Fill in “To” and click “Save”.
- Icon → **All rules** — the list: order, on/off, JSON import/export.
- When you save, the extension first explains which sites need access and why, then Chrome asks to “Read and change your data” on them — that is how Chrome words any site access. Without it
  redirects cannot work. Access to sites that no rule needs any more is released automatically.
- The icon shows the state: a number — how many rules are working; **!** — some rules have no access to their site (open the list and click “Save”); **off** — redirects are turned off; **err** — Chrome rejected the rules (details in the icon's tooltip).

Rule types:

- **Exact URL** — same domain and path; a trailing slash and `?…` parameters are ignored, http and https are treated the same.
- **Whole site** — any page on the domain.
- **Starts with** — the URL starts with the given one. It is a plain text match: a rule for `https://example.com/docs` also catches `/docs-old`; add a slash to limit it to the section: `/docs/`.
- **Regular expression** — RE2 syntax; use `\1`, `\2`… in “To”.
  Requires access to all sites.

Domains are matched exactly: `example.com` and `www.example.com` are different addresses, and subdomains are not included. If a site opens under both names, add two rules.

If the site redirects by itself (e.g. `/` → `/welcome`), a rule for `/welcome` still fires:
the redirect applies to every request in the chain. A rule that redirects to itself
cannot be saved.

## Limits

- **About 100 KB for all rules** — Chrome's sync limit. That is roughly 600–700 rules with ordinary URLs.
- **At most 1000 enabled rules** — Chrome's limit on the number of rules per extension.
- **One rule — at most ~7 KB** (“From” and “To” together).

If a limit is exceeded, the extension won't save the list and will tell you what is wrong; the rules saved earlier keep working.

## Development

```sh
npm install                      # script dependencies (Playwright)
npm test                         # unit tests
npm run build                    # ZIP for the Chrome Web Store → dist/ (requires the zip utility)
npx playwright install chromium  # once, for the next command
npm run store-images             # store screenshots and promo tile → store/images/
python3 scripts/make-icons.py    # redraw the icons
```

UI strings live in `extension/_locales/{ru,en}/messages.json`.

## Versioning and releases

Versions follow [SemVer](https://semver.org/); releases are made by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org/):

| PR title / commit | Version change |
|---|---|
| `fix: …` | patch: 1.3.0 → 1.3.1 |
| `feat: …` | minor: 1.3.0 → 1.4.0 |
| `feat!: …` or `BREAKING CHANGE:` in the body | major: 1.3.0 → 2.0.0 |
| `docs:`, `ci:`, `chore:`, `refactor:`, `test:` | no release |

How it works:

1. A PR is merged into `main`. CI checks that the PR title follows Conventional Commits (with squash merge it becomes the commit message).
2. `release.yml` keeps a `chore(main): release X.Y.Z` PR open: it bumps the version in `extension/manifest.json` and `version.txt` and extends [`CHANGELOG.md`](CHANGELOG.md). New commits on `main` update that PR.
3. Merging the release PR is the release: tag `vX.Y.Z`, a [GitHub Release](https://github.com/jfoboss/chrome-redirector/releases) with the changelog and the ZIP attached.
4. The ZIP from the release is uploaded to the Chrome Web Store by hand — see [`store/PUBLISHING.md`](store/PUBLISHING.md) (in Russian).

Don't edit the version by hand. To force a specific one, push an empty commit with `Release-As: X.Y.Z` in the body.

## License

MIT — see [LICENSE](LICENSE).
