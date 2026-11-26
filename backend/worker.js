/**
 * VinFast demo API — Cloudflare Worker (single file)
 *
 * Routes
 *   GET  /                 health check (legacy)
 *   GET  /health           health check (legacy)
 *   GET  /lead             health check (legacy)
 *   POST /lead             create a lead (Google Sheets)
 *   POST /event            append an analytics event (Google Sheets)
 *
 *   GET  /api/health
 *   GET  /api/products
 *   GET  /api/products/:slug
 *   POST /api/products                        (admin)
 *   PUT  /api/products/:slug                  (admin)
 *   DELETE /api/products/:slug                (admin)
 *
 *   GET  /api/sale-items
 *   POST /api/sale-items                      (admin)
 *   PUT  /api/sale-items/:id                  (admin)
 *   DELETE /api/sale-items/:id                (admin)
 *
 *   GET  /api/sale-programs
 *   GET  /api/sale-programs/:productId
 *   PUT  /api/sale-programs/:productId        (admin)
 *   DELETE /api/sale-programs/:productId      (admin)
 *
 *   GET  /api/articles
 *   GET  /api/articles/:slug
 *   POST /api/articles                        (admin)
 *   PUT  /api/articles/:slug                  (admin)
 *   PATCH /api/articles/:slug                 (admin)
 *   DELETE /api/articles/:slug                (admin)
 *
 *   POST /api/uploads                         (admin, multipart/form-data)
 *   GET  /api/media                           (admin)
 *   PATCH /api/media/:id                      (admin)
 *   DELETE /api/media/:id                     (admin)
 *
 *   GET  /media/<key>      serve an R2 object
 *
 * Worker bindings / variables
 *   DB                   D1 database binding
 *   MEDIA                R2 bucket binding
 *   ADMIN_TOKEN          Secret. Required for every write request.
 *   ALLOWED_ORIGINS      Comma-separated browser origins
 *   MEDIA_PUBLIC_BASE_URL  Optional. Absolute base for media URLs.
 *                          Default: <worker origin>/media
 *   SHEET_ID             Google Sheet ID (leads / events)
 *   GOOGLE_SERVICE_ACCOUNT_JSON_B64  base64 service-account JSON
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY  fallback
 *   IP_HASH_SALT         Salt for hashing lead IPs
 *
 * Optional:
 *   LEADS_TAB, EVENTS_TAB, ENABLE_EVENTS, TIMEZONE, DEFAULT_SHOWROOM
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const SERVICE_NAME = "vinfast-sheet-api";
const API_VERSION = 2;

const LEAD_HEADERS = [
  "LeadID", "CreatedAt", "FormType", "FullName", "Phone", "Email",
  "Vehicle", "VehicleSlug", "Showroom", "PreferredDate", "PreferredTime",
  "ServiceType", "Message", "Consent", "ConsentVersion", "PagePath",
  "Referrer", "UTMSource", "UTMMedium", "UTMCampaign", "UTMContent", "UTMTerm",
  "ClickID", "Device", "Browser", "SessionID", "IPHash", "Status", "Owner",
  "Note", "FollowUpAt", "UpdatedAt",
];

const EVENT_HEADERS = [
  "EventID", "Timestamp", "EventName", "SessionID", "PagePath", "PageTitle",
  "VehicleSlug", "Label", "MetadataJSON", "Referrer", "UTMSource", "UTMMedium",
  "UTMCampaign", "Device", "Browser",
];

const VEHICLE_NAMES = {
  "vinfast-vf-2": "VinFast VF 2",
  "vinfast-vf-3": "VinFast VF 3",
  "vinfast-vf-5": "VinFast VF 5",
  "vinfast-vf-6": "VinFast VF 6",
  "vinfast-vf-7": "VinFast VF 7",
  "vinfast-vf-8": "VinFast VF 8",
  "vinfast-vf-9": "VinFast VF 9",
  "vinfast-vf-mpv-7": "VinFast VF MPV 7",
  "vinfast-minio-green": "VinFast Minio Green",
  "vinfast-herio-green": "VinFast Herio Green",
  "vinfast-nerio-green": "VinFast Nerio Green",
  "vinfast-limo-green": "VinFast Limo Green",
  "vinfast-ec-van": "VinFast EC Van",
  "vinfast-evo": "VinFast Evo",
  "vinfast-evo-lite": "VinFast Evo Lite",
  "vinfast-evo-grand": "VinFast Evo Grand",
  "vinfast-evo-grand-lite": "VinFast Evo Grand Lite",
  "vinfast-amio": "VinFast Amio",
  "vinfast-feliz-2025": "VinFast Feliz 2025",
  "vinfast-feliz-ii": "VinFast Feliz II",
  "vinfast-flazz": "VinFast Flazz",
  "vinfast-zgoo": "VinFast Zgoo",
  "vinfast-viper": "VinFast Viper",
};

const FORM_TYPES = ["test_drive", "service", "contact", "quote"];
const EVENT_NAMES = [
  "page_view", "vehicle_view", "cta_click", "zalo_open", "form_start",
  "form_submit", "form_error", "calculator_use", "filter_use", "map_load",
  "compare_use", "call_click",
];

const PRODUCT_TYPES = ["car", "motorbike"];
const PRODUCT_CATEGORIES = ["mini-suv", "suv", "mpv", "thuong-mai", "pho-thong", "the-thao"];
const PRODUCT_STATUSES = ["published", "draft", "archived"];
const ARTICLE_STATUSES = ["draft", "published", "archived"];

const MAX_LEAD_BYTES = 16 * 1024;
const MAX_PRODUCT_BYTES = 128 * 1024;
const MAX_ARTICLE_BYTES = 256 * 1024;
const MAX_HTML_BYTES = 200 * 1024;
const MAX_HTML_CHARS = MAX_HTML_BYTES;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_FILES = 10;
const MAX_LIST_LIMIT = 90;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const API_RATE_MAX = 180;
const UPLOAD_RATE_MAX = 10;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_SCAN_ROWS = 300;

const IMAGE_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const rateBuckets = new Map();
const readySheets = new Set();

let tokenCache = null;

/* ------------------------------------------------------------------ */
/* Worker entry                                                        */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      if (origin && !isOriginAllowed(origin, env)) {
        return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, cors);
      }
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/media" || url.pathname.startsWith("/media/")) {
        return await handleMediaRequest(request, env, url, cors);
      }

      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request, env, url, cors);
      }

      return await handleLegacyRequest(request, env, url, origin, cors);
    } catch (error) {
      // Expected client/auth errors are returned to the caller, not logged as crashes.
      if (!error || !error.status || error.status >= 500) {
        console.error("VinFast Worker error:", error && error.stack ? error.stack : error);
      }
      return errorResponse(error, cors);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Legacy lead / event routes                                          */
/* ------------------------------------------------------------------ */

async function handleLegacyRequest(request, env, url, origin, cors) {
  if (
    request.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/lead")
  ) {
    return json(healthPayload(env), 200, cors);
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, cors);
  }

  if (url.pathname !== "/" && url.pathname !== "/lead" && url.pathname !== "/event") {
    return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
  }

  if (origin && !isOriginAllowed(origin, env)) {
    return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, cors);
  }

  const ip = clientIp(request);
  if (rateLimited(ip, "lead", RATE_MAX_REQUESTS, RATE_WINDOW_MS)) {
    return json({ ok: false, error: "RATE_LIMITED" }, 429, cors);
  }

  let payload;
  try {
    payload = await readJson(request, MAX_LEAD_BYTES);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const status = message === "BODY_TOO_LARGE" ? 413 : 400;
    return json({ ok: false, error: message }, status, cors);
  }

  if (url.pathname === "/event" || (payload && payload.type === "event")) {
    const result = await handleEvent(payload, env);
    return json(result, result.ok ? 200 : 400, cors);
  }

  const result = await handleLead(payload, env, ip);
  return json(result, result.ok ? 200 : 400, cors);
}

function healthPayload(env) {
  const sheetConfigured = isSheetConfigured(env);
  return {
    ok: true,
    service: SERVICE_NAME,
    version: API_VERSION,
    time: new Date().toISOString(),
    configured: sheetConfigured,
    features: {
      sheets: sheetConfigured,
      d1: Boolean(env.DB),
      r2: Boolean(env.MEDIA),
      admin: Boolean(env.ADMIN_TOKEN),
    },
  };
}

function isSheetConfigured(env) {
  return Boolean(
    String(env.SHEET_ID || "").trim() &&
      (env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
        (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY)),
  );
}

/* ------------------------------------------------------------------ */
/* API router                                                          */
/* ------------------------------------------------------------------ */

async function handleApiRequest(request, env, url, cors) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !isOriginAllowed(origin, env)) {
    return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, cors);
  }

  const ip = clientIp(request);
  if (rateLimited(ip, "api", API_RATE_MAX, RATE_WINDOW_MS)) {
    return json({ ok: false, error: "RATE_LIMITED" }, 429, cors);
  }

  const segments = pathSegments(url.pathname.replace(/^\/api\/?/, ""));
  const method = request.method;

  if (!segments.length) {
    return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
  }

  if (segments.length === 1 && segments[0] === "health" && method === "GET") {
    return json(healthPayload(env), 200, cors);
  }

  if (segments[0] === "products") {
    return handleProductsApi(request, env, url, cors, segments, method);
  }

  if (segments[0] === "sale-items") {
    return handleSaleItemsApi(request, env, url, cors, segments, method);
  }

  if (segments[0] === "sale-programs") {
    return handleSaleProgramsApi(request, env, url, cors, segments, method);
  }

  if (segments[0] === "articles") {
    return handleArticlesApi(request, env, url, cors, segments, method);
  }

  if (segments.length === 1 && segments[0] === "uploads" && method === "POST") {
    return handleUploads(request, env, cors);
  }

  if (segments[0] === "media") {
    return handleMediaApi(request, env, url, cors, segments, method);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

function pathSegments(value) {
  if (!value) return [];
  try {
    return value.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Products API                                                        */
/* ------------------------------------------------------------------ */

async function handleProductsApi(request, env, url, cors, segments, method) {
  if (segments.length === 1) {
    if (method === "GET") return listProductsResponse(request, env, url, cors);
    if (method === "POST") {
      requireAdmin(request, env);
      return createProduct(request, env, cors);
    }
    return methodNotAllowed(cors);
  }

  if (segments.length === 2) {
    const slug = segments[1];
    if (method === "GET") return getProductResponse(request, env, cors, slug);
    if (method === "PUT") {
      requireAdmin(request, env);
      return upsertProduct(request, env, cors, slug);
    }
    if (method === "DELETE") {
      requireAdmin(request, env);
      return deleteProduct(env, cors, slug);
    }
    return methodNotAllowed(cors);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

async function listProductsResponse(request, env, url, cors) {
  const status = cleanText(url.searchParams.get("status"), 20) || "published";
  if (![...PRODUCT_STATUSES, "all"].includes(status)) {
    return validation(cors, { status: "Invalid status." });
  }
  if (status !== "published") requireAdmin(request, env);

  const type = cleanText(url.searchParams.get("type"), 20);
  if (type && !PRODUCT_TYPES.includes(type)) {
    return validation(cors, { type: "Invalid product type." });
  }

  const featuredParam = url.searchParams.get("featured");
  const featured = featuredParam === null ? null : isTrue(featuredParam);
  const limit = parseLimit(url.searchParams.get("limit"), 100, MAX_LIST_LIMIT);
  const offset = parseOffset(url.searchParams.get("offset"));

  const rows = await selectProducts(env, { status, type, featured, limit, offset });
  const products = await hydrateProducts(env, rows);

  // Draft/archived listings are admin-only; never let a shared cache store them.
  if (status !== "published") return json({ ok: true, products }, 200, cors);
  return cachedJson(request, { ok: true, products }, cors);
}

async function getProductResponse(request, env, cors, slug) {
  const row = await d1First(env, "SELECT * FROM products WHERE slug = ?", [slug]);
  if (!row) return notFound(cors, "PRODUCT_NOT_FOUND", "Product not found.");

  const isPublic = row.status === "published";
  if (!isPublic) requireAdmin(request, env);

  const [product] = await hydrateProducts(env, [row]);
  if (!isPublic) return json({ ok: true, product }, 200, cors);
  return cachedJson(request, { ok: true, product }, cors);
}

async function createProduct(request, env, cors) {
  const payload = await readJson(request, MAX_PRODUCT_BYTES);
  const normalized = normalizeProduct(payload, null, null);
  if (!normalized.ok) return validation(cors, normalized.errors);

  const existing = await d1First(env, "SELECT slug FROM products WHERE slug = ?", [
    normalized.value.slug,
  ]);
  if (existing) {
    return json(
      { ok: false, error: "CONFLICT", message: "Product slug already exists." },
      409,
      cors,
    );
  }

  await writeProduct(env, normalized.value, null);
  const row = await d1First(env, "SELECT * FROM products WHERE slug = ?", [
    normalized.value.slug,
  ]);
  const [product] = await hydrateProducts(env, [row]);
  return json({ ok: true, product }, 201, cors);
}

async function upsertProduct(request, env, cors, slug) {
  const payload = await readJson(request, MAX_PRODUCT_BYTES);
  const existing = await d1First(env, "SELECT * FROM products WHERE slug = ?", [slug]);
  const normalized = normalizeProduct(payload, slug, existing);
  if (!normalized.ok) return validation(cors, normalized.errors);

  await writeProduct(env, normalized.value, existing);
  const row = await d1First(env, "SELECT * FROM products WHERE slug = ?", [
    normalized.value.slug,
  ]);
  const [product] = await hydrateProducts(env, [row]);
  return json({ ok: true, product }, 200, cors);
}

async function deleteProduct(env, cors, slug) {
  const existing = await d1First(env, "SELECT slug FROM products WHERE slug = ?", [slug]);
  if (!existing) return notFound(cors, "PRODUCT_NOT_FOUND", "Product not found.");

  await d1Batch(env, [
    d1Statement(env, "DELETE FROM sale_program_details WHERE product_id = ?", [slug]),
    d1Statement(env, "DELETE FROM sale_program_items WHERE product_id = ?", [slug]),
    d1Statement(env, "DELETE FROM sale_programs WHERE product_id = ?", [slug]),
    d1Statement(env, "DELETE FROM product_spec_items WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_spec_groups WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_quick_specs WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_images WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_colors WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_offers WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM product_highlights WHERE product_slug = ?", [slug]),
    d1Statement(env, "DELETE FROM products WHERE slug = ?", [slug]),
  ]);

  return json({ ok: true, deleted: true, slug }, 200, cors);
}

async function selectProducts(env, { status, type, featured, limit, offset }) {
  let sql = "SELECT * FROM products WHERE 1 = 1";
  const params = [];

  if (status && status !== "all") {
    sql += " AND status = ?";
    params.push(status);
  }
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (featured !== null) {
    sql += " AND featured = ?";
    params.push(featured ? 1 : 0);
  }

  sql += " ORDER BY sort_order ASC, name ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return d1All(env, sql, params);
}

async function hydrateProducts(env, rows) {
  if (!rows.length) return [];

  const slugs = rows.map((row) => row.slug);
  const placeholders = slugs.map(() => "?").join(",");
  const batch = await d1Batch(env, [
    d1Statement(
      env,
      `SELECT * FROM product_quick_specs WHERE product_slug IN (${placeholders}) ORDER BY product_slug, sort_order`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_spec_groups WHERE product_slug IN (${placeholders}) ORDER BY product_slug, group_index`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_spec_items WHERE product_slug IN (${placeholders}) ORDER BY product_slug, group_index, item_index`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_images WHERE product_slug IN (${placeholders}) ORDER BY product_slug, sort_order`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_colors WHERE product_slug IN (${placeholders}) ORDER BY product_slug, sort_order`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_offers WHERE product_slug IN (${placeholders}) ORDER BY product_slug, sort_order`,
      slugs,
    ),
    d1Statement(
      env,
      `SELECT * FROM product_highlights WHERE product_slug IN (${placeholders}) ORDER BY product_slug, sort_order`,
      slugs,
    ),
  ]);

  const [quickResult, groupResult, itemResult, imageResult, colorResult, offerResult, highlightResult] =
    batch;

  const bySlug = new Map();
  for (const row of rows) bySlug.set(row.slug, rowToProductBase(row));

  const groupsBySlug = new Map();

  for (const row of resultRows(quickResult)) {
    const product = bySlug.get(row.product_slug);
    if (product) product.quickSpecs.push({ label: row.label, value: row.value });
  }

  for (const row of resultRows(groupResult)) {
    let groups = groupsBySlug.get(row.product_slug);
    if (!groups) {
      groups = [];
      groupsBySlug.set(row.product_slug, groups);
    }
    groups.push({ group_index: row.group_index, group: row.group_name, items: [] });
  }

  for (const row of resultRows(itemResult)) {
    const groups = groupsBySlug.get(row.product_slug) || [];
    const group = groups.find((entry) => entry.group_index === row.group_index);
    if (group) group.items.push({ label: row.label, value: row.value });
  }

  for (const [slug, groups] of groupsBySlug) {
    const product = bySlug.get(slug);
    if (!product) continue;
    product.specs = groups.map(({ group, items }) => ({ group, items }));
  }

  for (const row of resultRows(imageResult)) {
    const product = bySlug.get(row.product_slug);
    if (product) product.images.push(row.url);
  }

  for (const row of resultRows(colorResult)) {
    const product = bySlug.get(row.product_slug);
    if (product) product.colors.push({ name: row.name, hex: row.hex, image: row.image });
  }

  for (const row of resultRows(offerResult)) {
    const product = bySlug.get(row.product_slug);
    if (product) {
      product.offers.push({
        title: row.title,
        description: row.description,
        validUntil: row.valid_until,
      });
    }
  }

  for (const row of resultRows(highlightResult)) {
    const product = bySlug.get(row.product_slug);
    if (product) product.highlights.push({ title: row.title, text: row.text });
  }

  return rows.map((row) => bySlug.get(row.slug)).filter(Boolean);
}

function rowToProductBase(row) {
  return {
    slug: row.slug,
    name: row.name,
    type: row.type,
    category: row.category,
    tagline: row.tagline,
    price: Number(row.price) || 0,
    priceNote: row.price_note,
    badge: row.badge || undefined,
    featured: Boolean(row.featured),
    order: Number(row.sort_order) || 0,
    quickSpecs: [],
    specs: [],
    images: [],
    colors: [],
    offers: [],
    highlights: [],
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeProduct(source, pathSlug, existing) {
  const errors = {};
  const record = asRecord(source) || {};

  let slug = cleanText(record.slug, 120).toLowerCase();
  if (pathSlug) {
    slug = pathSlug.toLowerCase();
    if (record.slug && cleanText(record.slug, 120).toLowerCase() !== slug) {
      errors.slug = "Slug in body must match the URL.";
    }
  }
  if (!slug) slug = slugify(record.name);
  if (!isValidSlug(slug)) errors.slug = "Invalid slug.";

  const name = cleanText(record.name, 200);
  if (name.length < 2) errors.name = "Name is required.";

  const type = cleanText(record.type, 20);
  if (!PRODUCT_TYPES.includes(type)) errors.type = "Invalid product type.";

  const category = cleanText(record.category, 40);
  if (!PRODUCT_CATEGORIES.includes(category)) errors.category = "Invalid product category.";

  const priceRaw = record.price;
  const price = Number(priceRaw);
  if (priceRaw === null || priceRaw === undefined || priceRaw === "" || !Number.isFinite(price) || price < 0) {
    errors.price = "Price must be a non-negative number.";
  }

  const status = cleanText(record.status, 20) || (existing && existing.status) || "published";
  if (!PRODUCT_STATUSES.includes(status)) errors.status = "Invalid status.";

  const orderRaw = record.order ?? record.sortOrder ?? record.sort_order;
  const order = Number(orderRaw);
  const sortOrder = Number.isFinite(order) ? Math.trunc(order) : Number(existing && existing.sort_order) || 0;

  const quickSpecs = asArray(record.quickSpecs)
    .slice(0, 30)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const label = cleanText(item.label, 120);
      const value = cleanText(item.value, 200);
      return label || value ? [{ label, value }] : [];
    });

  const specs = asArray(record.specs)
    .slice(0, 20)
    .flatMap((entry) => {
      const spec = asRecord(entry);
      if (!spec) return [];
      const group = cleanText(spec.group, 120);
      const items = asArray(spec.items)
        .slice(0, 50)
        .flatMap((itemEntry) => {
          const item = asRecord(itemEntry);
          if (!item) return [];
          const label = cleanText(item.label, 120);
          const value = cleanText(item.value, 200);
          return label || value ? [{ label, value }] : [];
        });
      return group || items.length ? [{ group, items }] : [];
    });

  const images = asArray(record.images)
    .slice(0, 40)
    .flatMap((entry) => {
      if (typeof entry === "string") {
        const url = cleanUrl(entry);
        return url ? [{ url, alt: "" }] : [];
      }
      const item = asRecord(entry);
      if (!item) return [];
      const url = cleanUrl(item.url ?? item.src);
      return url ? [{ url, alt: cleanText(item.alt, 200) }] : [];
    });

  const colors = asArray(record.colors)
    .slice(0, 40)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const colorName = cleanText(item.name, 80);
      const hex = cleanText(item.hex, 20);
      const image = cleanUrl(item.image);
      return colorName || hex || image ? [{ name: colorName, hex, image }] : [];
    });

  const offers = asArray(record.offers)
    .slice(0, 20)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const title = cleanText(item.title, 160);
      const description = cleanText(item.description, 500);
      const validUntil = cleanText(item.validUntil ?? item.valid_until, 10);
      return title || description || validUntil ? [{ title, description, validUntil }] : [];
    });

  const highlights = asArray(record.highlights)
    .slice(0, 20)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const title = cleanText(item.title, 160);
      const text = cleanText(item.text, 500);
      return title || text ? [{ title, text }] : [];
    });

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      slug,
      name,
      type,
      category,
      tagline: cleanText(record.tagline, 400),
      price: Number.isFinite(price) ? Math.trunc(price) : 0,
      priceNote: cleanText(record.priceNote ?? record.price_note, 120),
      badge: cleanText(record.badge, 60),
      featured: boolValue(record.featured, false),
      order: sortOrder,
      description: cleanText(record.description, 5000),
      status,
      quickSpecs,
      specs,
      images,
      colors,
      offers,
      highlights,
    },
  };
}

async function writeProduct(env, product, existing) {
  const now = new Date().toISOString();
  const createdAt = existing && existing.created_at ? existing.created_at : now;

  const statements = [
    d1Statement(
      env,
      `INSERT INTO products (
        slug, name, type, category, tagline, price, price_note, badge,
        featured, sort_order, description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        category = excluded.category,
        tagline = excluded.tagline,
        price = excluded.price,
        price_note = excluded.price_note,
        badge = excluded.badge,
        featured = excluded.featured,
        sort_order = excluded.sort_order,
        description = excluded.description,
        status = excluded.status,
        updated_at = excluded.updated_at`,
      [
        product.slug,
        product.name,
        product.type,
        product.category,
        product.tagline,
        product.price,
        product.priceNote,
        product.badge,
        product.featured ? 1 : 0,
        product.order,
        product.description,
        product.status,
        createdAt,
        now,
      ],
    ),
    d1Statement(env, "DELETE FROM product_spec_items WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_spec_groups WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_quick_specs WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_images WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_colors WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_offers WHERE product_slug = ?", [product.slug]),
    d1Statement(env, "DELETE FROM product_highlights WHERE product_slug = ?", [product.slug]),
  ];

  product.quickSpecs.forEach((item, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_quick_specs (product_slug, sort_order, label, value) VALUES (?, ?, ?, ?)",
        [product.slug, index, item.label, item.value],
      ),
    );
  });

  product.specs.forEach((group, groupIndex) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_spec_groups (product_slug, group_index, group_name) VALUES (?, ?, ?)",
        [product.slug, groupIndex, group.group],
      ),
    );
    group.items.forEach((item, itemIndex) => {
      statements.push(
        d1Statement(
          env,
          "INSERT INTO product_spec_items (product_slug, group_index, item_index, label, value) VALUES (?, ?, ?, ?, ?)",
          [product.slug, groupIndex, itemIndex, item.label, item.value],
        ),
      );
    });
  });

  product.images.forEach((image, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_images (product_slug, sort_order, url, alt) VALUES (?, ?, ?, ?)",
        [product.slug, index, image.url, image.alt],
      ),
    );
  });

  product.colors.forEach((color, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_colors (product_slug, sort_order, name, hex, image) VALUES (?, ?, ?, ?, ?)",
        [product.slug, index, color.name, color.hex, color.image],
      ),
    );
  });

  product.offers.forEach((offer, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_offers (product_slug, sort_order, title, description, valid_until) VALUES (?, ?, ?, ?, ?)",
        [product.slug, index, offer.title, offer.description, offer.validUntil],
      ),
    );
  });

  product.highlights.forEach((highlight, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO product_highlights (product_slug, sort_order, title, text) VALUES (?, ?, ?, ?)",
        [product.slug, index, highlight.title, highlight.text],
      ),
    );
  });

  await d1Batch(env, statements);
}

/* ------------------------------------------------------------------ */
/* Sale items API                                                      */
/* ------------------------------------------------------------------ */

async function handleSaleItemsApi(request, env, url, cors, segments, method) {
  if (segments.length === 1) {
    if (method === "GET") {
      const rows = await d1All(
        env,
        "SELECT id, name FROM sale_items ORDER BY sort_order ASC, name ASC",
      );
      return cachedJson(
        request,
        { ok: true, items: rows.map((row) => ({ id: row.id, name: row.name })) },
        cors,
      );
    }
    if (method === "POST") {
      requireAdmin(request, env);
      return createSaleItem(request, env, cors);
    }
    return methodNotAllowed(cors);
  }

  if (segments.length === 2) {
    const id = segments[1];
    if (method === "PUT") {
      requireAdmin(request, env);
      return upsertSaleItem(request, env, cors, id);
    }
    if (method === "DELETE") {
      requireAdmin(request, env);
      return deleteSaleItem(env, cors, id);
    }
    return methodNotAllowed(cors);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

function normalizeSaleItem(source, pathId, existing) {
  const errors = {};
  const record = asRecord(source) || {};

  let id = cleanText(record.id, 80).toLowerCase();
  if (pathId) {
    id = String(pathId).toLowerCase();
    if (record.id && cleanText(record.id, 80).toLowerCase() !== id) {
      errors.id = "Id in body must match the URL.";
    }
  }
  if (!id) id = slugify(record.name);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) errors.id = "Invalid id.";

  const name = cleanText(record.name, 120);
  if (!name) errors.name = "Name is required.";

  const orderRaw = record.sortOrder ?? record.sort_order ?? record.order;
  const orderNumber = Number(orderRaw);
  const sortOrder = Number.isFinite(orderNumber) ? Math.trunc(orderNumber) : null;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { id, name, sortOrder },
  };
}

async function createSaleItem(request, env, cors) {
  const payload = await readJson(request, MAX_PRODUCT_BYTES);
  const normalized = normalizeSaleItem(payload, null, null);
  if (!normalized.ok) return validation(cors, normalized.errors);

  const existing = await d1First(env, "SELECT id FROM sale_items WHERE id = ?", [
    normalized.value.id,
  ]);
  if (existing) {
    return json(
      { ok: false, error: "CONFLICT", message: "Sale item id already exists." },
      409,
      cors,
    );
  }

  const now = new Date().toISOString();
  let sortOrder = normalized.value.sortOrder;
  if (sortOrder === null) {
    const maxRow = await d1First(
      env,
      "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM sale_items",
    );
    sortOrder = Number(maxRow && maxRow.max_order) + 1;
  }

  await d1Run(
    env,
    "INSERT INTO sale_items (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [normalized.value.id, normalized.value.name, sortOrder, now, now],
  );

  return json(
    {
      ok: true,
      item: { id: normalized.value.id, name: normalized.value.name },
    },
    201,
    cors,
  );
}

async function upsertSaleItem(request, env, cors, id) {
  const payload = await readJson(request, MAX_PRODUCT_BYTES);
  const existing = await d1First(env, "SELECT * FROM sale_items WHERE id = ?", [id]);
  const normalized = normalizeSaleItem(payload, id, existing);
  if (!normalized.ok) return validation(cors, normalized.errors);

  const now = new Date().toISOString();
  const sortOrder =
    normalized.value.sortOrder !== null
      ? normalized.value.sortOrder
      : Number(existing && existing.sort_order) || 0;

  await d1Run(
    env,
    `INSERT INTO sale_items (id, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
    [
      normalized.value.id,
      normalized.value.name,
      sortOrder,
      existing && existing.created_at ? existing.created_at : now,
      now,
    ],
  );

  return json(
    { ok: true, item: { id: normalized.value.id, name: normalized.value.name } },
    200,
    cors,
  );
}

async function deleteSaleItem(env, cors, id) {
  const existing = await d1First(env, "SELECT * FROM sale_items WHERE id = ?", [id]);
  if (!existing) return notFound(cors, "SALE_ITEM_NOT_FOUND", "Sale item not found.");

  const refs = await d1First(
    env,
    "SELECT COUNT(*) AS count FROM sale_program_items WHERE item_id = ?",
    [id],
  );
  const count = Number(refs && refs.count) || 0;
  if (count > 0) {
    return json(
      {
        ok: false,
        error: "CONFLICT",
        message: "Sale item is used by one or more sale programs.",
        references: count,
      },
      409,
      cors,
    );
  }

  await d1Run(env, "DELETE FROM sale_items WHERE id = ?", [id]);
  return json({ ok: true, deleted: true, id }, 200, cors);
}

/* ------------------------------------------------------------------ */
/* Sale programs API                                                   */
/* ------------------------------------------------------------------ */

async function handleSaleProgramsApi(request, env, url, cors, segments, method) {
  if (segments.length === 1) {
    if (method === "GET") return listSaleProgramsResponse(request, env, cors);
    return methodNotAllowed(cors);
  }

  if (segments.length === 2) {
    const productId = segments[1];
    if (method === "GET") return getSaleProgramResponse(request, env, cors, productId);
    if (method === "PUT") {
      requireAdmin(request, env);
      return upsertSaleProgram(request, env, cors, productId);
    }
    if (method === "DELETE") {
      requireAdmin(request, env);
      return deleteSaleProgram(env, cors, productId);
    }
    return methodNotAllowed(cors);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

async function listSaleProgramsResponse(request, env, cors) {
  const programs = await loadSalePrograms(env);
  return cachedJson(request, { ok: true, programs }, cors);
}

async function getSaleProgramResponse(request, env, cors, productId) {
  const programs = await loadSalePrograms(env, productId);
  if (!programs.length) {
    return notFound(cors, "SALE_PROGRAM_NOT_FOUND", "Sale program not found.");
  }
  return cachedJson(request, { ok: true, program: programs[0] }, cors);
}

async function loadSalePrograms(env, productId) {
  const params = [];
  let where = "";
  if (productId) {
    where = " WHERE product_id = ?";
    params.push(productId);
  }

  const batch = await d1Batch(env, [
    d1Statement(
      env,
      `SELECT * FROM sale_programs${where} ORDER BY product_id ASC`,
      params,
    ),
    d1Statement(
      env,
      `SELECT * FROM sale_program_items${where} ORDER BY product_id ASC, sort_order ASC`,
      params,
    ),
    d1Statement(
      env,
      `SELECT * FROM sale_program_details${where} ORDER BY product_id ASC, sort_order ASC`,
      params,
    ),
  ]);

  const [programResult, itemResult, detailResult] = batch;
  const byProduct = new Map();

  for (const row of resultRows(programResult)) {
    byProduct.set(row.product_id, {
      productId: row.product_id,
      enabled: Boolean(row.enabled),
      percentDiscount: Number(row.percent_discount) || 0,
      flatDiscount: Number(row.flat_discount) || 0,
      items: [],
      details: [],
    });
  }

  for (const row of resultRows(itemResult)) {
    const program = byProduct.get(row.product_id);
    if (program) program.items.push({ itemId: row.item_id, note: row.note });
  }

  for (const row of resultRows(detailResult)) {
    const program = byProduct.get(row.product_id);
    if (program) program.details.push({ title: row.title, text: row.text });
  }

  return Array.from(byProduct.values());
}

function normalizeSaleProgram(source, productId, existing) {
  const errors = {};
  const record = asRecord(source) || {};

  const percentRaw = record.percentDiscount ?? record.percent_discount;
  const percentNumber = Number(percentRaw);
  const percentDiscount = Number.isFinite(percentNumber) ? Math.trunc(percentNumber) : 0;
  if (percentDiscount < 0 || percentDiscount > 100) {
    errors.percentDiscount = "percentDiscount must be between 0 and 100.";
  }

  const flatRaw = record.flatDiscount ?? record.flat_discount;
  const flatNumber = Number(flatRaw);
  const flatDiscount = Number.isFinite(flatNumber) ? Math.trunc(flatNumber) : 0;
  if (flatDiscount < 0) errors.flatDiscount = "flatDiscount must be zero or greater.";

  const items = asArray(record.items)
    .slice(0, 50)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const itemId = cleanText(item.itemId ?? item.item_id ?? item.id, 80);
      const note = cleanText(item.note, 300);
      return itemId ? [{ itemId, note }] : [];
    });

  const details = asArray(record.details)
    .slice(0, 50)
    .flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];
      const title = cleanText(item.title, 160);
      const text = cleanText(item.text, 1000);
      return title || text ? [{ title, text }] : [];
    });

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      productId,
      enabled: boolValue(record.enabled, false),
      percentDiscount,
      flatDiscount,
      items,
      details,
    },
  };
}

async function validateSaleProgramRefs(env, program) {
  const errors = {};

  const product = await d1First(env, "SELECT slug FROM products WHERE slug = ?", [
    program.productId,
  ]);
  if (!product) errors.productId = "Product does not exist.";

  if (program.items.length) {
    const ids = Array.from(new Set(program.items.map((item) => item.itemId)));
    const placeholders = ids.map(() => "?").join(",");
    const rows = await d1All(
      env,
      `SELECT id FROM sale_items WHERE id IN (${placeholders})`,
      ids,
    );
    const found = new Set(rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) errors.items = `Unknown sale item: ${missing.join(", ")}`;
  }

  return errors;
}

async function upsertSaleProgram(request, env, cors, productId) {
  const payload = await readJson(request, MAX_PRODUCT_BYTES);
  const normalized = normalizeSaleProgram(payload, productId, null);
  if (!normalized.ok) return validation(cors, normalized.errors);

  const refErrors = await validateSaleProgramRefs(env, normalized.value);
  if (Object.keys(refErrors).length) return validation(cors, refErrors);

  const now = new Date().toISOString();
  const statements = [
    d1Statement(
      env,
      `INSERT INTO sale_programs (product_id, enabled, percent_discount, flat_discount, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET
         enabled = excluded.enabled,
         percent_discount = excluded.percent_discount,
         flat_discount = excluded.flat_discount,
         updated_at = excluded.updated_at`,
      [
        productId,
        normalized.value.enabled ? 1 : 0,
        normalized.value.percentDiscount,
        normalized.value.flatDiscount,
        now,
      ],
    ),
    d1Statement(env, "DELETE FROM sale_program_items WHERE product_id = ?", [productId]),
    d1Statement(env, "DELETE FROM sale_program_details WHERE product_id = ?", [productId]),
  ];

  normalized.value.items.forEach((item, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO sale_program_items (product_id, sort_order, item_id, note) VALUES (?, ?, ?, ?)",
        [productId, index, item.itemId, item.note],
      ),
    );
  });

  normalized.value.details.forEach((detail, index) => {
    statements.push(
      d1Statement(
        env,
        "INSERT INTO sale_program_details (product_id, sort_order, title, text) VALUES (?, ?, ?, ?)",
        [productId, index, detail.title, detail.text],
      ),
    );
  });

  await d1Batch(env, statements);

  const programs = await loadSalePrograms(env, productId);
  return json({ ok: true, program: programs[0] }, 200, cors);
}

async function deleteSaleProgram(env, cors, productId) {
  const existing = await d1First(env, "SELECT product_id FROM sale_programs WHERE product_id = ?", [
    productId,
  ]);
  if (!existing) {
    return notFound(cors, "SALE_PROGRAM_NOT_FOUND", "Sale program not found.");
  }

  await d1Batch(env, [
    d1Statement(env, "DELETE FROM sale_program_details WHERE product_id = ?", [productId]),
    d1Statement(env, "DELETE FROM sale_program_items WHERE product_id = ?", [productId]),
    d1Statement(env, "DELETE FROM sale_programs WHERE product_id = ?", [productId]),
  ]);

  return json({ ok: true, deleted: true, productId }, 200, cors);
}

/* ------------------------------------------------------------------ */
/* Articles API                                                        */
/* ------------------------------------------------------------------ */

async function handleArticlesApi(request, env, url, cors, segments, method) {
  if (segments.length === 1) {
    if (method === "GET") return listArticlesResponse(request, env, url, cors);
    if (method === "POST") {
      requireAdmin(request, env);
      return createArticle(request, env, cors);
    }
    return methodNotAllowed(cors);
  }

  if (segments.length === 2) {
    const slug = segments[1];
    if (method === "GET") return getArticleResponse(request, env, cors, slug);
    if (method === "PUT") {
      requireAdmin(request, env);
      return upsertArticle(request, env, cors, slug);
    }
    if (method === "PATCH") {
      requireAdmin(request, env);
      return patchArticle(request, env, cors, slug);
    }
    if (method === "DELETE") {
      requireAdmin(request, env);
      return deleteArticle(env, cors, slug);
    }
    return methodNotAllowed(cors);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

async function listArticlesResponse(request, env, url, cors) {
  const status = cleanText(url.searchParams.get("status"), 20) || "published";
  if (![...ARTICLE_STATUSES, "all"].includes(status)) {
    return validation(cors, { status: "Invalid status." });
  }
  if (status !== "published") requireAdmin(request, env);

  const category = cleanText(url.searchParams.get("category"), 100);
  const limit = parseLimit(url.searchParams.get("limit"), 20, 100);
  const offset = parseOffset(url.searchParams.get("offset"));

  let sql =
    "SELECT slug, title, excerpt, category, cover_image, status, author, seo_title, seo_description, published_at, created_at, updated_at FROM articles WHERE 1 = 1";
  const params = [];

  if (status !== "all") {
    sql += " AND status = ?";
    params.push(status);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += " ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = await d1All(env, sql, params);
  const articles = rows.map((row) => rowToArticle(row, false));

  // Draft/archived listings are admin-only; never let a shared cache store them.
  if (status !== "published") return json({ ok: true, articles }, 200, cors);
  return cachedJson(request, { ok: true, articles }, cors);
}

async function getArticleResponse(request, env, cors, slug) {
  const row = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [slug]);
  if (!row) return notFound(cors, "ARTICLE_NOT_FOUND", "Article not found.");

  const isPublic = row.status === "published";
  if (!isPublic) requireAdmin(request, env);

  const article = rowToArticle(row, true);
  if (!isPublic) return json({ ok: true, article }, 200, cors);
  return cachedJson(request, { ok: true, article }, cors);
}

async function createArticle(request, env, cors) {
  const payload = await readJson(request, MAX_ARTICLE_BYTES);
  const normalized = normalizeArticle(payload, null, null);
  if (!normalized.ok) return validation(cors, normalized.errors);

  const existing = await d1First(env, "SELECT slug FROM articles WHERE slug = ?", [
    normalized.value.slug,
  ]);
  if (existing) {
    return json(
      { ok: false, error: "CONFLICT", message: "Article slug already exists." },
      409,
      cors,
    );
  }

  await writeArticle(env, normalized.value, null);
  const row = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [
    normalized.value.slug,
  ]);
  return json({ ok: true, article: rowToArticle(row, true) }, 201, cors);
}

async function upsertArticle(request, env, cors, slug) {
  const payload = await readJson(request, MAX_ARTICLE_BYTES);
  const existing = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [slug]);
  const normalized = normalizeArticle(payload, slug, existing);
  if (!normalized.ok) return validation(cors, normalized.errors);

  await writeArticle(env, normalized.value, existing);
  const row = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [
    normalized.value.slug,
  ]);
  return json({ ok: true, article: rowToArticle(row, true) }, 200, cors);
}

async function patchArticle(request, env, cors, slug) {
  const existing = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [slug]);
  if (!existing) return notFound(cors, "ARTICLE_NOT_FOUND", "Article not found.");

  const payload = (await readJson(request, MAX_ARTICLE_BYTES)) || {};
  const merged = articleSourceFromRow(existing);
  if (payload.status !== undefined) merged.status = payload.status;
  if (payload.publishedAt !== undefined) merged.publishedAt = payload.publishedAt;
  if (payload.published_at !== undefined) merged.publishedAt = payload.published_at;

  const normalized = normalizeArticle(merged, slug, existing);
  if (!normalized.ok) return validation(cors, normalized.errors);

  await writeArticle(env, normalized.value, existing);
  const row = await d1First(env, "SELECT * FROM articles WHERE slug = ?", [slug]);
  return json({ ok: true, article: rowToArticle(row, true) }, 200, cors);
}

async function deleteArticle(env, cors, slug) {
  const existing = await d1First(env, "SELECT slug FROM articles WHERE slug = ?", [slug]);
  if (!existing) return notFound(cors, "ARTICLE_NOT_FOUND", "Article not found.");

  await d1Run(env, "DELETE FROM articles WHERE slug = ?", [slug]);
  return json({ ok: true, deleted: true, slug }, 200, cors);
}

function articleSourceFromRow(row) {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    coverImage: row.cover_image,
    contentHtml: row.content_html,
    status: row.status,
    author: row.author,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
  };
}

function rowToArticle(row, includeContent) {
  const article = {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    coverImage: row.cover_image,
    status: row.status,
    author: row.author,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeContent) article.contentHtml = sanitizeHtml(row.content_html);
  return article;
}

function normalizeArticle(source, pathSlug, existing) {
  const errors = {};
  const record = asRecord(source) || {};

  let slug = cleanText(record.slug, 120).toLowerCase();
  if (pathSlug) {
    slug = String(pathSlug).toLowerCase();
    if (record.slug && cleanText(record.slug, 120).toLowerCase() !== slug) {
      errors.slug = "Slug in body must match the URL.";
    }
  }
  if (!slug) slug = slugify(record.title);
  if (!isValidSlug(slug)) errors.slug = "Invalid slug.";

  const title = cleanText(record.title, 200);
  if (!title) errors.title = "Title is required.";

  const status = cleanText(record.status, 20) || (existing && existing.status) || "draft";
  if (!ARTICLE_STATUSES.includes(status)) errors.status = "Invalid status.";

  const rawHtml = String(
    record.contentHtml ?? record.content_html ?? record.html ?? "",
  );
  if (new TextEncoder().encode(rawHtml).length > MAX_HTML_BYTES) {
    errors.contentHtml = "Content is too large (max 200 KB).";
  }
  const contentHtml = sanitizeHtml(rawHtml);

  const rawCover = String(record.coverImage ?? record.cover_image ?? record.image ?? "");
  const coverImage = rawCover.trim() ? cleanUrl(rawCover) : "";
  if (rawCover.trim() && !coverImage) errors.coverImage = "Invalid cover image URL.";

  const excerpt =
    cleanText(record.excerpt, 500) || stripHtml(contentHtml).slice(0, 180);

  let publishedAt = normalizeDate(
    record.publishedAt ?? record.published_at ?? (existing && existing.published_at) ?? "",
  );
  const publishedRaw = record.publishedAt ?? record.published_at;
  if (publishedRaw !== undefined && String(publishedRaw).trim() && !publishedAt) {
    errors.publishedAt = "Invalid published date.";
  }
  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      slug,
      title,
      excerpt,
      category: cleanText(record.category, 100),
      coverImage,
      contentHtml,
      status,
      author: cleanText(record.author, 120),
      seoTitle: cleanText(record.seoTitle ?? record.seo_title, 200) || title,
      seoDescription:
        cleanText(record.seoDescription ?? record.seo_description, 300) || excerpt,
      publishedAt,
    },
  };
}

async function writeArticle(env, article, existing) {
  const now = new Date().toISOString();
  const createdAt = existing && existing.created_at ? existing.created_at : now;

  await d1Run(
    env,
    `INSERT INTO articles (
      slug, title, excerpt, category, cover_image, content_html, status, author,
      seo_title, seo_description, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      category = excluded.category,
      cover_image = excluded.cover_image,
      content_html = excluded.content_html,
      status = excluded.status,
      author = excluded.author,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at`,
    [
      article.slug,
      article.title,
      article.excerpt,
      article.category,
      article.coverImage,
      article.contentHtml,
      article.status,
      article.author,
      article.seoTitle,
      article.seoDescription,
      article.publishedAt || null,
      createdAt,
      now,
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Media API (R2)                                                      */
/* ------------------------------------------------------------------ */

async function handleMediaApi(request, env, url, cors, segments, method) {
  if (segments.length === 1 && method === "GET") {
    requireAdmin(request, env);
    const limit = parseLimit(url.searchParams.get("limit"), 50, 100);
    const offset = parseOffset(url.searchParams.get("offset"));
    const rows = await d1All(
      env,
      "SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );
    return json({ ok: true, media: rows.map(rowToMedia) }, 200, cors);
  }

  if (segments.length === 2) {
    const id = segments[1];
    if (method === "PATCH") {
      requireAdmin(request, env);
      return patchMedia(request, env, cors, id);
    }
    if (method === "DELETE") {
      requireAdmin(request, env);
      return deleteMedia(env, cors, id);
    }
    return methodNotAllowed(cors);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
}

async function patchMedia(request, env, cors, id) {
  const existing = await d1First(env, "SELECT * FROM media WHERE id = ?", [id]);
  if (!existing) return notFound(cors, "MEDIA_NOT_FOUND", "Media not found.");

  const payload = (await readJson(request, MAX_PRODUCT_BYTES)) || {};
  const alt = cleanText(payload.alt, 300);
  await d1Run(env, "UPDATE media SET alt = ? WHERE id = ?", [alt, id]);

  return json({ ok: true, media: rowToMedia({ ...existing, alt }) }, 200, cors);
}

async function deleteMedia(env, cors, id) {
  const existing = await d1First(env, "SELECT * FROM media WHERE id = ?", [id]);
  if (!existing) return notFound(cors, "MEDIA_NOT_FOUND", "Media not found.");

  const bucket = requireR2(env);
  try {
    await bucket.delete(existing.r2_key);
  } catch (error) {
    console.error("R2 delete failed:", error && error.stack ? error.stack : error);
  }

  await d1Run(env, "DELETE FROM media WHERE id = ?", [id]);
  return json({ ok: true, deleted: true, id }, 200, cors);
}

function rowToMedia(row) {
  return {
    id: row.id,
    key: row.r2_key,
    url: row.url,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes) || 0,
    alt: row.alt,
    createdAt: row.created_at,
  };
}

async function handleUploads(request, env, cors) {
  requireAdmin(request, env);

  const ip = clientIp(request);
  if (rateLimited(ip, "upload", UPLOAD_RATE_MAX, RATE_WINDOW_MS)) {
    return json({ ok: false, error: "RATE_LIMITED" }, 429, cors);
  }

  const contentType = String(request.headers.get("Content-Type") || "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json(
      { ok: false, error: "UNSUPPORTED_MEDIA_TYPE", message: "Use multipart/form-data." },
      415,
      cors,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > MAX_UPLOAD_TOTAL_BYTES + 1024 * 1024) {
    return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413, cors);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "INVALID_FORM_DATA" }, 400, cors);
  }

  const files = form
    .getAll("file")
    .filter((value) => value && typeof value === "object" && typeof value.arrayBuffer === "function");

  if (!files.length) {
    return validation(cors, { file: "At least one file is required." });
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return validation(cors, { file: `At most ${MAX_UPLOAD_FILES} files per request.` });
  }

  const alt = cleanText(form.get("alt"), 300);
  const validated = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return json({ ok: false, error: "PAYLOAD_TOO_LARGE", message: "Each file must be <= 10 MB." }, 413, cors);
    }

    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const detected = detectImageType(head);
    const declared = String(file.type || "").toLowerCase();
    const mime = IMAGE_MIME_TYPES[declared] ? declared : detected;

    if (!IMAGE_MIME_TYPES[mime] || !detected || detected !== mime) {
      return json(
        {
          ok: false,
          error: "UNSUPPORTED_MEDIA_TYPE",
          message: "Only JPEG, PNG, WebP, or AVIF images are allowed.",
        },
        415,
        cors,
      );
    }

    validated.push({ file, mime, extension: IMAGE_MIME_TYPES[mime] });
  }

  const bucket = requireR2(env);
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace("-", "/");
  const uploaded = [];

  for (const entry of validated) {
    const key = `uploads/${yearMonth}/${crypto.randomUUID()}.${entry.extension}`;
    const filename = cleanText(entry.file.name || "upload", 200);

    await bucket.put(key, entry.file.stream(), {
      httpMetadata: {
        contentType: entry.mime,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { originalName: filename, alt },
    });

    const id = crypto.randomUUID();
    const url = mediaUrl(env, request, key);
    const createdAt = new Date().toISOString();

    await d1Run(
      env,
      `INSERT INTO media (id, r2_key, url, filename, mime_type, size_bytes, alt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, key, url, filename, entry.mime, entry.file.size, alt, createdAt],
    );

    uploaded.push({
      id,
      key,
      url,
      filename,
      mimeType: entry.mime,
      sizeBytes: entry.file.size,
      alt,
      createdAt,
    });
  }

  return json({ ok: true, files: uploaded }, 201, cors);
}

function mediaUrl(env, request, key) {
  const configured = String(env.MEDIA_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  const base = configured || `${new URL(request.url).origin}/media`;
  return `${base}/${key}`;
}

function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brands = ascii(bytes, 8, 32);
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
  }
  return "";
}

function ascii(bytes, start, end) {
  let value = "";
  for (let i = start; i < end && i < bytes.length; i += 1) {
    value += String.fromCharCode(bytes[i]);
  }
  return value;
}

async function handleMediaRequest(request, env, url, cors) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed(cors);
  }

  const rawKey = url.pathname.slice("/media/".length);
  if (!rawKey) return json({ ok: false, error: "NOT_FOUND" }, 404, cors);

  let key;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return json({ ok: false, error: "NOT_FOUND" }, 400, cors);
  }
  if (key.includes("..") || key.startsWith("/")) {
    return json({ ok: false, error: "NOT_FOUND" }, 404, cors);
  }

  const bucket = requireR2(env);
  const object = await bucket.get(key);
  if (!object) return json({ ok: false, error: "NOT_FOUND" }, 404, cors);

  const etag = object.httpEtag || (object.etag ? `"${object.etag}"` : "");
  if (etag && request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...cors, ETag: etag, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  const headers = {
    ...cors,
    "Content-Type":
      (object.httpMetadata && object.httpMetadata.contentType) || "application/octet-stream",
    "Content-Length": String(object.size ?? ""),
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Content-Disposition": "inline",
  };

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

/* ------------------------------------------------------------------ */
/* HTML sanitizer                                                      */
/* ------------------------------------------------------------------ */

const HTML_ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "ins",
  "blockquote", "ul", "ol", "li",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "code", "pre", "span", "div", "sup", "sub",
]);

const HTML_DROP_CONTENT_TAGS = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed",
  "applet", "form", "input", "button", "select", "textarea", "option",
  "link", "meta", "base", "svg", "math", "template", "noscript",
]);

const HTML_VOID_TAGS = new Set(["br", "hr", "img"]);

// Void elements in the drop list must not consume the rest of the document.
const HTML_DROP_VOID_TAGS = new Set([
  "input", "link", "meta", "base", "embed", "frame",
  "track", "source", "area", "col", "param", "wbr",
]);

const HTML_ATTR_ALLOWLIST = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

const HTML_NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\u00a0",
  colon: ":",
  sol: "/",
  newline: "\n",
  tab: "\t",
};

function sanitizeHtml(value, maxChars) {
  const limit = maxChars || MAX_HTML_CHARS;
  let html = String(value === null || value === undefined ? "" : value).replace(/\u0000/g, "");
  if (html.length > limit) html = html.slice(0, limit);

  let output = "";
  let index = 0;

  while (index < html.length) {
    const lt = html.indexOf("<", index);
    if (lt === -1) {
      output += escapeHtmlText(html.slice(index));
      break;
    }

    output += escapeHtmlText(html.slice(index, lt));

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }

    if (html.startsWith("<![CDATA[", lt)) {
      const end = html.indexOf("]]>", lt + 9);
      index = end === -1 ? html.length : end + 3;
      continue;
    }

    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt + 2);
      index = end === -1 ? html.length : end + 1;
      continue;
    }

    const tag = readHtmlTag(html, lt);
    if (!tag) {
      output += "&lt;";
      index = lt + 1;
      continue;
    }

    index = tag.end;
    const name = tag.name;

    if (HTML_DROP_CONTENT_TAGS.has(name)) {
      if (!tag.closing && !tag.selfClosing && !HTML_DROP_VOID_TAGS.has(name)) {
        index = skipHtmlElement(html, index, name);
      }
      continue;
    }

    if (!HTML_ALLOWED_TAGS.has(name)) {
      continue;
    }

    if (tag.closing) {
      if (!HTML_VOID_TAGS.has(name)) output += `</${name}>`;
      continue;
    }

    const attrs = buildHtmlAttrs(name, tag.attrsRaw);
    if (HTML_VOID_TAGS.has(name)) {
      output += `<${name}${attrs}>`;
      continue;
    }

    output += tag.selfClosing ? `<${name}${attrs}></${name}>` : `<${name}${attrs}>`;
  }

  return output;
}

function readHtmlTag(input, start) {
  let index = start + 1;
  let quote = "";

  while (index < input.length) {
    const char = input[index];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === ">") {
      break;
    }
    index += 1;
  }

  if (index >= input.length) return null;

  const raw = input.slice(start + 1, index);
  const closing = raw.startsWith("/");
  let body = closing ? raw.slice(1) : raw;
  const selfClosing = /\/\s*$/.test(body);
  if (selfClosing) body = body.replace(/\/\s*$/, "");

  const match = /^\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(body);
  if (!match) return { invalid: true, end: index + 1 };

  return {
    name: match[1].toLowerCase(),
    attrsRaw: body.slice(match[0].length),
    closing,
    selfClosing,
    end: index + 1,
  };
}

function skipHtmlElement(input, start, name) {
  const lower = input.toLowerCase();
  const open = `<${name}`;
  const close = `</${name}`;
  let depth = 1;
  let index = start;

  while (index < input.length) {
    const nextOpen = lower.indexOf(open, index);
    const nextClose = lower.indexOf(close, index);

    if (nextClose === -1) return input.length;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = lower[nextOpen + open.length];
      if (after === undefined || /[\s/>]/.test(after)) {
        const tag = readHtmlTag(input, nextOpen);
        if (tag) {
          if (!tag.closing && !tag.selfClosing) depth += 1;
          index = tag.end;
          continue;
        }
      }
      index = nextOpen + open.length;
      continue;
    }

    const after = lower[nextClose + close.length];
    if (after === undefined || /[\s>]/.test(after)) {
      depth -= 1;
      const tag = readHtmlTag(input, nextClose);
      index = tag ? tag.end : nextClose + close.length;
      if (depth <= 0) return index;
      continue;
    }
    index = nextClose + close.length;
  }

  return input.length;
}

function buildHtmlAttrs(tagName, raw) {
  const allowed = HTML_ATTR_ALLOWLIST[tagName];
  if (!allowed) return "";

  const kept = new Map();

  for (const [rawName, rawValue] of parseHtmlAttrs(raw)) {
    if (!allowed.has(rawName)) continue;
    const clean = sanitizeHtmlAttr(rawName, rawValue);
    if (clean === null) continue;
    kept.set(rawName, clean);
  }

  if (tagName === "a" && kept.get("target") === "_blank" && !kept.has("rel")) {
    kept.set("rel", "noopener noreferrer");
  }

  let result = "";
  for (const [name, value] of kept) {
    result += ` ${name}="${escapeHtmlAttr(value)}"`;
  }
  return result;
}

function parseHtmlAttrs(raw) {
  const attrs = [];
  const regex = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = regex.exec(raw))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.push([name, value]);
  }

  return attrs;
}

function sanitizeHtmlAttr(name, value) {
  if (name.startsWith("on") || name === "style" || name === "id" || name.startsWith("data-")) {
    return null;
  }

  if (name === "href") return sanitizeUrl(value, true);
  if (name === "src") return sanitizeUrl(value, false);
  if (name === "target") return value === "_blank" || value === "_self" ? value : null;
  if (name === "rel") {
    const tokens = String(value)
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => ["noopener", "noreferrer", "nofollow"].includes(token));
    return tokens.length ? tokens.join(" ") : null;
  }
  if (name === "width" || name === "height") {
    return /^\d{1,4}%?$/.test(value) ? value : null;
  }
  if (name === "loading") {
    return value === "lazy" || value === "eager" ? value : null;
  }
  if (name === "colspan" || name === "rowspan") {
    return /^\d{1,3}$/.test(value) ? value : null;
  }

  return decodeHtmlEntities(value);
}

function sanitizeUrl(raw, allowMailto) {
  const decoded = decodeHtmlEntities(String(raw))
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .trim();
  if (!decoded) return null;

  const lower = decoded.toLowerCase();
  if (/^(javascript|vbscript|data|file|blob):/.test(lower)) return null;
  if (/^https?:\/\//.test(lower)) return decoded;
  if (allowMailto && /^mailto:/.test(lower)) return decoded;
  if (decoded.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
  if (
    decoded.startsWith("/") ||
    decoded.startsWith("./") ||
    decoded.startsWith("../") ||
    decoded.startsWith("#")
  ) {
    return decoded;
  }
  return null;
}

function decodeHtmlEntities(value) {
  return String(value).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
    if (code.startsWith("#")) {
      const hex = code[1] === "x" || code[1] === "X";
      const number = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (Number.isFinite(number) && number > 0 && number <= 0x10ffff) {
        return String.fromCodePoint(number);
      }
      return match;
    }
    const key = code.toLowerCase();
    return Object.prototype.hasOwnProperty.call(HTML_NAMED_ENTITIES, key)
      ? HTML_NAMED_ENTITIES[key]
      : match;
  });
}

function escapeHtmlText(value) {
  return String(value).replace(/</g, "&lt;");
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-zA-Z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* D1 helpers                                                          */
/* ------------------------------------------------------------------ */

function requireDb(env) {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    throw httpError(503, "DB_NOT_CONFIGURED", "D1 binding DB is not configured.");
  }
  return env.DB;
}

function requireR2(env) {
  if (!env.MEDIA || typeof env.MEDIA.put !== "function") {
    throw httpError(503, "R2_NOT_CONFIGURED", "R2 binding MEDIA is not configured.");
  }
  return env.MEDIA;
}

function d1Statement(env, sql, params) {
  return requireDb(env)
    .prepare(sql)
    .bind(...(params || []));
}

async function d1All(env, sql, params) {
  const result = await d1Statement(env, sql, params).all();
  return resultRows(result);
}

async function d1First(env, sql, params) {
  const row = await d1Statement(env, sql, params).first();
  return row || null;
}

async function d1Run(env, sql, params) {
  return d1Statement(env, sql, params).run();
}

async function d1Batch(env, statements) {
  if (!statements.length) return [];
  return requireDb(env).batch(statements);
}

function resultRows(result) {
  return (result && result.results) || [];
}

/* ------------------------------------------------------------------ */
/* Lead handling                                                       */
/* ------------------------------------------------------------------ */

async function handleLead(payload, env, ip) {
  const clean = cleanLead(payload, env);
  if (!clean.ok) return { ok: false, error: "VALIDATION", fields: clean.errors };
  if (clean.spam) return { ok: true, ignored: true };

  const tab = env.LEADS_TAB || "Leads";
  await ensureSheet(env, tab, LEAD_HEADERS);

  const duplicate = await findRecentDuplicate(env, tab, clean.phone, clean.formType);
  if (duplicate) return { ok: true, duplicate: true, leadId: duplicate };

  const leadId = generateLeadId(env);
  const now = new Date().toISOString();
  const row = [
    leadId,
    now,
    clean.formType,
    clean.fullName,
    clean.phone,
    clean.email,
    clean.vehicle,
    clean.vehicleSlug,
    clean.showroom,
    clean.preferredDate,
    clean.preferredTime,
    clean.serviceType,
    clean.message,
    clean.consent,
    clean.consentVersion,
    clean.pagePath,
    clean.referrer,
    clean.utmSource,
    clean.utmMedium,
    clean.utmCampaign,
    clean.utmContent,
    clean.utmTerm,
    clean.clickId,
    clean.device,
    clean.browser,
    clean.sessionId,
    await hashIp(ip, env),
    "New",
    "",
    "",
    "",
    now,
  ];

  await appendRow(env, tab, LEAD_HEADERS, row);
  return { ok: true, leadId };
}

function cleanLead(payload, env) {
  const errors = {};
  const source = payload && typeof payload === "object" ? payload : {};

  const formType = cleanText(source.formType, 30) || "contact";
  if (!FORM_TYPES.includes(formType)) errors.formType = "Invalid form type.";

  const fullName = cleanText(source.fullName, 80);
  if (fullName.length < 2) errors.fullName = "Name is required.";

  const phone = normalizePhone(source.phone);
  if (!/^0\d{9,10}$/.test(phone) && !/^84\d{9,10}$/.test(phone)) {
    errors.phone = "Invalid phone.";
  }

  const email = cleanText(source.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email.";

  const consent = isTrue(source.consent);
  if (!consent) errors.consent = "Consent is required.";

  const elapsedMs = Number(source.elapsedMs || 0);
  if (elapsedMs && elapsedMs < 1000) errors.elapsedMs = "Submitted too quickly.";

  const preferredDate = cleanText(source.preferredDate, 10);
  const today = todayInTimeZone(env);
  if (preferredDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) {
      errors.preferredDate = "Invalid date.";
    }
  }
  if ((formType === "test_drive" || formType === "service") && !preferredDate) {
    errors.preferredDate = "Date is required.";
  }

  const vehicleSlug = cleanText(source.vehicleSlug, 80);
  if (["test_drive", "service", "quote"].includes(formType) && !vehicleSlug) {
    errors.vehicleSlug = "Vehicle is required.";
  }

  const serviceType = Array.isArray(source.serviceType)
    ? source.serviceType.map((item) => cleanText(item, 50)).filter(Boolean).join(", ")
    : cleanText(source.serviceType, 200);
  if (formType === "service" && !serviceType) errors.serviceType = "Service type is required.";

  const utm = source.utm && typeof source.utm === "object" ? source.utm : {};

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    spam: Boolean(cleanText(source.company_website, 120)),
    formType,
    fullName,
    phone,
    email,
    vehicle: VEHICLE_NAMES[vehicleSlug] || cleanText(source.vehicle, 120),
    vehicleSlug,
    showroom: cleanText(source.showroom, 120) || cleanText(env.DEFAULT_SHOWROOM, 120) || "VinFast Demo",
    preferredDate,
    preferredTime: cleanText(source.preferredTime, 10),
    serviceType,
    message: cleanText(source.message, 1000),
    consent,
    consentVersion: cleanText(source.consentVersion, 30),
    pagePath: cleanText(source.pagePath, 300),
    referrer: cleanText(source.referrer, 500),
    utmSource: cleanText(utm.source || source.utmSource, 100),
    utmMedium: cleanText(utm.medium || source.utmMedium, 100),
    utmCampaign: cleanText(utm.campaign || source.utmCampaign, 150),
    utmContent: cleanText(utm.content || source.utmContent, 150),
    utmTerm: cleanText(utm.term || source.utmTerm, 150),
    clickId: cleanText(source.clickId, 200),
    device: cleanText(source.device, 40),
    browser: cleanText(source.browser, 90),
    sessionId: cleanText(source.sessionId, 80),
  };
}

/* ------------------------------------------------------------------ */
/* Event handling                                                      */
/* ------------------------------------------------------------------ */

async function handleEvent(payload, env) {
  if (!envBool(env.ENABLE_EVENTS, true)) return { ok: true, ignored: true };

  const source = payload && typeof payload === "object" ? payload : {};
  const eventName = cleanText(source.event, 60);
  if (!EVENT_NAMES.includes(eventName)) {
    return { ok: false, error: "INVALID_EVENT" };
  }

  const utm = source.utm && typeof source.utm === "object" ? source.utm : {};
  const tab = env.EVENTS_TAB || "Events";
  const row = [
    `EV-${randomHex(4).toUpperCase()}`,
    new Date().toISOString(),
    eventName,
    cleanText(source.sessionId, 80),
    cleanText(source.pagePath, 300),
    cleanText(source.pageTitle, 200),
    cleanText(source.vehicle || source.vehicleSlug, 80),
    cleanText(source.label, 120),
    JSON.stringify(source).slice(0, 2000),
    cleanText(source.referrer, 500),
    cleanText(utm.source || source.utmSource, 100),
    cleanText(utm.medium || source.utmMedium, 100),
    cleanText(utm.campaign || source.utmCampaign, 150),
    cleanText(source.device, 40),
    cleanText(source.browser, 90),
  ];

  await appendRow(env, tab, EVENT_HEADERS, row);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Google auth + Sheets API                                            */
/* ------------------------------------------------------------------ */

function parseServiceAccount(env) {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON && typeof env.GOOGLE_SERVICE_ACCOUNT_JSON === "string") {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    const encoded = String(env.GOOGLE_SERVICE_ACCOUNT_JSON_B64).replace(/\s+/g, "");
    return JSON.parse(atob(encoded));
  }

  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: String(env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n"),
    };
  }

  throw new Error("Missing Google service account credentials.");
}

async function getAccessToken(env) {
  if (tokenCache && tokenCache.value && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.value;
  }

  const serviceAccount = parseServiceAccount(env);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Invalid service account JSON: client_email/private_key missing.");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64urlFromString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64urlFromString(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64urlFromBytes(new Uint8Array(signature))}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google token ${response.status}: ${data.error_description || data.error || "failed"}`);
  }
  if (!data.access_token) throw new Error("Google token response did not include access_token.");

  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000,
  };
  return tokenCache.value;
}

async function importPrivateKey(pem) {
  const base64 = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sheetsRequest(env, path, init = {}) {
  const token = await getAccessToken(env);
  const sheetId = getSheetId(env);
  const response = await fetch(`${SHEETS_API}/${encodeURIComponent(sheetId)}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) || `Sheets API ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data && data.error ? data.error.status : "";
    error.sheet = true;
    throw error;
  }
  return data || {};
}

async function ensureSheet(env, tab, headers) {
  const cacheKey = `${getSheetId(env)}:${tab}`;
  if (readySheets.has(cacheKey)) return;

  const meta = await sheetsRequest(env, "?fields=sheets.properties");
  const exists = (meta.sheets || []).some(
    (sheet) => sheet.properties && sheet.properties.title === tab,
  );

  if (!exists) {
    await sheetsRequest(env, ":batchUpdate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tab } } }],
      }),
    });
  }

  const headerRange = `${quoteSheet(tab)}!A1:${columnLetter(headers.length)}1`;
  const current = await sheetsRequest(env, `/values/${encodeURIComponent(headerRange)}`);
  const firstRow = (current.values && current.values[0]) || [];
  const hasHeader = firstRow.some((value) => String(value || "").trim() !== "");

  if (!hasHeader) {
    await sheetsRequest(
      env,
      `/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [headers] }),
      },
    );
  }

  readySheets.add(cacheKey);
}

async function appendValues(env, tab, headers, row) {
  const range = `${quoteSheet(tab)}!A:${columnLetter(headers.length)}`;
  await sheetsRequest(
    env,
    `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    },
  );
}

async function appendRow(env, tab, headers, row) {
  try {
    await ensureSheet(env, tab, headers);
    await appendValues(env, tab, headers, row);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (error && (error.status === 404 || /unable to parse range|not found/i.test(message))) {
      readySheets.delete(`${getSheetId(env)}:${tab}`);
      await ensureSheet(env, tab, headers);
      await appendValues(env, tab, headers, row);
      return;
    }
    throw error;
  }
}

async function findRecentDuplicate(env, tab, phone, formType) {
  const range = `${quoteSheet(tab)}!A2:AF`;
  const data = await sheetsRequest(
    env,
    `/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  const rows = Array.isArray(data.values) ? data.values : [];
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  const start = Math.max(0, rows.length - DUPLICATE_SCAN_ROWS);

  for (let i = rows.length - 1; i >= start; i -= 1) {
    const row = rows[i];
    if (String(row[2] || "") !== formType) continue;
    if (normalizePhone(row[4]) !== phone) continue;
    const created = parseSheetDate(row[1]);
    if (created && created.getTime() >= cutoff) return String(row[0] || "");
  }
  return "";
}

function parseSheetDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw.replace(" ", "T")}+07:00`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ------------------------------------------------------------------ */
/* Auth + HTTP helpers                                                 */
/* ------------------------------------------------------------------ */

function requireAdmin(request, env) {
  const token = String(env.ADMIN_TOKEN || "");
  if (!token) {
    throw httpError(503, "ADMIN_NOT_CONFIGURED", "ADMIN_TOKEN is not configured.");
  }

  const header = String(request.headers.get("Authorization") || "");
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !timingSafeEqual(provided, token)) {
    throw httpError(401, "UNAUTHORIZED", "A valid Bearer admin token is required.");
  }
}

function timingSafeEqual(left, right) {
  const a = new TextEncoder().encode(String(left));
  const b = new TextEncoder().encode(String(right));
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] || 0) ^ (b[i] || 0);
  }
  return diff === 0;
}

function httpError(status, code, message, extra) {
  const error = new Error(message || code);
  error.status = status;
  error.code = code;
  if (extra) error.extra = extra;
  return error;
}

function errorResponse(error, cors) {
  if (error && error.sheet) {
    const denied = error.status === 403 || error.code === "PERMISSION_DENIED";
    const notFound = error.status === 404;
    const code = denied ? "SHEET_PERMISSION_DENIED" : notFound ? "SHEET_NOT_FOUND" : "SERVER_ERROR";
    return json(
      {
        ok: false,
        error: code,
        message: denied
          ? "Share the Google Sheet with the service account email as Editor."
          : notFound
            ? "Check SHEET_ID and the tab name in the Worker variables."
            : String(error.message || error).slice(0, 400),
      },
      denied ? 403 : notFound ? 404 : 500,
      cors,
    );
  }

  if (error && error.status) {
    return json(
      {
        ok: false,
        error: error.code || "SERVER_ERROR",
        message: error.message || "",
        ...(error.extra || {}),
      },
      error.status,
      cors,
    );
  }

  const message = String(error && error.message ? error.message : error);
  if (message === "BODY_TOO_LARGE") {
    return json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, 413, cors);
  }
  if (message === "INVALID_JSON") {
    return json({ ok: false, error: "INVALID_JSON" }, 400, cors);
  }

  return json(
    { ok: false, error: "SERVER_ERROR", message: message.slice(0, 400) },
    500,
    cors,
  );
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, If-None-Match",
    "Access-Control-Expose-Headers": "ETag, Content-Length",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
  if (origin && isOriginAllowed(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function isOriginAllowed(origin, env) {
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (!configured.length) {
    return origin === "http://localhost:4321" || origin === "http://127.0.0.1:4321";
  }
  return configured.includes("*") || configured.includes(origin.replace(/\/+$/, ""));
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(headers || {}),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function cachedJson(request, body, cors) {
  const text = JSON.stringify(body);
  const etag = `"${await sha256Hex(text)}"`;

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...cors,
        ETag: etag,
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  }

  return new Response(text, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validation(cors, fields) {
  return json(
    { ok: false, error: "VALIDATION", message: "Invalid payload.", fields },
    400,
    cors,
  );
}

function notFound(cors, code, message) {
  return json({ ok: false, error: code || "NOT_FOUND", message: message || "Not found." }, 404, cors);
}

function methodNotAllowed(cors) {
  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, cors);
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, maxLength) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .slice(0, maxLength || 500);
}

function cleanUrl(value) {
  const raw = cleanText(value, 1000);
  if (!raw) return "";
  return sanitizeUrl(raw, false) || "";
}

function boolValue(value, fallback) {
  if (value === null || value === undefined || value === "") return Boolean(fallback);
  return isTrue(value);
}

function isValidSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value)) && String(value).length <= 120;
}

function slugify(value) {
  return String(value === null || value === undefined ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeDate(value) {
  const raw = cleanText(value, 40);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function parseLimit(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return Math.min(fallback, max);
  return Math.min(Math.trunc(number), max);
}

function parseOffset(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

async function readJson(request, maxBytes) {
  const limit = maxBytes || MAX_LEAD_BYTES;
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > limit) throw new Error("BODY_TOO_LARGE");
  const body = await request.text();
  if (body.length > limit) throw new Error("BODY_TOO_LARGE");
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function rateLimited(ip, bucket, max, windowMs) {
  const bucketName = bucket || "lead";
  const limit = max || RATE_MAX_REQUESTS;
  const window = windowMs || RATE_WINDOW_MS;
  const key = `${bucketName}:${ip || "unknown"}`;
  const now = Date.now();
  const times = (rateBuckets.get(key) || []).filter((time) => now - time < window);

  if (times.length >= limit) {
    rateBuckets.set(key, times);
    return true;
  }

  times.push(now);
  rateBuckets.set(key, times);

  if (rateBuckets.size > 2000) {
    for (const [bucketKey, values] of rateBuckets) {
      if (!values.some((time) => now - time < window)) rateBuckets.delete(bucketKey);
    }
  }
  return false;
}

function clientIp(request) {
  const forwarded = request.headers.get("X-Forwarded-For");
  return (
    request.headers.get("CF-Connecting-IP") ||
    (forwarded ? forwarded.split(",")[0].trim() : "") ||
    ""
  );
}

async function hashIp(ip, env) {
  if (!ip) return "";
  const salt = String(env.IP_HASH_SALT || "vinfast-demo");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function generateLeadId(env) {
  return `LD-${todayInTimeZone(env).replace(/-/g, "")}-${randomHex(4).toUpperCase().slice(0, 6)}`;
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function todayInTimeZone(env) {
  const timeZone = env.TIMEZONE || "Asia/Ho_Chi_Minh";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function quoteSheet(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

function getSheetId(env) {
  const id = String(env.SHEET_ID || "").trim();
  if (!id) throw new Error("Missing SHEET_ID.");
  return id;
}

function columnLetter(index) {
  let number = Number(index);
  let result = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result || "A";
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isTrue(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function envBool(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function base64urlFromString(value) {
  return base64urlFromBytes(new TextEncoder().encode(value));
}

function base64urlFromBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
