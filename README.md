# KabuK Exchange — Marketing Website

A static marketing website for **KabuK Exchange**, the global travel distribution platform by **KabuK Style Inc.** It introduces the platform, explains who it serves, and gives hotels and partners a way to get in touch.

Built with **plain HTML, CSS, and vanilla JavaScript** plus a couple of **JSON config files**. No framework, no build step, no npm.

> ⚠️ **Internal review build.** URLs, emails, and partner data marked `PLACEHOLDER` are examples. Replace them before any public launch. This site is *inspired by* enterprise travel-tech sites for tone and structure only — it contains no copied text, assets, code, or branding from any third party.

---

## Contents

| File | Purpose |
|------|---------|
| `index.html` | Homepage → served at `/` |
| `hotels/index.html` | For Hotels → `/hotels/` |
| `partners/index.html` | For Partners → `/partners/` (anchored: `#demand-partners`, `#connectivity-partners`, `#supply-partners`) |
| `platform/index.html` | Platform → `/platform/` (anchored sections for each capability) |
| `about/index.html` | About Us → `/about/` |
| `become-a-partner/index.html` | Lead form for OTAs, agencies, wholesalers, suppliers, tech partners → `/become-a-partner/` |
| `link-your-property/index.html` | Lead form for hotels and hotel groups → `/link-your-property/` |
| `privacy/index.html` / `terms/index.html` | Placeholder legal pages → `/privacy/`, `/terms/` |
| `404.html` | Styled not-found page |
| `styles.css` | All styling and animations |
| `script.js` | Behavior: config loading, i18n, nav, animations, ecosystem filter, forms |
| `i18n/` | Copy for each language as separate JSON files + `languages.json` manifest (see `i18n/README.md`) |
| `partners.json` | Editable ecosystem directory shown on the homepage |
| `site-config.json` | Editable settings: login URL, form emails, footer/company links |
| `favicon.svg` | Browser-tab icon |
| `og-image.png` / `og-image.svg` | Social share image (1200×630) + its editable source |
| `robots.txt` / `sitemap.xml` | Search-engine hints (PLACEHOLDER domain) |
| `partials/header.html`, `partials/footer.html` | Single source of truth for the shared header & footer |
| `build.py` | Optional helper that syncs the partials into every page (see below) |

---

## Clean URLs (no `.html`)

Each page lives in its own folder as `index.html`, so it's served at a clean path with
no file extension:

| Folder | URL |
|--------|-----|
| `index.html` | `/` |
| `hotels/index.html` | `/hotels/` |
| `about/index.html` | `/about/` |
| … | … |

This works on any static host (and the local server below) with no configuration.
Because pages sit at different folder depths, **all internal links and asset references
are root-relative** (`/styles.css`, `/hotels/`, `/i18n/…`) — so they resolve the same from
every page. This assumes the site is served from a domain root (all the recommended hosts
do). If you ever want to drop the trailing slash too (`/hotels` instead of `/hotels/`),
Netlify/Vercel/Cloudflare each have a "pretty URLs / trailing slash" toggle.

To **add a page**: create `your-page/index.html` (copy an existing page as a starting
point), link to it as `/your-page/`, and run `python3 build.py` to drop in the shared
header/footer. Add it to `sitemap.xml` and, if it should appear in the footer, to
`site-config.json`.

## Run it locally

The pages load `site-config.json` and `partners.json` with `fetch()`. Browsers block `fetch()` from `file://` for security, so **open the site through a local web server**, not by double-clicking the HTML file.

Pick any one of these (run from inside this folder):

```bash
# Python 3 (pre-installed on macOS/Linux)
python3 -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then open <http://localhost:8080>.

> If you open a page directly as `file://`, the layout still renders, but the footer link lists, the Partner Login URL, and the ecosystem directory will be empty because the JSON files can't be fetched.

---

## How to edit content (no coding required)

### Partner / hotel / connection cards (ecosystem section)

Edit **`partners.json`**.

- `categories` — the filter buttons. Each has an `id` and a `label`. Keep `all` first.
- `entries` — one object per card:
  ```json
  {
    "name": "Sample City Hotels KK",
    "category": "hotel-group",     // must match a category id above
    "region": "Japan",
    "description": "Short description shown on the card.",
    "tag": "Supply"                 // small pill label
  }
  ```
Add, remove, or reorder entries freely. The homepage rebuilds the directory and filters automatically.

### Footer links

Edit **`site-config.json`**:

- `footerLinks` — the **KabuK Exchange** column (internal pages).
- `companyLinks` — the **KabuK Style Inc.** column (KabuK Style, HafH, News, Contact, Careers).

Each link is `{ "label": "...", "href": "..." }`. Links starting with `http` open in a new tab automatically.

**Footer icon variant (A/B):** the KabuK Style Inc. column can render as icon buttons
instead of text links. Set `"footerCompanyStyle": "icons"` (default is `"text"`) in
`site-config.json`. Each `companyLinks` entry takes an optional `"icon"` key
(`building`, `bed`, `newspaper`, `mail`, `briefcase`, or any key in `ICON_PATHS`);
the label is used as the accessible tooltip/aria-label.

### Partner Login URL (admin console)

Edit **`site-config.json`** → `adminConsoleUrl`. Every "Partner Login" button on every page points there.

### Form email targets

Edit **`site-config.json`** → `leadRouting`:

```json
"leadRouting": {
  "partnerEmail": "partnerships@kbkx.example.com",  // Become a Partner form
  "hotelEmail":   "supply@kbkx.example.com",        // Link Your Property form
  "generalEmail": "hello@kbkx.example.com"          // fallback
}
```

No JavaScript editing needed. Each form declares which mailbox it uses via a `data-route` attribute (`partnerEmail` / `hotelEmail`) that maps to these keys.

### Switching forms from email to an API later

Edit **`site-config.json`**:

```json
"formMode": "api",
"apiEndpoint": "https://api.kbkx.example.com/v1/leads"
```

- `"mailto"` (default) — the form opens the user's email client with the details pre-filled.
- `"api"` — the form POSTs JSON (`{ form, fields }`) to `apiEndpoint` instead.

The form-handling code already supports both paths, so this is a config-only change.

---

## Header navigation

The top nav is consolidated into an enterprise-style structure, all defined in
`partials/header.html` (run `python3 build.py` after editing to sync every page):

- **Solutions** and **Platform** are dropdown menus (`.has-dropdown` with a
  `<button class="dropdown-toggle">` and a `.dropdown` panel of `.dropdown-item`
  links, each with a `.di-title` and `.di-desc`).
- **Ecosystem** (`/#ecosystem`) and **About Us** (`/about/`) are plain links.
- The three CTAs — **Partner Login** (→ `adminConsoleUrl`), **Become a Partner**
  (→ `/become-a-partner/`), **Link Your Property** (→ `/link-your-property/`) — stay
  visible on the right and are never hidden in a dropdown.

Dropdown behavior (`initDropdowns` in `script.js`): click/tap to toggle, hover and
keyboard focus open it on desktop, `Escape` closes and restores focus, clicking outside
closes, and `aria-expanded` / `aria-haspopup` / `role="menu"` keep it screen-reader
friendly. On mobile everything collapses into the hamburger and the dropdowns expand
inline. Dropdown labels and descriptions are localized (keys `nav.*`, `sol.*`, `plat.*`
in the `i18n/` files).

## Editing the shared header & footer

The header and footer are identical on every page. Their single source of truth is
`partials/header.html` and `partials/footer.html`. After editing either partial, run:

```bash
python3 build.py
```

This copies the partials into every `*.html` page (idempotent, safe to re-run). The
site still ships as plain static HTML — `build.py` is the *only* optional tooling and
is **not** required to run or deploy the site; it just saves you editing the same
markup in nine files. The active nav link is highlighted at runtime by `script.js`
(`markActiveNav`), so the header markup can stay identical everywhere.

New top-level pages automatically pick up the shared header/footer the next time you
run `build.py`, as long as they contain a `<header class="site-header">…</header>` and
`<footer class="site-footer">…</footer>` block for it to replace.

## Fonts

The site uses a deliberate **native system-font stack** (see `--font` in `styles.css`)
with CJK and Arabic fallbacks — no web font is downloaded, so there are zero external
requests and text paints instantly. To adopt a brand web font later, self-host the
files (to keep the project asset-free) and prepend the family to `--font`.

## Color themes

A palette button in the header lets visitors switch between color themes — **Ocean**
(default blue), **Sky** (lighter blue), **Sunset** (red), **Amber** (orange), and
**Forest** (green). The choice is saved in `localStorage` (`kbkx-theme`).

Each theme only overrides a handful of CSS custom properties (accent colors + the
dark-base navy tokens + hero glow) under `:root[data-theme="…"]` in `styles.css`.
To tweak a theme, edit those tokens; to add one, add a `:root[data-theme="mytheme"]`
block and an entry to the `THEMES` array in `script.js`. To change the default,
reorder `THEMES` (the CSS default — no attribute — is "ocean").

Note: the two decorative network graphics (the hero map and the embedded
partnership diagram) use fixed blues in their SVG source and do **not** retint with
the theme — intentional, so the diagrams stay legible. Everything else (accents,
buttons, headings, gradients, wordmark accent) follows the selected theme.

## Cookie / analytics consent

A lightweight consent banner appears on first visit. Analytics only load **after** the
visitor clicks Accept; the choice is stored in `localStorage` (`kbkx-cookie-consent`).
There is no analytics provider wired in yet — drop your snippet inside the
`loadAnalytics()` function in `script.js` and it will run only with consent.

## Structured data

`index.html` and `about.html` include JSON-LD (`Organization` + `WebSite`) for richer
search results. Update the URLs there (and the PLACEHOLDER domain) before launch.

## Homepage connectivity diagram

The "One hub, connected to your ecosystem" section on the homepage is an inline SVG
(supply → hub → partners flow) living in `index.html`, styled by the `.kx-*` rules in
`styles.css`. Its ids and classes are `kx-`namespaced so they can't collide with the
site's `.card`/`.node` styles. To edit node labels or positions, edit the SVG markup
directly. It scrolls horizontally on narrow screens (so labels stay legible), and all
of its motion — the flowing dashes, hub rings, and traveling dots — is disabled under
`prefers-reduced-motion`. Note: the labels *inside* the diagram are English only; the
surrounding heading, subtitle, and legend are localized.

## Icons, forms, and social/SEO

- **Icons** — card icons are inline SVGs injected by `script.js` from the `ICON_PATHS` map. In the HTML a card just declares `<div class="card-icon" data-icon="globe"></div>`. To change an icon, edit the `data-icon` value; to add one, add a new entry to `ICON_PATHS`.
- **Spam protection** — both forms include a hidden honeypot field (`name="_hp"`). If it's filled (bots do this), the submission is silently dropped and the field is never included in the email. Field names starting with `_` are treated as internal and excluded from the payload.
- **Consent** — both forms have a required consent checkbox linking to `privacy.html`. Replace that placeholder page with a legally reviewed policy before collecting real data.
- **Social share & SEO** — every page sets a favicon (`favicon.svg`), Open Graph / Twitter tags, and a canonical URL. The share image is `og-image.png` (1200×630). To regenerate it after editing `og-image.svg`, use any SVG→PNG tool, e.g. `rsvg-convert -w 1200 -h 630 og-image.svg -o og-image.png` or `cairosvg og-image.svg -o og-image.png -W 1200 -H 630`. **Update the PLACEHOLDER domain** (`www.kbkx.example.com`) in every page's canonical/OG tags, in `sitemap.xml`, and in `robots.txt` before launch.

## Localization

Supported languages: **English, Japanese, Korean, Traditional Chinese (Taiwan), Arabic**.

All copy lives in **separate JSON files, one per language, in the [`i18n/`](i18n/) folder** —
so content teams can edit each language independently without touching code. See
[`i18n/README.md`](i18n/README.md) for the full editor guide.

```
i18n/
  languages.json    ← the list of languages (edit to add/remove one)
  en.json           ← English (source of truth)
  ja.json ko.json zh-TW.json ar.json
  _template.json    ← copy this to start a new language
```

How it works:

- The language selector lives in the header on every page.
- The chosen language is saved in `localStorage` (`kbkx-lang`) and restored on the next visit. If none is saved, the browser language is matched where possible.
- `script.js` fetches `i18n/languages.json`, then the JSON for the active language (plus English as a fallback), and swaps text via `data-i18n` attributes:
  - `data-i18n="key"` → replaces text content
  - `data-i18n-placeholder="key"` → replaces an input placeholder
  - `data-i18n-aria-label="key"` → replaces an aria-label
- **Missing/blank keys fall back to English**, so a partially translated language never breaks the page — it just shows English for the gaps.
- **Arabic** switches the whole page to right-to-left via `dir="rtl"` on `<html>`; the CSS uses logical properties so the layout mirrors correctly.

### Editing copy

Open the relevant `i18n/<code>.json` file and change the **values** (never the keys). Save,
refresh — done, no build step. (Because the files are fetched, view the site through a
local server, not `file://`.)

### Adding a language

1. Copy `i18n/_template.json` → `i18n/<code>.json` (e.g. `fr.json`).
2. Translate the values.
3. Add one line to `i18n/languages.json`: `{ "code": "fr", "label": "Français", "dir": "ltr" }`
   (use `"dir": "rtl"` for right-to-left languages).

That's the whole process — no code changes. Full details in [`i18n/README.md`](i18n/README.md).

### Coverage & quality

The homepage is fully localized (including card copy); interior pages have their hero,
headings, and intros localized, with some longer body paragraphs still English. Non-English
text is **draft quality** and should be reviewed by a native speaker.

---

## Accessibility & performance notes

- Semantic HTML (`header`, `nav`, `main`, `section`, `footer`), skip link, visible focus styles, `aria-current` on the active nav item, `aria-live` on the ecosystem grid and form status.
- Animations respect `prefers-reduced-motion` — connection-line motion, hub pulses, and scroll reveals are disabled for users who ask for reduced motion.
- No external fonts, scripts, or assets — everything is local, so there are no third-party requests and the site works offline once served.

---

## Deploying

All hosts below serve static files. There is no build command.

### Netlify
- Drag-and-drop this folder onto <https://app.netlify.com/drop>, **or** connect the repo with:
  - **Build command:** *(leave empty)*
  - **Publish directory:** `.` (this folder)

### Vercel
- Import the repo. Framework preset: **Other**. Build command empty, output directory `.`
- Or run `npx vercel` from this folder and accept the defaults.

### Cloudflare Pages
- Create a Pages project from the repo.
  - **Build command:** *(empty)*
  - **Build output directory:** `/` (this folder)

### AWS S3 + CloudFront
```bash
aws s3 sync . s3://YOUR_BUCKET --delete
# Enable static website hosting on the bucket, index document = index.html
# Put CloudFront in front for HTTPS + caching, then invalidate on deploy:
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```
Make sure `.json` files are served with `Content-Type: application/json` (S3 does this by extension automatically).

**Clean-URL note for S3/CloudFront:** the folder structure means requests like `/hotels/`
must resolve to `/hotels/index.html`. The S3 *website* endpoint does this automatically
(it appends `index.html` to any path ending in `/`). If you serve S3 through CloudFront via
the REST/OAC origin instead, add a small CloudFront Function (viewer-request) that appends
`index.html` to directory paths. Netlify, Vercel, and Cloudflare Pages handle this for you.

---

## Why this does **not** need React

- The site is **content-first and mostly static** — marketing copy, a few cards, two forms. There is no logged-in state, no client-side routing, no shared realtime data.
- Vanilla JS handles the only interactive bits (language switch, nav toggle, scroll reveals, ecosystem filter, form submission) in a small, dependency-free file.
- **Benefits:** near-instant load, no build pipeline to maintain, trivial hosting, and config files a non-engineer can edit directly. Fewer moving parts means fewer things to break.

## When it *would* make sense to move to React / Next.js later

Consider a framework once the site grows past a brochure:

- **Many pages sharing layout** — duplicating the header/footer across files becomes error-prone; components/partials fix that. (Today the shared markup is copied into each HTML file.)
- **A real CMS or dynamic content** — partner directories, blog/news, or localized content pulled from an API or headless CMS.
- **Authenticated or personalized areas** — a partner dashboard, gated content, account state.
- **SEO at scale with dynamic data** — Next.js gives server rendering / static generation per route.
- **A component library and design system** shared with the product app.

A reasonable migration path: keep this content, move shared header/footer into components, port `translations.js` to an i18n library (e.g. `next-intl`), and read `site-config.json` / `partners.json` at build time or from a CMS.
