# D1 + R2 CMS backend

This guide configures the Cloudflare Worker in `backend/worker.js` to store CMS data in
Cloudflare D1 and images in R2. The existing Google Sheets lead/event flow is unchanged.

```text
Article editor / admin client
   │  Bearer ADMIN_TOKEN
   ▼
Cloudflare Worker
   ├── D1 (binding DB)      products, sale items/programs, articles, media metadata
   ├── R2 (binding MEDIA)   uploaded images, served at /media/<key>
   └── Google Sheets        /lead and /event (unchanged)
```

**Scope note:** the Astro frontend still reads the static JSON files in `src/data/`. This
change only updates the backend. Wiring the frontend to these APIs is a separate task.

---

## 1. What is stored where

| Data | Storage | Notes |
|---|---|---|
| Products | D1 | 1 product row + child rows for quick specs, spec groups/items, images, colors, offers, highlights |
| Sale items | D1 | Shared add-on/gift catalog |
| Sale programs | D1 | 1 program per product + item refs + detail rows |
| Articles | D1 | HTML content is sanitized before it is stored |
| Images | R2 | Metadata is stored in `media`; files are served through the Worker |
| Leads / events | Google Sheets | Existing flow, not migrated |

---

## 2. Prerequisites

- Cloudflare account with Workers, D1, and R2 enabled.
- Wrangler CLI for the commands below (`npx wrangler ...` works without a global install).
- Node.js 22.13+ if you want to run `npm run qa:d1` (`node:sqlite`).
- This repository checked out locally.

Log in once:

```bash
npx wrangler login
```

---

## 3. Create the D1 database

```bash
npx wrangler d1 create vinfast-demo-cms
```

Copy the `database_id` from the output. You can either keep using Wrangler or add the
binding in the Cloudflare dashboard.

### 3.1 Apply the schema

With Wrangler:

```bash
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/schema.sql
```

Or open **Cloudflare Dashboard → Workers & Pages → D1 → vinfast-demo-cms → Console** and
paste the contents of `backend/schema.sql`.

The schema is idempotent (`CREATE TABLE IF NOT EXISTS`), so it is safe to run again.

### 3.2 Add the binding

Dashboard: **Worker → Settings → Bindings → Add → D1 database**

| Field | Value |
|---|---|
| Variable name | `DB` |
| D1 database | `vinfast-demo-cms` |

If you use a `wrangler.toml`/`wrangler.jsonc` for another project, the equivalent is:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vinfast-demo-cms"
database_id = "<database-id>"
```

---

## 4. Create the R2 bucket

```bash
npx wrangler r2 bucket create vinfast-demo-media
```

Dashboard: **Worker → Settings → Bindings → Add → R2 bucket**

| Field | Value |
|---|---|
| Variable name | `MEDIA` |
| R2 bucket | `vinfast-demo-media` |

Keep the bucket private. Images are served by the Worker at `GET /media/<key>`.

Optional: set `MEDIA_PUBLIC_BASE_URL` if you put a CDN or custom domain in front of media.

- Unset: media URLs are `<worker origin>/media/uploads/YYYY/MM/<uuid>.<ext>`.
- Set to `https://cdn.example.com`: media URLs are `https://cdn.example.com/uploads/YYYY/MM/...`.

---

## 5. Worker secrets

Add these in **Worker → Settings → Variables and Secrets**:

| Name | Type | Required | Purpose |
|---|---|---|---|
| `ADMIN_TOKEN` | Secret | Yes | Bearer token for every write/upload request |
| `ALLOWED_ORIGINS` | Secret/Text | Yes | Browser origins allowed by CORS |
| `MEDIA_PUBLIC_BASE_URL` | Text | No | Absolute media base URL |
| `SHEET_ID` | Secret | For leads | Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Secret | For leads | base64 service-account JSON |
| `IP_HASH_SALT` | Secret | For leads | Salt for hashing lead IPs |

Generate a token:

```bash
openssl rand -hex 32
```

On Windows PowerShell:

```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

`ALLOWED_ORIGINS` examples:

```text
http://localhost:4321,http://127.0.0.1:4321,https://your-site.example
```

Do not add a path or trailing slash. `*` is supported but not recommended.

If `ADMIN_TOKEN` is missing, every write/upload route returns `503 ADMIN_NOT_CONFIGURED`
instead of becoming public.

---

## 6. Seed the existing catalog

The seed source is:

- `src/data/catalog/products.json`
- `src/data/catalog/sale-items.json`
- `src/data/catalog/sale-programs.json`
- `backend/seed/articles.json` (converted from `src/data/news.ts`)

Generate the SQL:

```bash
npm run seed:build
```

Output:

```text
backend/seed/01-sale-items.sql
backend/seed/02-products.sql
backend/seed/03-sale-programs.sql
backend/seed/04-articles.sql
```

Run them in numeric order:

```bash
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/seed/01-sale-items.sql
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/seed/02-products.sql
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/seed/03-sale-programs.sql
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/seed/04-articles.sql
```

Or paste each file into the D1 Console. `02-products.sql` is the largest file (~130 KB);
Wrangler is recommended for that one.

The seed is idempotent: product/program child rows are deleted and re-inserted, and parent
rows are upserted.

> The seed overwrites the records it contains. Run it on a fresh database, or export a D1
> backup first if you have already edited products/programs/articles in the admin API.

After seeding:

```bash
curl https://<worker-host>/api/products
curl https://<worker-host>/api/sale-programs
curl https://<worker-host>/api/articles
```

---

## 7. Data model

### Products

`Product` fields match `src/data/repositories/types.ts`. Child arrays are stored in
relational tables:

| API field | D1 storage |
|---|---|
| `quickSpecs[]` | `product_quick_specs` |
| `specs[].group` | `product_spec_groups` |
| `specs[].items[]` | `product_spec_items` |
| `images[]` | `product_images` |
| `colors[]` | `product_colors` |
| `offers[]` | `product_offers` |
| `highlights[]` | `product_highlights` |

`PUT /api/products/:slug` replaces the full child set, matching PUT semantics.

`status` can be `published`, `draft`, or `archived`. Public list/detail requests only see
`published` rows unless the admin token is supplied with `?status=draft|archived|all`.

### Sale programs

`SaleProgram` keeps the existing shape:

```json
{
  "productId": "vinfast-vf-3",
  "enabled": true,
  "percentDiscount": 0,
  "flatDiscount": 0,
  "items": [{ "itemId": "charger-home", "note": "Tặng kèm" }],
  "details": [{ "title": "Bảo hành", "text": "3 năm" }]
}
```

Deleting a sale item that is still referenced returns `409 CONFLICT` with `references`.

### Articles

```json
{
  "slug": "uu-dai-lai-thu-vf-3-demo",
  "title": "Trải nghiệm VF 3 tại showroom demo",
  "excerpt": "...",
  "category": "Ưu đãi",
  "coverImage": "/images/news-1.webp",
  "contentHtml": "<p>...</p>",
  "status": "published",
  "author": "VinFast Demo",
  "seoTitle": "...",
  "seoDescription": "...",
  "publishedAt": "2026-11-10T00:00:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

List responses omit `contentHtml`; detail responses include it. Draft/archived articles require
the admin token.

List endpoints cap at 90 products / 100 articles per page (default is lower). The product cap
keeps the `IN (...)` hydration queries under D1's 100-bound-parameter limit.

When wiring the frontend later:

- `coverImage` replaces `NewsItem.image`
- render `contentHtml` instead of `NewsItem.body[]`
- `publishedAt` replaces `NewsItem.date`

---

## 8. API examples

Set:

```bash
BASE=https://<worker-host>
TOKEN=<ADMIN_TOKEN>
```

### Read products

```bash
curl "$BASE/api/products?type=car&featured=1"
curl "$BASE/api/products/vinfast-vf-3"
```

### Create / update a product

```bash
curl -X POST "$BASE/api/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "vinfast-demo-car",
    "name": "VinFast Demo Car",
    "type": "car",
    "category": "suv",
    "tagline": "Xe demo",
    "price": 690000000,
    "priceNote": "Giá demo",
    "featured": true,
    "order": 99,
    "quickSpecs": [{ "label": "Số chỗ", "value": "5" }],
    "specs": [{ "group": "Pin", "items": [{ "label": "Dung lượng", "value": "42 kWh" }] }],
    "images": ["/images/vehicles/vinfast-vf-8/main.webp"],
    "colors": [],
    "offers": [],
    "description": "Mô tả",
    "highlights": []
  }'
```

```bash
curl -X PUT "$BASE/api/products/vinfast-demo-car" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @product.json
```

### Sale programs

```bash
curl -X PUT "$BASE/api/sale-programs/vinfast-vf-3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentDiscount": 5,
    "flatDiscount": 0,
    "items": [{ "itemId": "charger-home", "note": "Tặng kèm" }],
    "details": [{ "title": "Bảo hành", "text": "3 năm" }]
  }'
```

### Articles with HTML

```bash
curl -X POST "$BASE/api/articles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "bai-viet-moi",
    "title": "Bài viết mới",
    "excerpt": "Mô tả ngắn",
    "category": "Tin tức",
    "coverImage": "/images/news-1.webp",
    "contentHtml": "<p>Nội dung <strong>HTML</strong>.</p>",
    "status": "draft"
  }'
```

Publish:

```bash
curl -X PATCH "$BASE/api/articles/bai-viet-moi" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}'
```

### Upload an image

```bash
curl -X POST "$BASE/api/uploads" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./photo.webp" \
  -F "alt=Ảnh sản phẩm"
```

Response:

```json
{
  "ok": true,
  "files": [
    {
      "id": "uuid",
      "key": "uploads/2026/11/uuid.webp",
      "url": "https://<worker-host>/media/uploads/2026/11/uuid.webp",
      "mimeType": "image/webp",
      "sizeBytes": 12345
    }
  ]
}
```

Use the returned `url` in `images[]`, `colors[].image`, `coverImage`, etc.

Delete media:

```bash
curl -X DELETE "$BASE/api/media/<id>" \
  -H "Authorization: Bearer $TOKEN"
```

### Health

```bash
curl "$BASE/api/health"
```

```json
{
  "ok": true,
  "service": "vinfast-sheet-api",
  "version": 2,
  "configured": true,
  "features": { "sheets": true, "d1": true, "r2": true, "admin": true }
}
```

`configured` keeps the old meaning: Google Sheets credentials are present. Use
`features.d1`, `features.r2`, and `features.admin` for the CMS side. A `true` value means the
binding/secret exists; it does not prove the schema or bucket permissions are correct.

---

## 9. Article HTML sanitizer

`contentHtml` is sanitized **on write** and again **on read** (defense in depth).

Allowed tags:

```text
p br hr h2 h3 h4 h5 h6
strong b em i u s del ins
blockquote ul ol li
a img figure figcaption
table thead tbody tfoot tr th td caption
code pre span div sup sub
```

Allowed attributes:

| Tag | Attributes |
|---|---|
| `a` | `href`, `title`, `target`, `rel` |
| `img` | `src`, `alt`, `title`, `width`, `height`, `loading` |
| `td`, `th` | `colspan`, `rowspan` |

Rules:

- `script`, `style`, `iframe`, `form`, `input`, `svg`, `math`, `template`, and similar
  containers are removed **with their content**.
- `on*` attributes, `style`, `id`, `class`, and `data-*` are removed.
- URLs may be `http(s)://`, `mailto:` (links only), `/absolute`, `./relative`, or `#fragment`.
  `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` are rejected.
- `target="_blank"` automatically gets `rel="noopener noreferrer"`.
- Content is limited to 200 KB.

If the editor needs inline CSS later, add a dedicated CSS-property allowlist rather than
re-enabling the raw `style` attribute.

---

## 10. Media behaviour

- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- Magic bytes are checked; a renamed file is rejected.
- Max 10 MB per file, 30 MB per request, 10 files per request.
- Keys: `uploads/YYYY/MM/<uuid>.<ext>`.
- `GET /media/<key>` returns `Cache-Control: public, max-age=31536000, immutable` and an ETag.
- `HEAD` is supported.
- Deleting media removes both the D1 row and the R2 object.
- The R2 bucket can stay private; the Worker proxies the object.

If you later put a CDN in front of R2, set `MEDIA_PUBLIC_BASE_URL` to the CDN base.

---

## 11. CORS and CSP

CORS uses `ALLOWED_ORIGINS`. Write requests also need:

```text
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

The Worker allows `GET, POST, PUT, PATCH, DELETE, OPTIONS` and the headers
`Content-Type, Accept, Authorization, If-None-Match`.

When the frontend starts displaying R2 images, update the site CSP so `img-src` includes the
Worker/media origin. The current static site policy lives in both:

- `src/layouts/BaseLayout.astro` (meta tag)
- `public/_headers` (Cloudflare HTTP header)

---

## 12. Local QA

```bash
node --check backend/worker.js
npm run qa:worker   # Google Sheets mocks
npm run qa:d1       # D1 + R2 routes, in-memory
npm run seed:build
```

`qa:d1` uses `node:sqlite` as a D1 stand-in and an in-memory R2 fake. It covers:

- product CRUD and child-row replacement
- sale item/program rules including referenced deletion
- article drafts, publishing, and sanitizer output
- upload validation, media serving, and deletion
- Bearer auth, CORS preflight, and ETags

---

## 13. Troubleshooting

### `DB_NOT_CONFIGURED` / `R2_NOT_CONFIGURED`

The `DB` / `MEDIA` binding is missing or has the wrong variable name. Add it in
**Worker → Settings → Bindings** and redeploy.

### `ADMIN_NOT_CONFIGURED`

`ADMIN_TOKEN` is not set. Add it as a Secret and redeploy.

### `UNAUTHORIZED`

Use:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

Header names are case-insensitive, but the `Bearer ` prefix is required.

### CORS error in the browser

- `ALLOWED_ORIGINS` must contain the exact origin (scheme + host + port).
- No path, query, or trailing slash.
- GitHub Pages project sites use `https://user.github.io`, not `https://user.github.io/repo`.
- Cloudflare Pages preview deployments have different origins.

### `UNSUPPORTED_MEDIA_TYPE` on upload

- Use JPEG/PNG/WebP/AVIF.
- The file extension does not matter; the magic bytes do.
- Do not upload SVG (blocked intentionally).

### `PAYLOAD_TOO_LARGE`

- Article JSON max 256 KB, HTML max 200 KB.
- Upload max 10 MB/file, 30 MB/request.

### Seeded product has no specs/images

Run the seed files in order. `02-products.sql` deletes and re-inserts child rows for each
seeded product.

### `SQLITE_CONSTRAINT` during seed

Usually the seed files were run out of order:

```text
01-sale-items → 02-products → 03-sale-programs → 04-articles
```

### D1 console rejects a large paste

Use Wrangler:

```bash
npx wrangler d1 execute vinfast-demo-cms --remote --file=backend/seed/02-products.sql
```

---

## 14. Security notes

- `ADMIN_TOKEN` is a shared secret. Rotate it if exposed.
- The Worker URL is public. CORS restricts browsers, not `curl`; writes are protected by the
  Bearer token.
- The rate limiter is in-memory and best-effort. Add Cloudflare WAF rate limiting for a public
  production site.
- Never put `ADMIN_TOKEN` or the Google service-account key in `PUBLIC_*` variables.
- Keep the R2 bucket private unless you intentionally configure a public/CDN domain.
- Back up D1 before running destructive seed scripts:

  ```bash
  npx wrangler d1 export vinfast-demo-cms --remote --output=backup.sql
  ```

---

## 15. Next step: wire the frontend

Not part of this change. When ready:

1. Add a `PUBLIC_CMS_API_BASE` env variable.
2. Replace the JSON-backed repositories in `src/data/repositories/` with build-time or
   runtime fetches.
3. Add an article renderer that uses `contentHtml`.
4. Update CSP `img-src` for the Worker/media origin.
5. Move `src/data/news.ts` to the API or keep it as a fallback.
