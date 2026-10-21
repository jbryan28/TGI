import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Build the DZC sibling site from the maintained TraderGrowth source. Never edit
// the live TGI pages or CNAME, and never expose repository or product-spec files.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] || path.join(root, "dzc-preview"));
if (output === root || root.startsWith(output + path.sep)) throw new Error("Output must be a separate directory.");
fs.mkdirSync(output, { recursive: true });
if (fs.readdirSync(output).length) throw new Error("Use an empty DZC output directory.");

const routes = ["cdza", "cot", "daily-zone-command", "desk", "dzc", "glossary", "jay", "macro", "member", "membership", "mentor", "mentoring", "newsletter", "privacy", "risk-disclosure", "terms", "weekly-capital-review"];
const sourceFiles = ["index.html", "styles.css", "home.css", "app.js"];
const copied = [];
const copyPublic = (relative) => {
  const source = path.join(root, relative);
  if (fs.statSync(source).isDirectory()) {
    for (const name of fs.readdirSync(source)) copyPublic(path.join(relative, name));
    return;
  }
  if (!/\.(html|css|js|json|svg|webp|png|jpg|jpeg|gif|mp4|webm|vtt|vcf|woff2?)$/i.test(relative)) return;
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  copied.push(relative);
};
for (const entry of [...sourceFiles, "assets", ...routes]) copyPublic(entry);
fs.cpSync(path.join(root, "brands/dzc"), path.join(output, "assets/dzc"), { recursive: true, filter: (name) => !name.endsWith("README.md") });

for (const relative of copied.filter((name) => name.endsWith(".html"))) {
  const file = path.join(output, relative);
  let html = fs.readFileSync(file, "utf8");
  const prefix = path.relative(path.dirname(relative), ".").split(path.sep).join("/");
  const asset = `${prefix ? prefix + "/" : ""}assets/dzc/`;
  html = html.replace(/<span class="brand-mark" aria-hidden="true">TGI<\/span>/g,
    `<span class="brand-mark dzc-mark" aria-hidden="true"><img src="${asset}dzc-mark.svg" alt="" width="96" height="96" /></span>`);
  html = html.replace(/<span class="brand-name"(?: aria-hidden="true")?>[\s\S]*?<\/span>/g,
    '<span class="brand-name dzc-wordmark">Daily Zone<br />Command™<small>By Jay Bryan</small></span>');
  html = html.replace('<span class="mark">TGI</span><span>TRADER GROWTH<br />INSTITUTE</span>',
    `<span class="brand-mark dzc-mark" aria-hidden="true"><img src="${asset}dzc-mark.svg" alt="" width="96" height="96" /></span><span class="brand-name dzc-wordmark">Daily Zone<br />Command™<small>By Jay Bryan</small></span>`);
  html = html.replace(/Trader Growth Institute home/g, "Daily Zone Command home");
  html = html.replace(/<title>([\s\S]*?)<\/title>/, (_, title) => `<title>${title.replace(/Trader Growth Institute/g, "Daily Zone Command™")}</title>`);
  // Book links, contact cards, external checkout, Beehiiv, and Calendly keep their
  // established destinations. Only this site's metadata receives the new domain.
  html = html.replace(/<(?:link|meta)\b[^>]*(?:rel="canonical"|property="og:(?:url|image)")[^>]*>/g,
    (tag) => tag.replace(/https:\/\/www\.tradergrowth\.com/g, "https://dailyzonecommand.com"));
  html = html.replace(/<\/head>/, `<link rel="icon" type="image/svg+xml" href="${asset}dzc-mark.svg" />\n<link rel="stylesheet" href="${asset}brand.css?v=20261021-hero-columns" />\n</head>`);
  if (relative === "index.html") {
    const hero = /(<div class="hero-copy reveal">)([\s\S]*?)(<p class="hero-summary">[\s\S]*?<p class="trust-note">[\s\S]*?<\/p>)(\s*<\/div>)/;
    if (!hero.test(html)) throw new Error("The DZC hero content could not be grouped.");
    html = html.replace(hero, '$1\n<div class="dzc-hero-heading">$2</div>\n<div class="dzc-hero-details">$3</div>$4');
    html = html.replace('<p class="eyebrow">Trader Growth Institute</p>', '<p class="eyebrow">Daily Zone Command™ · By Jay Bryan</p>');
    html = html.replace('content="Understand Daily Zones with Trader Growth Institute.', 'content="Understand Daily Zones with Daily Zone Command.');
    html = html.replace("<p>TraderGrowth.com</p>", '<p>DailyZoneCommand.com<span class="dzc-parent">A Trader Growth Institute brand</span></p>');
    html = html.replace("<title>Daily Zones &amp; Daily Zone Command™ | Daily Zone Command™</title>", "<title>Daily Zone Command™ | Daily Zones with Jay Bryan</title>");
  }
  fs.writeFileSync(file, html);
}
fs.writeFileSync(path.join(output, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(`Built Daily Zone Command: ${copied.length} public files in ${output}`);
