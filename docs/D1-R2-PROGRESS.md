# VinFast Demo — D1 + R2 Backend Progress

- **Project**: `vinfast-demo-site`
- **Cập nhật**: 2026-11-26
- **Phạm vi**: Backend Cloudflare Worker + D1 + R2
- **Trạng thái**: ✅ Hoàn thành phần backend (frontend chưa nối API)

---

## 1. Mục tiêu

1. Lưu products, sale items, sale programs, articles trong Cloudflare D1.
2. Upload ảnh lên R2, serve qua Worker tại `/media/<key>`.
3. Article lưu HTML đã sanitize, sẵn sàng cho article editor.
4. Giữ nguyên `/lead`, `/event` và luồng Google Sheets.
5. Không sửa frontend Astro trong lần này.

---

## 2. Trạng thái theo phase

| # | Phase | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Phân tích codebase + chốt plan | ✅ | Đọc worker, repositories, catalog JSON, news.ts, QA cũ |
| 1 | `backend/schema.sql` | ✅ | 15 bảng + index, idempotent |
| 2 | Refactor router/auth/limits | ✅ | `/api/*`, `/media/*`, Bearer, body limits, CORS, ETag |
| 3 | Products API | ✅ | CRUD + hydrate bảng con |
| 4 | Sale items + programs API | ✅ | CRUD + kiểm tra tham chiếu |
| 5 | Articles API + sanitizer | ✅ | Draft/publish, HTML allowlist |
| 6 | R2 upload / serve / delete | ✅ | Multipart, magic bytes, cache immutable |
| 7 | Seed script + data | ✅ | 24 products, 7 sale items, 24 programs, 3 articles |
| 8 | QA D1/R2 | ✅ | `qa:d1` pass; `qa:worker` không regression |
| 9 | Docs | ✅ | `backend/README.md`, `docs/D1-R2-BACKEND.md` |

Legend: ⬜ chưa làm · 🟡 đang làm · ✅ xong · ⛔ blocked

---

## 3. Việc đã làm

### Schema D1 — `backend/schema.sql`

- `products`
- `product_quick_specs`
- `product_spec_groups`
- `product_spec_items`
- `product_images`
- `product_colors`
- `product_offers`
- `product_highlights`
- `sale_items`
- `sale_programs`
- `sale_program_items`
- `sale_program_details`
- `articles`
- `media`
- Index cho products, sale program items, articles, media.

### Worker — `backend/worker.js`

- Router mới cho `/api/*` và `/media/*`; giữ nguyên `/`, `/health`, `/lead`, `/event`.
- Bearer auth với `ADMIN_TOKEN` (constant-time compare).
- `ADMIN_TOKEN` thiếu → `503 ADMIN_NOT_CONFIGURED`, không mở public.
- Body limits theo route:
  - lead/event 16 KB
  - product/sale 128 KB
  - article 256 KB (HTML tối đa 200 KB)
  - upload 10 MB/file, 30 MB/request
- Rate limit in-memory: API 180/phút/IP, upload 10/phút/IP.
- Public GET có ETag + `Cache-Control: public, max-age=60, s-maxage=300`.
- Health thêm `features.d1`, `features.r2`, `features.admin`.

### API đã có

Public:

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/sale-items`
- `GET /api/sale-programs`
- `GET /api/sale-programs/:productId`
- `GET /api/articles`
- `GET /api/articles/:slug`
- `GET|HEAD /media/<key>`

Admin (Bearer):

- `POST /api/products`
- `PUT /api/products/:slug`
- `DELETE /api/products/:slug`
- `POST /api/sale-items`
- `PUT /api/sale-items/:id`
- `DELETE /api/sale-items/:id`
- `PUT /api/sale-programs/:productId`
- `DELETE /api/sale-programs/:productId`
- `POST /api/articles`
- `PUT /api/articles/:slug`
- `PATCH /api/articles/:slug`
- `DELETE /api/articles/:slug`
- `POST /api/uploads`
- `GET /api/media`
- `PATCH /api/media/:id`
- `DELETE /api/media/:id`

### Article HTML sanitizer

- Allowlist tag: `p, br, hr, h2-h6, strong, b, em, i, u, s, del, ins, blockquote, ul, ol, li, a, img, figure, figcaption, table, thead, tbody, tfoot, tr, th, td, caption, code, pre, span, div, sup, sub`.
- Xoá cả nội dung: `script, style, iframe, form, input, svg, math, template`, v.v.
- Bỏ `on*`, `style`, `id`, `class`, `data-*`.
- Chặn `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`.
- `target="_blank"` tự thêm `rel="noopener noreferrer"`.
- Sanitize khi ghi và khi đọc.

### R2 media

- Multipart `POST /api/uploads`, nhiều file.
- Allowlist JPEG/PNG/WebP/AVIF + magic-byte check.
- Key `uploads/YYYY/MM/<uuid>.<ext>`.
- Serve qua `GET /media/<key>` với cache immutable + ETag.
- Metadata lưu bảng `media`.
- `DELETE /api/media/:id` xoá cả R2 object và D1 row.

### Seed

- `backend/seed/articles.json`: 3 bài từ `src/data/news.ts`.
- `scripts/build-d1-seed.mjs` sinh:
  - `backend/seed/01-sale-items.sql`
  - `backend/seed/02-products.sql`
  - `backend/seed/03-sale-programs.sql`
  - `backend/seed/04-articles.sql`
- Kết quả build:
  - sale items: 7
  - products: 24 (805 statements)
  - sale programs: 24 (166 statements)
  - articles: 3

### QA

- `scripts/qa-d1.mjs` dùng `node:sqlite` + R2 giả lập.
- `npm run qa:d1` → pass toàn bộ:
  - health, auth 401/403, CORS preflight
  - product CRUD + thay thế bảng con + ETag 304
  - sale item/program + referenced delete 409
  - article sanitizer (script/onerror/javascript, entity obfuscation, data URL), draft ẩn public, publish
  - upload text/fake PNG bị từ chối, PNG hợp lệ upload/serve/delete
- `npm run qa:worker` → pass 23 check cũ (không regression).
- `node scripts/build-d1-seed.mjs` → pass.
- `node --check` → pass cho worker và các script mới.

---

## 4. File đã tạo / sửa

### Tạo mới

- `backend/schema.sql`
- `backend/seed/articles.json`
- `backend/seed/01-sale-items.sql`
- `backend/seed/02-products.sql`
- `backend/seed/03-sale-programs.sql`
- `backend/seed/04-articles.sql`
- `scripts/build-d1-seed.mjs`
- `scripts/qa-d1.mjs`
- `docs/D1-R2-BACKEND.md`
- `docs/D1-R2-PROGRESS.md`

### Sửa

- `backend/worker.js`
- `backend/README.md`
- `package.json` (thêm `seed:build`, `qa:d1`)
- `docs/GOOGLE-SHEET-CLOUDFLARE.md` (thêm link sang docs D1/R2)

### Không đụng

- `src/**`
- `astro.config.mjs`
- `.github/workflows/deploy.yml`

---

## 5. Cấu hình Cloudflare cần làm

| Name | Loại | Giá trị |
|---|---|---|
| `DB` | D1 binding | Database đã chạy `backend/schema.sql` |
| `MEDIA` | R2 binding | Bucket ảnh |
| `ADMIN_TOKEN` | Secret | Chuỗi random dài |
| `MEDIA_PUBLIC_BASE_URL` | Text (optional) | Mặc định `<worker origin>/media` |
| `ALLOWED_ORIGINS` | Secret/Text | Origin của site |

Quy trình đầy đủ: xem `docs/D1-R2-BACKEND.md`.

---

## 6. Việc còn lại (ngoài scope lần này)

- [ ] Thêm `PUBLIC_CMS_API_BASE` vào env.
- [ ] Đổi repository products/sale programs sang fetch API lúc build hoặc runtime.
- [ ] Đổi trang tin tức sang article API + render `contentHtml`.
- [ ] Article editor gọi `/api/uploads` và CRUD `/api/articles`.
- [ ] Cập nhật CSP `img-src` cho origin Worker/media.
- [ ] (Tuỳ chọn) Đưa leads/events từ Google Sheets sang D1.
- [ ] (Tuỳ chọn) Thêm Cloudflare WAF rate limiting.

---

## 7. Ghi chú kỹ thuật

- D1 batch được dùng để thay thế bảng con; luôn xoá con tường minh, không phụ thuộc FK cascade.
- Giới hạn list products là 90 để tránh vượt 100 bound params của D1 khi hydrate bằng `IN (...)`.
- `02-products.sql` khá lớn (~130 KB); nên chạy bằng Wrangler thay vì paste D1 Console.
- `backend/seed/articles.json` tạm trùng nội dung `src/data/news.ts`; khi nối frontend có thể bỏ `news.ts`.
- Sanitizer là allowlist tự viết, đã có QA cho các vector phổ biến. Nếu cần bảo mật cao hơn, có thể chuyển sang HTMLRewriter hoặc thư viện đã kiểm chứng.
- Ảnh đi qua Worker; nếu traffic lớn nên gắn CDN/custom domain và set `MEDIA_PUBLIC_BASE_URL`.

---

## 8. Nhật ký

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-11-26 | Phân tích + chốt plan | Done |
| 2026-11-26 | Schema + seed script | `seed:build` pass |
| 2026-11-26 | Worker D1/R2 + sanitizer | `node --check` pass |
| 2026-11-26 | QA D1/R2 | `qa:d1` pass |
| 2026-11-26 | QA Sheets cũ | `qa:worker` pass |
| 2026-11-26 | Docs | Done |
