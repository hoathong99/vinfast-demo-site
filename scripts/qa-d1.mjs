import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../backend/worker.js";

/*
 * Offline QA for the D1 + R2 CMS routes. Uses node:sqlite as a fake D1
 * database and an in-memory R2 bucket. No network or Cloudflare account
 * required.
 *
 * Run: npm run qa:d1
 * Requires Node.js with node:sqlite (22.13+ / 24+).
 */

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const schema = readFileSync(join(projectRoot, "backend", "schema.sql"), "utf8");

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(schema);
sqlite.exec("PRAGMA foreign_keys = ON");

class FakeR2 {
  constructor() {
    this.objects = new Map();
  }

  async put(key, value, options = {}) {
    const bytes = await toBytes(value);
    this.objects.set(key, {
      bytes,
      contentType: options.httpMetadata?.contentType || "application/octet-stream",
      customMetadata: options.customMetadata || {},
      etag: crypto.randomUUID().replace(/-/g, ""),
    });
    return {};
  }

  async get(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: object.bytes,
      size: object.bytes.length,
      etag: object.etag,
      httpEtag: `"${object.etag}"`,
      httpMetadata: { contentType: object.contentType },
      customMetadata: object.customMetadata,
    };
  }

  async delete(key) {
    this.objects.delete(key);
  }

  async head(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      size: object.bytes.length,
      etag: object.etag,
      httpEtag: `"${object.etag}"`,
      httpMetadata: { contentType: object.contentType },
    };
  }
}

async function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value && typeof value.getReader === "function") {
    return new Uint8Array(await new Response(value).arrayBuffer());
  }
  return new Uint8Array(await new Response(value).arrayBuffer());
}

function createD1(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      let params = [];

      return {
        bind(...values) {
          params = values;
          return this;
        },

        async first() {
          if (!returnsRows(sql)) {
            statement.run(...params);
            return null;
          }
          const row = statement.get(...params);
          return row ? { ...row } : null;
        },

        async all() {
          if (!returnsRows(sql)) {
            statement.run(...params);
            return { results: [], success: true, meta: {} };
          }
          const rows = statement.all(...params);
          return {
            results: rows.map((row) => ({ ...row })),
            success: true,
            meta: {},
          };
        },

        async run() {
          const info = statement.run(...params);
          return {
            success: true,
            meta: {
              changes: Number(info.changes) || 0,
              last_row_id: Number(info.lastInsertRowid) || 0,
            },
          };
        },
      };
    },

    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      return results;
    },
  };
}

function returnsRows(sql) {
  return /^\s*(select|pragma|with)\b/i.test(sql);
}

const ORIGIN = "http://localhost:4321";
const TOKEN = "test-admin-token";
const env = {
  DB: createD1(sqlite),
  MEDIA: new FakeR2(),
  ADMIN_TOKEN: TOKEN,
  ALLOWED_ORIGINS: ORIGIN,
  IP_HASH_SALT: "test-salt",
  TIMEZONE: "Asia/Ho_Chi_Minh",
  DEFAULT_SHOWROOM: "VinFast Demo",
};

const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(method, path, options = {}) {
  const headers = {
    Accept: "application/json",
    "CF-Connecting-IP": "203.0.113.10",
    ...(options.headers || {}),
  };
  if (options.origin !== null) headers.Origin = options.origin || ORIGIN;
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let body;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await worker.fetch(
    new Request(`https://worker.test${path}`, { method, headers, body }),
    env,
  );

  if (options.binary) {
    return { response, bytes: new Uint8Array(await response.arrayBuffer()) };
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

async function callMedia(path) {
  const response = await worker.fetch(
    new Request(`https://worker.test${path}`, {
      headers: { Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.10" },
    }),
    env,
  );
  return {
    response,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

const productBody = {
  slug: "vinfast-test",
  name: "VinFast Test",
  type: "car",
  category: "suv",
  tagline: "Xe demo",
  price: 100000000,
  priceNote: "Giá demo",
  badge: "Mới",
  featured: true,
  order: 1,
  quickSpecs: [{ label: "Số chỗ", value: "5" }],
  specs: [{ group: "Vận hành", items: [{ label: "Pin", value: "42 kWh" }] }],
  images: ["/images/test-1.webp", "https://example.com/test-2.webp"],
  colors: [{ name: "Đỏ", hex: "#c8102e", image: "/images/red.webp" }],
  offers: [{ title: "Ưu đãi", description: "Mô tả", validUntil: "2026-12-31" }],
  description: "Mô tả sản phẩm",
  highlights: [{ title: "Điểm nhấn", text: "Nội dung" }],
};

/* ------------------------------------------------------------------ */
/* Health + auth                                                       */
/* ------------------------------------------------------------------ */

const health = await call("GET", "/api/health");
check("GET /api/health returns 200", health.response.status === 200, String(health.response.status));
check("health reports d1", health.data?.features?.d1 === true);
check("health reports r2", health.data?.features?.r2 === true);
check("health reports admin token", health.data?.features?.admin === true);

const unauthorized = await call("POST", "/api/products", { body: productBody });
check("write without token returns 401", unauthorized.response.status === 401, String(unauthorized.response.status));

const badOrigin = await call("POST", "/api/products", {
  body: productBody,
  token: TOKEN,
  origin: "https://evil.example",
});
check("bad origin returns 403", badOrigin.response.status === 403, String(badOrigin.response.status));

const preflight = await call("OPTIONS", "/api/products", {
  headers: {
    "Access-Control-Request-Method": "PUT",
    "Access-Control-Request-Headers": "authorization",
  },
});
check("OPTIONS returns 204", preflight.response.status === 204, String(preflight.response.status));
check(
  "preflight allows PUT",
  String(preflight.response.headers.get("Access-Control-Allow-Methods") || "").includes("PUT"),
);
check(
  "preflight allows Authorization",
  String(preflight.response.headers.get("Access-Control-Allow-Headers") || "").includes("Authorization"),
);

/* ------------------------------------------------------------------ */
/* Products                                                           */
/* ------------------------------------------------------------------ */

const emptyList = await call("GET", "/api/products");
check("empty product list", Array.isArray(emptyList.data?.products) && emptyList.data.products.length === 0);

const createdProduct = await call("POST", "/api/products", {
  body: productBody,
  token: TOKEN,
});
check("POST /api/products returns 201", createdProduct.response.status === 201, JSON.stringify(createdProduct.data));
check("product has quick specs", createdProduct.data?.product?.quickSpecs?.length === 1);
check("product has specs", createdProduct.data?.product?.specs?.[0]?.items?.[0]?.value === "42 kWh");
check("product has images", createdProduct.data?.product?.images?.length === 2);
check("product has colors", createdProduct.data?.product?.colors?.[0]?.hex === "#c8102e");
check("product has offers", createdProduct.data?.product?.offers?.[0]?.validUntil === "2026-12-31");
check("product featured is boolean", createdProduct.data?.product?.featured === true);

const duplicateProduct = await call("POST", "/api/products", {
  body: productBody,
  token: TOKEN,
});
check("duplicate product returns 409", duplicateProduct.response.status === 409, String(duplicateProduct.response.status));

const listResponse = await call("GET", "/api/products");
check("public product list has one row", listResponse.data?.products?.length === 1);
check("list omits no fields", listResponse.data?.products?.[0]?.specs?.[0]?.group === "Vận hành");

const etag = listResponse.response.headers.get("ETag");
check("public list returns an ETag", typeof etag === "string" && etag.startsWith('"'));

const notModified = await call("GET", "/api/products", {
  headers: { "If-None-Match": etag },
});
check("matching ETag returns 304", notModified.response.status === 304, String(notModified.response.status));

const updated = await call("PUT", "/api/products/vinfast-test", {
  body: {
    ...productBody,
    name: "VinFast Test Updated",
    quickSpecs: [
      { label: "Số chỗ", value: "5" },
      { label: "Quãng đường", value: "400 km" },
    ],
    specs: [{ group: "Pin", items: [{ label: "Dung lượng", value: "50 kWh" }] }],
    images: ["/images/test-3.webp"],
  },
  token: TOKEN,
});
check("PUT /api/products/:slug returns 200", updated.response.status === 200, JSON.stringify(updated.data));
check("PUT replaces quick specs", updated.data?.product?.quickSpecs?.length === 2);
check("PUT replaces specs", updated.data?.product?.specs?.[0]?.group === "Pin");
check("PUT replaces images", updated.data?.product?.images?.length === 1);
check("PUT keeps name", updated.data?.product?.name === "VinFast Test Updated");

const single = await call("GET", "/api/products/vinfast-test");
check("GET product by slug", single.data?.product?.slug === "vinfast-test");

/* ------------------------------------------------------------------ */
/* Sale items + programs                                               */
/* ------------------------------------------------------------------ */

const itemOne = await call("POST", "/api/sale-items", {
  body: { id: "charger-home", name: "Bộ sạc tại nhà" },
  token: TOKEN,
});
check("POST sale item returns 201", itemOne.response.status === 201, JSON.stringify(itemOne.data));

const itemTwo = await call("POST", "/api/sale-items", {
  body: { id: "floor-mat", name: "Thảm lót sàn" },
  token: TOKEN,
});
check("POST second sale item", itemTwo.response.status === 201);

const itemsList = await call("GET", "/api/sale-items");
check("GET sale items", itemsList.data?.items?.length === 2);

const program = await call("PUT", "/api/sale-programs/vinfast-test", {
  body: {
    enabled: true,
    percentDiscount: 5,
    flatDiscount: 2000000,
    items: [{ itemId: "charger-home", note: "Tặng kèm" }],
    details: [{ title: "Bảo hành", text: "3 năm" }],
  },
  token: TOKEN,
});
check("PUT sale program returns 200", program.response.status === 200, JSON.stringify(program.data));
check("sale program keeps percent", program.data?.program?.percentDiscount === 5);
check("sale program keeps item ref", program.data?.program?.items?.[0]?.itemId === "charger-home");

const programList = await call("GET", "/api/sale-programs");
check("GET sale programs", programList.data?.programs?.length === 1);

const referencedDelete = await call("DELETE", "/api/sale-items/charger-home", { token: TOKEN });
check("delete referenced sale item returns 409", referencedDelete.response.status === 409, String(referencedDelete.response.status));

const programDelete = await call("DELETE", "/api/sale-programs/vinfast-test", { token: TOKEN });
check("DELETE sale program", programDelete.response.status === 200);

const itemDelete = await call("DELETE", "/api/sale-items/charger-home", { token: TOKEN });
check("DELETE unused sale item", itemDelete.response.status === 200);

/* ------------------------------------------------------------------ */
/* Articles + sanitizer                                               */
/* ------------------------------------------------------------------ */

const unsafeHtml =
  '<h2>Tiêu đề</h2><p onclick="alert(1)">Hello <script>alert(1)</script>' +
  '<a href="javascript:alert(1)">bad</a> <a href="/ok" target="_blank">ok</a>' +
  '<a href="java&#x73;cript:alert(1)">entity</a>' +
  '<img src="https://example.com/a.png" onerror="alert(1)">' +
  '<img src="data:image/png;base64,AAAA">' +
  '<input type="text"><meta charset="utf-8"><p>after void tags</p>' +
  '<p>hello &amp; world</p></p>' +
  '<iframe src="https://evil.example"></iframe><style>body{display:none}</style>';

const articleCreated = await call("POST", "/api/articles", {
  body: {
    slug: "bai-viet-test",
    title: "Bài viết test",
    excerpt: "Mô tả",
    category: "Tin tức",
    coverImage: "/images/news-1.webp",
    contentHtml: unsafeHtml,
    status: "draft",
  },
  token: TOKEN,
});
check("POST article returns 201", articleCreated.response.status === 201, JSON.stringify(articleCreated.data));

const sanitized = String(articleCreated.data?.article?.contentHtml || "");
check("sanitizer keeps h2", sanitized.includes("<h2>Tiêu đề</h2>"));
check("sanitizer drops script", !sanitized.includes("<script"), sanitized);
check("sanitizer drops onclick", !sanitized.includes("onclick"), sanitized);
check("sanitizer drops onerror", !sanitized.includes("onerror"), sanitized);
check("sanitizer drops javascript:", !sanitized.includes("javascript:"), sanitized);
check("sanitizer drops entity-obfuscated javascript", !/java&#x73;cript/i.test(sanitized), sanitized);
check("sanitizer drops data image URLs", !sanitized.includes("data:image"), sanitized);
check("sanitizer drops input/meta tags", !sanitized.includes("<input") && !sanitized.includes("<meta"), sanitized);
check("sanitizer keeps content after void tags", sanitized.includes("after void tags"), sanitized);
check("sanitizer keeps text entities", sanitized.includes("hello &amp; world"), sanitized);
check("sanitizer drops iframe", !sanitized.includes("<iframe"), sanitized);
check("sanitizer drops style", !sanitized.includes("<style"), sanitized);
check("sanitizer adds rel on _blank", /rel="noopener noreferrer"/.test(sanitized), sanitized);

const draftList = await call("GET", "/api/articles");
check("draft is hidden from public list", draftList.data?.articles?.length === 0);

const draftListUnauthorized = await call("GET", "/api/articles?status=draft");
check(
  "draft list without token returns 401",
  draftListUnauthorized.response.status === 401,
  String(draftListUnauthorized.response.status),
);

const draftListAdmin = await call("GET", "/api/articles?status=draft", { token: TOKEN });
check("draft list with token returns the draft", draftListAdmin.data?.articles?.length === 1);
check(
  "draft list is not publicly cacheable",
  String(draftListAdmin.response.headers.get("Cache-Control") || "").includes("no-store"),
  String(draftListAdmin.response.headers.get("Cache-Control")),
);

const draftDetail = await call("GET", "/api/articles/bai-viet-test");
check("draft detail without token returns 401", draftDetail.response.status === 401, String(draftDetail.response.status));

const draftDetailAdmin = await call("GET", "/api/articles/bai-viet-test", { token: TOKEN });
check("draft detail with token returns 200", draftDetailAdmin.response.status === 200);
check(
  "draft detail is not publicly cacheable",
  String(draftDetailAdmin.response.headers.get("Cache-Control") || "").includes("no-store"),
  String(draftDetailAdmin.response.headers.get("Cache-Control")),
);

const published = await call("PATCH", "/api/articles/bai-viet-test", {
  body: { status: "published" },
  token: TOKEN,
});
check("PATCH publish returns 200", published.response.status === 200, JSON.stringify(published.data));
check("publish sets publishedAt", Boolean(published.data?.article?.publishedAt));

const publishedList = await call("GET", "/api/articles");
check("published article appears in public list", publishedList.data?.articles?.length === 1);
check("article list omits contentHtml", publishedList.data?.articles?.[0]?.contentHtml === undefined);

/* ------------------------------------------------------------------ */
/* Uploads + media                                                    */
/* ------------------------------------------------------------------ */

function formWithFile(bytes, name, type) {
  const form = new FormData();
  form.append("file", new File([bytes], name, { type }));
  form.append("alt", "Ảnh test");
  return form;
}

const textUpload = await call("POST", "/api/uploads", {
  formData: formWithFile(new Uint8Array([1, 2, 3]), "note.txt", "text/plain"),
  token: TOKEN,
});
check("text upload returns 415", textUpload.response.status === 415, String(textUpload.response.status));

const fakePng = await call("POST", "/api/uploads", {
  formData: formWithFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), "fake.png", "image/png"),
  token: TOKEN,
});
check("fake png magic returns 415", fakePng.response.status === 415, String(fakePng.response.status));

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const upload = await call("POST", "/api/uploads", {
  formData: formWithFile(pngBytes, "real.png", "image/png"),
  token: TOKEN,
});
check("valid png upload returns 201", upload.response.status === 201, JSON.stringify(upload.data));
const mediaFile = upload.data?.files?.[0];
check("upload returns media url", typeof mediaFile?.url === "string" && mediaFile.url.includes("/media/"));
check("upload returns mime type", mediaFile?.mimeType === "image/png");

const mediaPath = mediaFile ? new URL(mediaFile.url).pathname : "/media/missing";
const served = await callMedia(mediaPath);
check("GET /media returns 200", served.response.status === 200, String(served.response.status));
check(
  "GET /media content type",
  served.response.headers.get("Content-Type") === "image/png",
  String(served.response.headers.get("Content-Type")),
);
check("GET /media body matches upload", served.bytes.length === pngBytes.length);

const mediaUnauthorized = await call("GET", "/api/media");
check("media list without token returns 401", mediaUnauthorized.response.status === 401);

const mediaList = await call("GET", "/api/media", { token: TOKEN });
check("media list with token", mediaList.data?.media?.length === 1);

const mediaPatch = await call("PATCH", `/api/media/${mediaFile.id}`, {
  body: { alt: "Ảnh mới" },
  token: TOKEN,
});
check("PATCH media alt", mediaPatch.data?.media?.alt === "Ảnh mới");

const mediaDelete = await call("DELETE", `/api/media/${mediaFile.id}`, { token: TOKEN });
check("DELETE media", mediaDelete.response.status === 200);

const servedAfterDelete = await callMedia(mediaPath);
check("deleted media returns 404", servedAfterDelete.response.status === 404);

/* ------------------------------------------------------------------ */
/* Cleanup                                                            */
/* ------------------------------------------------------------------ */

const productDelete = await call("DELETE", "/api/products/vinfast-test", { token: TOKEN });
check("DELETE product", productDelete.response.status === 200);

const productAfterDelete = await call("GET", "/api/products/vinfast-test");
check("deleted product returns 404", productAfterDelete.response.status === 404);

const articleDelete = await call("DELETE", "/api/articles/bai-viet-test", { token: TOKEN });
check("DELETE article", articleDelete.response.status === 200);

if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("\nD1/R2 QA passed.");
