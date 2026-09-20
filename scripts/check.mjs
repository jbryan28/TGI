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
  "dzc/index.html",
  "daily-zone-command/index.html",
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

  const resolved = targetPath.startsWith("/")
    ? path.normalize(targetPath.slice(1))
    : path.normalize(path.join(path.dirname(page), targetPath));
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

const newsletterFirstPages = pages.filter((page) => page !== "membership/index.html");
const exposedMembershipLinks = newsletterFirstPages.filter((page) =>
  /href="(?:\.\.\/)*membership\//.test(fs.readFileSync(page, "utf8")),
);

if (exposedMembershipLinks.length) {
  throw new Error(`Newsletter-first release exposes membership links on: ${exposedMembershipLinks.join(", ")}`);
}

const homepage = fs.readFileSync("index.html", "utf8");
const newsletterPage = fs.readFileSync("newsletter/index.html", "utf8");
const bookPage = fs.readFileSync("dzc/index.html", "utf8");
const legacyBookPage = fs.readFileSync("daily-zone-command/index.html", "utf8");

if (/Series\s*(?:7|66)|7\s*(?:&amp;|&)\s*66/i.test(html)) {
  throw new Error("Former Series 7/66 language remains in the published site.");
}

const incorrectBrandLinks = pages.filter((page) => {
  const content = fs.readFileSync(page, "utf8");
  return [...content.matchAll(/<a class="brand" href="([^"]+)"/g)].some((match) => match[1] !== "/");
});

if (incorrectBrandLinks.length) {
  throw new Error(`Brand logos do not point to the homepage on: ${incorrectBrandLinks.join(", ")}`);
}

if (!homepage.includes('<nav class="site-nav" id="site-nav" aria-label="Primary navigation">') || !homepage.includes('<a href="dzc/">Book</a>')) {
  throw new Error("Homepage primary navigation is missing the DZC book link.");
}

if (!bookPage.includes('href="https://www.tradergrowth.com/dzc/"') || !bookPage.includes('src="../assets/jay-bryan-dzc-author.webp"') || !bookPage.includes('src="../assets/daily-zone-command-book.webp"')) {
  throw new Error("The DZC page is missing its canonical URL, author image, or current book image.");
}

if (!css.includes("body.nav-open .site-header.is-scrolled") || !css.includes("min-height: 100dvh") || !css.includes("background: var(--ink)")) {
  throw new Error("The mobile navigation does not enforce an opaque, viewport-height scrolled state.");
}

if (!javascript.includes("document.body.appendChild(siteNav)") || !javascript.includes("restoreNavigation")) {
  throw new Error("The mobile navigation is not portaled outside the scrolled header containing block.");
}

if (!legacyBookPage.includes('url=/dzc/') || !legacyBookPage.includes('window.location.replace("/dzc/"')) {
  throw new Error("The legacy book route does not redirect to /dzc/.");
}
for (const requiredPhrase of ["Economic context", "Technical context", "Risk discipline"]) {
  if (!homepage.includes(requiredPhrase)) throw new Error(`Homepage is missing newsletter promise: ${requiredPhrase}`);
}
for (const requiredPhrase of ["Economic regime", "Technical structure", "High-impact calendar", "Scenarios &amp; invalidation"]) {
  if (!newsletterPage.includes(requiredPhrase)) throw new Error(`Newsletter page is missing issue component: ${requiredPhrase}`);
}

console.log(`Static checks passed for ${pages.length} routes, ${new Set(referencedIds).size} interactive DOM references, ${openingBraces} CSS blocks, all local links, and the newsletter-first release gate.`);
