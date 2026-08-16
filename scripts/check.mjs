import fs from "node:fs";

const pages = [
  "index.html",
  "weekly-capital-review/index.html",
  "privacy/index.html",
  "terms/index.html",
  "risk-disclosure/index.html",
];

const html = pages.map((path) => fs.readFileSync(path, "utf8")).join("\n");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const javascript = ["app.js", "weekly-capital-review/review.js"]
  .map((path) => fs.readFileSync(path, "utf8"))
  .join("\n");
const referencedIds = [...javascript.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
const missingIds = [...new Set(referencedIds.filter((id) => !ids.has(id)))];

if (missingIds.length) {
  throw new Error(`JavaScript references missing DOM IDs: ${missingIds.join(", ")}`);
}

const css = fs.readFileSync("styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const openingBraces = (css.match(/{/g) || []).length;
const closingBraces = (css.match(/}/g) || []).length;

if (openingBraces !== closingBraces) {
  throw new Error(`CSS braces are unbalanced: ${openingBraces} opening, ${closingBraces} closing.`);
}

for (const page of pages) {
  const content = fs.readFileSync(page, "utf8");
  if (!content.includes("<!doctype html>")) throw new Error(`${page} is missing a doctype.`);
  if (!content.includes("<title>")) throw new Error(`${page} is missing a title.`);
}

console.log(`Static checks passed for ${pages.length} routes, ${new Set(referencedIds).size} interactive DOM references, and ${openingBraces} CSS blocks.`);
