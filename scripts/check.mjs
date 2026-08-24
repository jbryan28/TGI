import fs from "node:fs";
import path from "node:path";

const pages = [
  "index.html",
  "weekly-capital-review/index.html",
  "privacy/index.html",
  "terms/index.html",
  "risk-disclosure/index.html",
  "glossary/index.html",
  "cdza/index.html",
  "cdza/journal/index.html",
  "newsletter/index.html",
  "newsletter/welcome/index.html",
  "membership/index.html",
  "member/index.html",
];

const html = pages.map((path) => fs.readFileSync(path, "utf8")).join("\n");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const javascriptFiles = ["app.js", "weekly-capital-review/review.js", "glossary/glossary.js", "cdza/cdza.js", "cdza/journal/journal.js", "newsletter/newsletter.js", "membership/config.js", "membership/membership.js"];
const javascript = javascriptFiles
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

const pageIds = new Map(
  pages.map((page) => {
    const content = fs.readFileSync(page, "utf8");
    return [page, new Set([...content.matchAll(/id="([^"]+)"/g)].map((match) => match[1]))];
  }),
);

const resolveLocalTarget = (page, reference) => {
  const [targetPath, fragment] = reference.split("#", 2);
  if (!targetPath) return { file: page, fragment };

  const resolved = path.normalize(path.join(path.dirname(page), targetPath));
  if (path.extname(resolved)) return { file: resolved, fragment };
  return { file: path.join(resolved, "index.html"), fragment };
};

const missingLinks = [];
for (const page of pages) {
  const content = fs.readFileSync(page, "utf8");
  const references = [...content.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(reference)) continue;
    const target = resolveLocalTarget(page, reference);
    if (!fs.existsSync(target.file)) {
      missingLinks.push(`${page} -> ${reference}`);
      continue;
    }
    if (target.fragment && target.file.endsWith(".html") && !pageIds.get(target.file)?.has(target.fragment)) {
      missingLinks.push(`${page} -> ${reference} (missing fragment)`);
    }
  }
}

if (missingLinks.length) {
  throw new Error(`Broken local references:\n${missingLinks.join("\n")}`);
}

console.log(`Static checks passed for ${pages.length} routes, ${new Set(referencedIds).size} interactive DOM references, ${openingBraces} CSS blocks, and all local links.`);
