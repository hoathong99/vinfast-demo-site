import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const source = process.cwd();
const staging = "C:/Users/anhvn1/AppData/Local/Temp/opencode/vinfast-demo-site";
const excluded = new Set(["node_modules", "dist", ".astro", "release"]);
const excludedFiles = [/^qa-.*\.png$/, /^mock-endpoint\.jsonl$/, /\.log$/];

rmSync(staging, { recursive: true, force: true });

cpSync(source, staging, {
  recursive: true,
  filter: (src) => {
    const name = src.split(/[\\/]/).pop() || "";
    if (excluded.has(name)) return false;
    if (excludedFiles.some((pattern) => pattern.test(name))) return false;
    return true;
  },
});

if (!existsSync(join(staging, "package.json"))) {
  throw new Error("Packaging failed: package.json missing.");
}
console.log(staging);
