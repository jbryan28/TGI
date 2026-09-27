import fs from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve("macro/data/headlines.json");
const requestTimeoutMs = 20000;
const maxArticleAgeMs = 7 * 24 * 60 * 60 * 1000;

const sources = [
  {
    name: "GDELT",
    type: "json",
    url: "https://api.gdeltproject.org/api/v2/doc/doc",
  },
  {
    name: "Federal Reserve",
    type: "rss",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
  },
  {
    name: "Bureau of Labor Statistics",
    type: "rss",
    url: "https://www.bls.gov/feed/bls_latest.rss",
  },
  {
    name: "Bureau of Economic Analysis",
    type: "rss",
    url: "https://apps.bea.gov/rss/rss.xml",
  },
  {
    name: "U.S. Energy Information Administration",
    type: "rss",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
  },
  {
    name: "European Central Bank",
    type: "rss",
    url: "https://www.ecb.europa.eu/rss/press.html",
  },
];

const normalizeDate = (value) => {
  if (!value) return null;
  const normalized = /^\d{8}T\d{6}Z$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const decodeXml = (value = "") => value
  .replace(/^<!\[CDATA\[|\]\]>$/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ")
  .trim();

const tagValue = (item, names) => {
  for (const name of names) {
    const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
};

const parseRss = (xml, sourceName) => {
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].map((match) => match[1]);
  return blocks.map((item) => {
    const title = tagValue(item, ["title"]);
    const rawLink = tagValue(item, ["link"]);
    const hrefLink = item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1] || "";
    const url = decodeXml(rawLink || hrefLink);
    const seendate = normalizeDate(tagValue(item, ["pubDate", "published", "updated", "dc:date"]));
    return { title, url, domain: sourceName, seendate, sourceType: "official" };
  });
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "TraderGrowth-MacroDesk/1.0 (+https://www.tradergrowth.com/macro/)",
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchSource = async (source) => {
  if (source.type === "json") {
    const url = new URL(source.url);
    url.search = new URLSearchParams({
      query: '(inflation OR "Federal Reserve" OR central bank OR interest rates OR Treasury yields OR employment OR payrolls OR oil prices OR crude oil OR gold prices OR commodities OR foreign exchange OR currency markets)',
      mode: "ArtList",
      format: "json",
      timespan: "24h",
      maxrecords: "50",
      sort: "DateDesc",
    }).toString();
    const response = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!Array.isArray(data.articles)) throw new Error("Unrecognized JSON response");
    return data.articles.map((article) => ({
      title: article.title,
      url: article.url,
      domain: article.domain || source.name,
      seendate: normalizeDate(article.seendate),
      sourceType: "aggregator",
    }));
  }

  const response = await fetchWithTimeout(source.url, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
  return parseRss(await response.text(), source.name);
};

const validArticle = (article) => {
  if (!article?.title || !article?.url) return false;
  try {
    return new URL(article.url).protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const relevantOfficialTitle = (article) => {
  if (article.sourceType !== "official") return true;
  if (["Bureau of Labor Statistics", "Bureau of Economic Analysis", "U.S. Energy Information Administration"].includes(article.domain)) return true;
  if (/\b(banknotes?|euro cash|approval of application|enforcement action|personnel|resign)\b/i.test(article.title)) return false;
  return /\b(econom(?:y|ic)|monetary|policy|inflation|prices?|interest|rates?|yields?|employment|jobs?|labou?r|wages?|growth|gdp|pce|cpi|pmi|consumer|production|trade|housing|credit|liquidity|financial stability|markets?|currenc(?:y|ies)|euro|dollar|energy|oil|gas|inventories|commodit(?:y|ies))\b/i.test(article.title);
};

const deduplicate = (articles) => {
  const urls = new Set();
  const titles = new Set();
  return articles
    .filter((article) => validArticle(article) && relevantOfficialTitle(article))
    .sort((a, b) => new Date(b.seendate || 0) - new Date(a.seendate || 0))
    .filter((article) => {
      const url = new URL(article.url).href;
      const title = normalizeTitle(article.title);
      if (urls.has(url) || titles.has(title)) return false;
      urls.add(url);
      titles.add(title);
      return true;
    })
    .slice(0, 30);
};

let previous = { generatedAt: null, lastAttemptAt: null, sources: [], articles: [] };
try {
  previous = JSON.parse(await fs.readFile(outputPath, "utf8"));
} catch {
  // The first successful run creates the cache.
}

const attemptAt = new Date();
const results = await Promise.allSettled(sources.map(fetchSource));
const sourceStatus = results.map((result, index) => ({
  name: sources[index].name,
  ok: result.status === "fulfilled",
  articleCount: result.status === "fulfilled" ? result.value.length : 0,
  error: result.status === "rejected" ? String(result.reason?.message || result.reason).slice(0, 180) : undefined,
}));
const fresh = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
const cutoff = attemptAt.getTime() - maxArticleAgeMs;
const retained = (previous.articles || []).filter((article) => {
  const timestamp = new Date(article.seendate || 0).getTime();
  return Number.isFinite(timestamp) && timestamp >= cutoff;
});
const articles = deduplicate([...fresh, ...retained].filter((article) => {
  const timestamp = new Date(article.seendate || 0).getTime();
  return Number.isFinite(timestamp) && timestamp >= cutoff;
}));
const successful = sourceStatus.some((source) => source.ok);

if (!articles.length && !successful) {
  console.error(sourceStatus);
  throw new Error("Every macro headline source failed and no cached articles remain.");
}

const payload = {
  generatedAt: successful ? attemptAt.toISOString() : previous.generatedAt,
  lastAttemptAt: attemptAt.toISOString(),
  sources: sourceStatus,
  articles,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Macro cache updated with ${articles.length} articles from ${sourceStatus.filter((source) => source.ok).length}/${sourceStatus.length} sources.`);
