import { readFileSync } from "node:fs";

const report = JSON.parse(
  readFileSync("C:/Users/anhvn1/AppData/Local/Temp/opencode-browser-yXeZbV/0/lighthouse.json", "utf8"),
);
const ids = ["color-contrast", "label-content-name-mismatch", "link-in-text-block", "target-size"];
for (const id of ids) {
  const audit = report.audits[id];
  console.log(`\n=== ${id} (${audit.score}) ===`);
  const items = audit.details?.items || [];
  for (const item of items.slice(0, 8)) {
    console.log(JSON.stringify({
      node: item.node?.snippet,
      selector: item.node?.selector,
      explanation: item.node?.explanation,
      related: item.relatedNode?.snippet,
    }, null, 2));
  }
}
