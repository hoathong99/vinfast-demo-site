# Cloudflare Worker backend

Single-file Worker that:

- receives site form submissions and writes them to Google Sheets;
- stores products, sale programs, articles, and media metadata in Cloudflare D1;
- stores uploaded images in Cloudflare R2 and serves them at `/media/<key>`.

## Files

- `worker.js` — the entire Worker. Paste it into the Cloudflare dashboard.
- `schema.sql` — D1 schema (idempotent).
- `seed/` — generated D1 seed SQL + article seed source.
- `../scripts/build-d1-seed.mjs` — builds seed SQL from `src/data/catalog/*` and `seed/articles.json`.
- `../scripts/qa-d1.mjs` — offline D1/R2 tests.
- `../docs/D1-R2-BACKEND.md` — full setup guide.
- `../docs/GOOGLE-SHEET-CLOUDFLARE.md` — Google Sheets setup guide.

## Routes

### Leads / events (Google Sheets)

| Route | Method | Purpose |
|---|---|---|
| `/`, `/health`, `/lead` | GET | Health check |
| `/lead` | POST | Create a lead |
| `/event` | POST | Append an analytics event |

### CMS (D1 + R2)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | — | Health + binding status |
| `/api/products` | GET | — | List products (`type`, `featured`, `status`, `limit`, `offset`) |
| `/api/products/:slug` | GET | — | Get one product |
| `/api/products` | POST | Bearer | Create a product |
| `/api/products/:slug` | PUT | Bearer | Upsert a product (replaces child arrays) |
| `/api/products/:slug` | DELETE | Bearer | Delete a product + related sale program |
| `/api/sale-items` | GET | — | List sale items |
| `/api/sale-items` | POST | Bearer | Create a sale item |
| `/api/sale-items/:id` | PUT | Bearer | Upsert a sale item |
| `/api/sale-items/:id` | DELETE | Bearer | Delete an unused sale item |
| `/api/sale-programs` | GET | — | List sale programs |
| `/api/sale-programs/:productId` | GET | — | Get one sale program |
| `/api/sale-programs/:productId` | PUT | Bearer | Upsert a sale program |
| `/api/sale-programs/:productId` | DELETE | Bearer | Delete a sale program |
| `/api/articles` | GET | — | List published articles (`status`, `category`, `limit`, `offset`) |
| `/api/articles/:slug` | GET | — | Get one article (draft needs Bearer) |
| `/api/articles` | POST | Bearer | Create an article |
| `/api/articles/:slug` | PUT | Bearer | Upsert an article |
| `/api/articles/:slug` | PATCH | Bearer | Publish / update status |
| `/api/articles/:slug` | DELETE | Bearer | Delete an article |
| `/api/uploads` | POST | Bearer | Upload images (multipart, `file`) |
| `/api/media` | GET | Bearer | List media metadata |
| `/api/media/:id` | PATCH | Bearer | Update media `alt` |
| `/api/media/:id` | DELETE | Bearer | Delete media row + R2 object |
| `/media/<key>` | GET/HEAD | — | Serve an R2 image |

`status=draft|archived|all` and draft article detail require the admin token.

## Required variables and bindings

Set these in **Cloudflare Dashboard → Worker → Settings → Variables and Secrets / Bindings**.

### D1 + R2

| Name | Type | Value |
|---|---|---|
| `DB` | D1 binding | Database created from `schema.sql` |
| `MEDIA` | R2 binding | Bucket for uploaded images |

### Secrets / variables

| Name | Type | Value |
|---|---|---|
| `ADMIN_TOKEN` | Secret | Long random string used as `Authorization: Bearer <token>` |
| `ALLOWED_ORIGINS` | Secret/Text | `http://localhost:4321,http://127.0.0.1:4321,https://your-site.example` |
| `MEDIA_PUBLIC_BASE_URL` | Text (optional) | Absolute media base, e.g. `https://your-worker.workers.dev/media` or a CDN URL. Defaults to `<worker origin>/media` |

### Google Sheets (existing)

| Name | Type | Value |
|---|---|---|
| `SHEET_ID` | Secret | Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Secret | base64 of the service account JSON |
| `IP_HASH_SALT` | Secret | random long string |

Optional: `LEADS_TAB`, `EVENTS_TAB`, `ENABLE_EVENTS`, `TIMEZONE`, `DEFAULT_SHOWROOM`.

If the base64 secret is rejected for size, use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.

## D1 setup

1. Create a D1 database.
2. Run `schema.sql`.
3. Generate seed SQL:

```bash
npm run seed:build
```

4. Run the generated files in order:

```text
backend/seed/01-sale-items.sql
backend/seed/02-products.sql
backend/seed/03-sale-programs.sql
backend/seed/04-articles.sql
```

With Wrangler:

```bash
npx wrangler d1 execute <database-name> --remote --file=backend/schema.sql
npx wrangler d1 execute <database-name> --remote --file=backend/seed/01-sale-items.sql
npx wrangler d1 execute <database-name> --remote --file=backend/seed/02-products.sql
npx wrangler d1 execute <database-name> --remote --file=backend/seed/03-sale-programs.sql
npx wrangler d1 execute <database-name> --remote --file=backend/seed/04-articles.sql
```

## R2 setup

1. Create an R2 bucket.
2. Add it to the Worker as binding `MEDIA`.
3. Keep the bucket private. Images are served through `GET /media/<key>`.
4. Optional: set `MEDIA_PUBLIC_BASE_URL` to the Worker media prefix or a CDN.

Uploads accept JPEG, PNG, WebP, and AVIF, max 10 MB per file and 30 MB per request. Magic bytes are checked.

## Local checks

```bash
node --check backend/worker.js
npm run qa:worker
npm run qa:d1
npm run seed:build
```

`qa:worker` mocks Google OAuth + Sheets API. `qa:d1` uses `node:sqlite` and an in-memory R2 bucket, so neither needs real credentials.

## Test after deploy

```bash
curl https://vinfast-lead-api.your-subdomain.workers.dev/api/health
curl https://vinfast-lead-api.your-subdomain.workers.dev/api/products
```

Expected health shape:

```json
{
  "ok": true,
  "service": "vinfast-sheet-api",
  "version": 2,
  "configured": true,
  "features": { "sheets": true, "d1": true, "r2": true, "admin": true }
}
```

Then follow `../docs/D1-R2-BACKEND.md` for CRUD and upload examples.
