import { createServer } from "node:http";
import { appendFileSync } from "node:fs";

/*
 * Local stand-in for the Apps Script Web App.
 *
 * Usage:
 *   npm run mock:sheet
 *   Then paste http://127.0.0.1:4323/lead into /cau-hinh/
 *
 * Payloads are appended to mock-endpoint.jsonl (gitignored).
 */
const port = Number(process.env.MOCK_PORT || 4323);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function sendJson(response, status, body) {
  response.writeHead(status, { ...cors, "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  if (request.method === "GET") {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    const payload = { ok: true, service: "local-mock-sheet", time: new Date().toISOString() };
    const callback = url.searchParams.get("callback") || "";
    if (callback && /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback)) {
      response.writeHead(200, { ...cors, "Content-Type": "text/javascript; charset=utf-8" });
      response.end(`${callback}(${JSON.stringify(payload)});`);
      return;
    }
    sendJson(response, 200, payload);
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    appendFileSync("mock-endpoint.jsonl", `${body}\n`);
    let payload = {};
    try {
      payload = JSON.parse(body);
    } catch {
      // Keep the raw body in the log; still return a useful response.
    }
    sendJson(response, 200, {
      ok: true,
      received: true,
      leadId: `LOCAL-${Date.now()}`,
      formType: payload.formType || "unknown",
    });
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Mock Sheet endpoint: http://127.0.0.1:${port}/lead`);
});
