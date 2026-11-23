import { generateKeyPairSync } from "node:crypto";
import worker from "../backend/worker.js";

/*
 * Offline QA for backend/worker.js. Mocks Google OAuth + Sheets API, so it
 * needs no real credentials or network access.
 *
 * Run: npm run qa:worker
 */

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const serviceAccount = {
  type: "service_account",
  project_id: "demo-project",
  client_email: "vinfast-sheet-writer@demo-project.iam.gserviceaccount.com",
  private_key: privateKey,
};
const serviceAccountB64 = Buffer.from(JSON.stringify(serviceAccount)).toString("base64");

const env = {
  SHEET_ID: "demo-sheet-id",
  GOOGLE_SERVICE_ACCOUNT_JSON_B64: serviceAccountB64,
  ALLOWED_ORIGINS: "http://localhost:4321",
  IP_HASH_SALT: "test-salt",
  LEADS_TAB: "Leads",
  EVENTS_TAB: "Events",
  ENABLE_EVENTS: "true",
  TIMEZONE: "Asia/Ho_Chi_Minh",
  DEFAULT_SHOWROOM: "VinFast Demo",
};

let lastLeadRow = null;
let lastAppend = null;
let dedupeRows = [];
const calls = [];

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();
  calls.push(`${method} ${url}`);

  if (url === "https://oauth2.googleapis.com/token") {
    return jsonResponse({ access_token: "fake-access-token", expires_in: 3600 });
  }

  if (url.includes("fields=sheets.properties")) {
    return jsonResponse({
      sheets: [
        { properties: { title: "Leads" } },
        { properties: { title: "Events" } },
      ],
    });
  }

  if (url.includes("/values/") && method === "GET") {
    const decoded = decodeURIComponent(url);
    if (decoded.includes("A1:") && decoded.includes("1")) return jsonResponse({});
    if (decoded.includes("A2:AF")) return jsonResponse({ values: dedupeRows });
    return jsonResponse({});
  }

  if (url.includes("/values/") && method === "PUT") {
    return jsonResponse({});
  }

  if (url.includes("/values/") && method === "POST" && url.includes(":append")) {
    const body = JSON.parse(init.body || "{}");
    const decoded = decodeURIComponent(url);
    const tab = decoded.includes("'Events'") ? "Events" : "Leads";
    lastAppend = { tab, body };
    if (tab === "Leads" && body.values && body.values[0]) {
      lastLeadRow = body.values[0];
      dedupeRows = [lastLeadRow];
    }
    return jsonResponse({ updates: { updatedRange: `${tab}!A2:AF2` } });
  }

  if (url.endsWith(":batchUpdate")) {
    return jsonResponse({});
  }

  throw new Error(`Unhandled mock URL: ${method} ${url}`);
};

const origin = "http://localhost:4321";
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(method, path, body, requestOrigin = origin) {
  const headers = { Accept: "application/json", "CF-Connecting-IP": "203.0.113.10" };
  if (requestOrigin) headers.Origin = requestOrigin;
  if (body) headers["Content-Type"] = "application/json";
  const response = await worker.fetch(
    new Request(`https://worker.test${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  );
  const data = await response.json().catch(() => null);
  return { response, data };
}

const validLead = {
  type: "lead",
  formType: "test_drive",
  fullName: "QA Worker",
  phone: "0901234567",
  vehicleSlug: "vinfast-vf-3",
  preferredDate: "2030-01-01",
  preferredTime: "09:00",
  showroom: "VinFast Demo",
  consent: true,
  consentVersion: "qa-worker",
  pagePath: "/dang-ky-lai-thu/",
  referrer: "https://example.com/",
  utm: { source: "qa", medium: "test", campaign: "worker" },
  company_website: "",
  elapsedMs: 5000,
  device: "desktop",
  browser: "qa",
  sessionId: "session-qa",
};

const health = await call("GET", "/lead");
check("GET /lead returns 200", health.response.status === 200, String(health.response.status));
check("health returns ok", health.data?.ok === true);
check("health reports configured", health.data?.configured === true);
check(
  "health echoes allowed origin",
  health.response.headers.get("Access-Control-Allow-Origin") === origin,
);

const created = await call("POST", "/lead", validLead);
check("POST /lead returns 200", created.response.status === 200, JSON.stringify(created.data));
check("lead ID generated", typeof created.data?.leadId === "string" && created.data.leadId.startsWith("LD-"));
check("lead appended to Leads", lastAppend?.tab === "Leads");
check("lead row has 32 columns", lastLeadRow?.length === 32, String(lastLeadRow?.length));
check("lead row status is New", lastLeadRow?.[27] === "New");
check("lead row has IP hash", typeof lastLeadRow?.[26] === "string" && lastLeadRow[26].length === 64);
check("lead row keeps phone", lastLeadRow?.[4] === "0901234567");
check("lead row keeps UTM source", lastLeadRow?.[17] === "qa");

const duplicate = await call("POST", "/lead", validLead);
check("duplicate returns 200", duplicate.response.status === 200);
check("duplicate is detected", duplicate.data?.duplicate === true);
check("duplicate returns existing ID", duplicate.data?.leadId === created.data?.leadId);

const invalid = await call("POST", "/lead", { ...validLead, phone: "123" });
check("invalid phone returns 400", invalid.response.status === 400, String(invalid.response.status));
check("invalid phone has field error", Boolean(invalid.data?.fields?.phone));

const badOrigin = await call("POST", "/lead", validLead, "https://evil.example");
check("bad origin returns 403", badOrigin.response.status === 403, String(badOrigin.response.status));

const event = await call("POST", "/event", {
  type: "event",
  event: "page_view",
  sessionId: "session-qa",
  pagePath: "/dang-ky-lai-thu/",
  pageTitle: "Đăng ký lái thử",
  device: "desktop",
  browser: "qa",
});
check("POST /event returns 200", event.response.status === 200, JSON.stringify(event.data));
check("event appended to Events", lastAppend?.tab === "Events");
check("event row has 15 columns", lastAppend?.body?.values?.[0]?.length === 15);

const badEvent = await call("POST", "/event", { type: "event", event: "not_allowed" });
check("invalid event returns 400", badEvent.response.status === 400, String(badEvent.response.status));

const badPath = await call("POST", "/unknown", validLead);
check("unknown path returns 404", badPath.response.status === 404, String(badPath.response.status));

console.log(`\n${calls.length} mocked Google/site requests`);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nWorker QA passed.");

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
