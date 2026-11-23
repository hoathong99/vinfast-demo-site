/**
 * VinFast demo lead API — Cloudflare Worker (single file)
 *
 * Paste this file into the Cloudflare dashboard:
 *   Workers & Pages -> Create -> Worker -> Edit code -> replace -> Deploy
 *
 * Required Worker variables/secrets (Settings -> Variables and Secrets):
 *   SHEET_ID                         Google Sheet ID
 *   GOOGLE_SERVICE_ACCOUNT_JSON_B64  base64 of the service-account JSON key
 *   ALLOWED_ORIGINS                  comma-separated origins, e.g.
 *                                    http://localhost:4321,https://you.github.io
 *   IP_HASH_SALT                     random string for hashing IPs
 *
 * Optional:
 *   LEADS_TAB        default "Leads"
 *   EVENTS_TAB       default "Events"
 *   ENABLE_EVENTS    default "true"
 *   TIMEZONE         default "Asia/Ho_Chi_Minh"
 *   DEFAULT_SHOWROOM default "VinFast Demo"
 *
 * Fallback secret names (if the base64 value is too large):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *
 * The Worker creates the Leads/Events tabs and header rows if they are missing,
 * so the service account only needs Editor access to the Sheet.
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

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

const MAX_BODY_BYTES = 16 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_SCAN_ROWS = 300;

const rateBuckets = new Map();
const readySheets = new Set();

let tokenCache = null;

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

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/lead")) {
      return json(
        {
          ok: true,
          service: "vinfast-sheet-api",
          version: 1,
          time: new Date().toISOString(),
          configured: Boolean(
            String(env.SHEET_ID || "").trim() &&
              (env.GOOGLE_SERVICE_ACCOUNT_JSON ||
                env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
                (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY)),
          ),
        },
        200,
        cors,
      );
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
    if (rateLimited(ip)) {
      return json({ ok: false, error: "RATE_LIMITED" }, 429, cors);
    }

    let payload;
    try {
      payload = await readJson(request);
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      const status = message === "BODY_TOO_LARGE" ? 413 : 400;
      return json({ ok: false, error: message }, status, cors);
    }

    try {
      if (url.pathname === "/event" || (payload && payload.type === "event")) {
        const result = await handleEvent(payload, env);
        return json(result, result.ok ? 200 : 400, cors);
      }

      const result = await handleLead(payload, env, ip);
      return json(result, result.ok ? 200 : 400, cors);
    } catch (error) {
      console.error("VinFast Worker error:", error && error.stack ? error.stack : error);
      const denied = error && (error.status === 403 || error.code === "PERMISSION_DENIED");
      const notFound = error && error.status === 404;
      const code = denied ? "SHEET_PERMISSION_DENIED" : notFound ? "SHEET_NOT_FOUND" : "SERVER_ERROR";
      return json(
        {
          ok: false,
          error: code,
          message: denied
            ? "Share the Google Sheet with the service account email as Editor."
            : notFound
              ? "Check SHEET_ID and the tab name in the Worker variables."
              : String(error && error.message ? error.message : error).slice(0, 400),
        },
        denied ? 403 : notFound ? 404 : 500,
        cors,
      );
    }
  },
};

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
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
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
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJson(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function rateLimited(ip) {
  const key = ip || "unknown";
  const now = Date.now();
  const bucket = (rateBuckets.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(key, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 1000) {
    for (const [bucketKey, times] of rateBuckets) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) rateBuckets.delete(bucketKey);
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

function cleanText(value, maxLength) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .slice(0, maxLength || 500);
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
