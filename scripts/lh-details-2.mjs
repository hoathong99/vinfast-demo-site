import { readFileSync } from "node:fs";

const report = JSON.parse(
  readFileSync("C:/Users/anhvn1/AppData/Local/Temp/opencode-browser-JzT9ge/0/lighthouse.json", "utf8"),
);
for (const id of ["color-contrast", "heading-order"]) {
  const audit = report.audits[id];
  console.log(`\n=== ${id} (${audit.score}) ===`);
  for (const item of (audit.details?.items || []).slice(0, 8)) {
    console.log(JSON.stringify({
      node: item.node?.snippet,
      selector: item.node?.selector,
      explanation: item.node?.explanation,
    }, null, 2));
  }
}
