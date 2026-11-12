import { readFileSync } from "node:fs";
const css = readFileSync("dist/_astro/BaseLayout.C0R2iCJ0.css", "utf8");
for (const needle of ['home-badges span:before', 'link-arrow:after', 'lead-copy li:before']) {
  const i = css.indexOf(needle);
  console.log(needle, JSON.stringify(css.slice(i, i + 80)));
}
console.log("replacement chars:", (css.match(/\uFFFD/g) || []).length);
