# VinFast CarOn Demo — static site

A lightweight, responsive demo of a single-showroom VinFast dealer site. Built with Astro, deployed as static files to GitHub Pages, with an optional Google Sheets backend for form submissions and key events.

> **Demo only.** Store name, address, hotline, Zalo, prices, specs, and news are placeholders. Images come from the supplied sample and are for demo use only. Replace them with authorized customer assets before launch.

## Stack

- **Astro 7** static output — no UI framework runtime.
- One CSS file with design tokens, vanilla TypeScript for interactions.
- Self-hosted Mulish font (Vietnamese + Latin subsets).
- GitHub Pages via GitHub Actions.
- Google Apps Script → Google Sheets for leads and events.
- Zalo deep link bubble (placeholder); no third-party chat script on first paint.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

Build and preview the static output:

```bash
npm run build
npm run preview
```

## Demo mode

If no endpoint is configured, forms validate normally and save to `localStorage` under `vf_demo_leads`. Events are stored under `vf_demo_events`. A success message explains that the data is local-only.

This is intentional so the demo works before the Sheet is ready.

## Connect Google Sheets

1. Follow [`apps-script/README.md`](apps-script/README.md).
2. Deploy `apps-script/Code.gs` as a Web App.
3. Add the `/exec` URL as a GitHub repository variable:

| Variable | Required | Purpose |
|---|---|---|
| `PUBLIC_SHEET_ENDPOINT` | For direct Apps Script | Web App `/exec` URL |
| `PUBLIC_API_ENDPOINT` | Optional, recommended | Worker/Function proxy with real JSON responses |
| `PUBLIC_EVENT_ENDPOINT` | Optional | Separate event endpoint; defaults to the Sheet endpoint |

The workflow passes these variables into the Astro build. Vite inlines `PUBLIC_*` values into the client bundle, so never put secrets there.

### Direct Apps Script vs proxy

- **Direct** (`PUBLIC_SHEET_ENDPOINT`): the browser sends `text/plain` JSON with `mode: "no-cors"`. Apps Script writes the row, but the browser cannot read the response. The UI shows an optimistic success message.
- **Proxy** (`PUBLIC_API_ENDPOINT`): a Cloudflare Worker/Pages Function validates, rate-limits, optionally verifies Turnstile, signs the request, and forwards it to Apps Script. Use this for production.

## Deploy to GitHub Pages

1. Create a GitHub repository and push the contents of this `site/` folder as the repository root.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Add repository variables under **Settings → Secrets and variables → Actions → Variables**:
   - `PUBLIC_SHEET_ENDPOINT` (optional for the demo)
   - `PUBLIC_API_ENDPOINT` (optional)
   - `PUBLIC_EVENT_ENDPOINT` (optional)
4. Push to `main`. The workflow `.github/workflows/deploy.yml` builds and deploys.
5. The site is available at `https://<owner>.github.io/<repo>/`.

The workflow automatically sets Astro's `base` path to the repository name, unless the repository is a `<owner>.github.io` user site. All internal links, images, fonts, and CSS assets use that base path.

### If the site must be password-protected

**GitHub Pages alone cannot enforce a password.** It serves static files publicly, and a JavaScript gate is not real security.

Options:

1. **Recommended:** deploy the same `dist/` to **Cloudflare Pages** and create a **Cloudflare Access** application:
   - Add the Pages custom domain to Cloudflare.
   - Zero Trust → Access → Applications → Add an application → Self-hosted.
   - Policy: allow only specific emails, or one-time PIN.
   - No application code changes required.
2. **Keep GitHub Pages** and put Cloudflare in front of a custom domain:
   - Add a custom domain in GitHub Pages.
   - Move DNS to Cloudflare, proxy the record.
   - Create a Cloudflare Access application for the hostname.
   - This is more fragile because GitHub Pages manages its own TLS/hostname; test carefully.
3. **Noindex public demo:** the current build is `noindex, nofollow` and `robots.txt` disallows everything. This hides it from search engines but does not restrict access.

For a closed demo with placeholder data, option 3 is often enough. If real customer data will ever be submitted, use Cloudflare Access before sharing the URL.

## Project structure

```
site/
├── apps-script/
│   ├── Code.gs                 # Sheet backend
│   └── README.md               # deployment guide
├── public/
│   ├── images/                 # demo images, optimized WebP
│   ├── robots.txt              # disallow all (closed demo)
│   └── .nojekyll               # GitHub Pages
├── scripts/
│   ├── prepare-images.mjs      # rebuild demo images from the sample folder
│   └── qa-*.mjs                # Playwright QA scripts
├── src/
│   ├── assets/fonts/           # self-hosted Mulish
│   ├── components/
│   ├── data/
│   │   ├── site.ts             # store info, hotline, Zalo, address
│   │   ├── vehicles.ts         # 6 demo vehicles
│   │   └── news.ts             # 3 demo articles
│   ├── layouts/BaseLayout.astro
│   ├── lib/format.ts           # URL base helper, VND/date formatting
│   ├── pages/
│   ├── scripts/app.ts          # nav, carousels, forms, tracking
│   └── styles/global.css
└── .github/workflows/deploy.yml
```

## Editing content

### Store information

Edit `src/data/site.ts`:

- `name`, `legalName`, `taxId`
- `hotlineSales`, `hotlineService`
- `zaloUrl` — replace `https://zalo.me/0900000000`
- `address`, `mapUrl`, `hours`
- `email`
- `notice`

### Vehicles

Edit `src/data/vehicles.ts`. Each entry controls the listing card, detail page, price, specs, offers, colors, and image paths.

The demo includes:

- Cars: VF 3, VF 5, VF 8, VF 9
- Motorbikes: Evo, Viper

To add a vehicle:

1. Add images under `public/images/vehicles/<slug>/` (`main.webp`, `gallery-1.webp`, ...).
2. Add an object to `vehicles` with a unique `slug`, `type`, and `order`.
3. Rebuild. The listing and detail routes are generated automatically.

### News

Edit `src/data/news.ts`. Add an article object with a unique slug; the detail route is generated automatically.

### Images

The demo images were prepared from the supplied sample site:

```bash
npm run prepare-images
```

This script reads the sample folder and writes optimized WebP files to `public/images`. If the sample folder moves, update the paths in `scripts/prepare-images.mjs`.

**Replace all demo images with customer-owned or licensed assets before public launch.**

## Forms and tracking

### Forms

- Test drive: `/dang-ky-lai-thu/`
- Service booking: `/dat-lich-dich-vu/`
- Contact: `/lien-he/`
- Quote forms: home, listings, and each detail page
- All forms share `src/components/LeadForm.astro`

Validation is client-side and server-side (Apps Script). The consent checkbox is required. Hidden fields capture page path, referrer, UTM parameters, click ID, session ID, and time-to-submit.

### Events

`src/scripts/app.ts` sends key events:

- `page_view`
- `vehicle_view`
- `cta_click`
- `zalo_open`
- `form_start`
- `form_submit`
- `form_error`
- `calculator_use`
- `filter_use`
- `map_load`

Without an endpoint, events are stored in `localStorage` for inspection. With an endpoint, they are sent via `navigator.sendBeacon` as `text/plain` JSON.

Sheets is fine for a demo funnel. For real analytics at scale, use GA4 or Cloudflare Web Analytics and keep only conversions in the Sheet.

## Security and privacy

- All pages are `noindex, nofollow`.
- Forms use a honeypot, minimum submit time, client/server validation, and consent.
- Apps Script deduplicates phone + form type within 10 minutes.
- The Sheet should stay private; share only with named staff.
- Direct Apps Script mode cannot rate-limit or return real HTTP errors. Add a Worker proxy for production.
- The privacy policy page is a template; have it reviewed before collecting real data.
- No old `vinfastcaron.vn` links, redirects, or legacy URLs are included.

## QA scripts

With the preview server running on port 4321:

```bash
node scripts/qa-e2e.mjs       # forms, filter, gallery, calculator, drawer, map
node scripts/qa-links.mjs     # internal links/assets, old-domain scan, noindex
node scripts/qa-mobile.mjs    # mobile screenshots
node scripts/qa-desktop.mjs   # desktop screenshots
```

`qa-base.mjs` expects a `/demo/` base build served on port 4322 by `scripts/serve-base.mjs`; it verifies GitHub Pages subpath behavior.

## Production checklist

- [ ] Replace demo store name, address, hotlines, Zalo, email, map.
- [ ] Replace demo prices/specs/offers with approved data.
- [ ] Replace demo images with authorized assets.
- [ ] Deploy Apps Script and set `PUBLIC_SHEET_ENDPOINT` (or a proxy).
- [ ] Set `NOTIFY_EMAIL` / Telegram for lead notifications.
- [ ] Decide on Cloudflare Access if the demo must be private.
- [ ] Review the privacy policy for Nghị định 13/2023/NĐ-CP.
- [ ] Add real analytics only after a consent decision.
- [ ] Run `node scripts/qa-links.mjs` and `node scripts/qa-e2e.mjs`.
- [ ] Check mobile at 360/390/414 px and desktop at 1280/1440 px.
- [ ] Confirm no old URL appears in the built output.
