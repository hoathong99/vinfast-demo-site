import { createServer } from "node:http";
import { appendFileSync } from "node:fs";

const port = 4323;
createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    response.end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    appendFileSync("mock-endpoint.jsonl", body + "\n");
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ ok: true, received: true }));
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Mock endpoint at http://127.0.0.1:${port}/lead`);
});
