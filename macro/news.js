(() => {
  const cacheEndpoint = "./data/headlines.json";
  const storageKey = "tgi-macro-headlines-v1";
  const refreshIntervalMs = 15 * 60 * 1000;
  const freshWindowMs = 45 * 60 * 1000;
  const headlinesElement = document.querySelector("#macro-headlines");
  const statusElement = document.querySelector("#macro-feed-status");
  const statusTextElement = document.querySelector("#macro-feed-status-text");
  const updatedElement = document.querySelector("#macro-last-updated");
  const refreshButton = document.querySelector("#macro-refresh");
  if (!headlinesElement || !statusElement || !statusTextElement || !updatedElement || !refreshButton) return;

  let lastPayload = null;
  let activeController = null;

  const setStatus = (state, message) => {
    statusElement.dataset.state = state;
    statusTextElement.textContent = message;
  };

  const normalizedDate = (value) => /^\d{8}T\d{6}Z$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : value;

  const parsedDate = (value) => {
    if (!value) return null;
    const parsed = new Date(normalizedDate(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const displayDate = (value) => {
    const parsed = parsedDate(value);
    if (!parsed) return "Publisher time unavailable";
    return `Published ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed)}`;
  };

  const updateAgeLabel = (generatedAt) => {
    const updated = parsedDate(generatedAt);
    if (!updated) {
      updatedElement.textContent = "Update time unavailable";
      return { fresh: false, updated: null };
    }
    const ageMs = Math.max(0, Date.now() - updated.getTime());
    const minutes = Math.max(1, Math.round(ageMs / 60000));
    updatedElement.textContent = minutes < 60
      ? `Updated ${minutes} min ago`
      : `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(updated)}`;
    return { fresh: ageMs <= freshWindowMs, updated };
  };

  const renderArticles = (articles) => {
    const seen = new Set();
    const safeArticles = articles.filter((article) => {
      try {
        const url = new URL(article.url);
        if (url.protocol !== "https:" || !article.title || seen.has(url.href)) return false;
        seen.add(url.href);
        return true;
      } catch {
        return false;
      }
    }).slice(0, 12);

    headlinesElement.replaceChildren();
    if (!safeArticles.length) {
      const empty = document.createElement("p");
      empty.className = "macro-feed-empty";
      empty.textContent = "No recent coverage is cached. Use the official calendars above while the next update is prepared.";
      headlinesElement.append(empty);
      return 0;
    }

    for (const article of safeArticles) {
      const url = new URL(article.url);
      const row = document.createElement("article");
      const label = document.createElement("span");
      label.className = "macro-feed-category";
      label.textContent = article.sourceType === "official" ? "OFFICIAL" : "NEWS LINK";
      const content = document.createElement("div");
      content.className = "macro-headline-main";
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const heading = document.createElement("h3");
      heading.textContent = article.title;
      link.append(heading);
      const details = document.createElement("p");
      const source = document.createElement("span");
      source.className = "macro-headline-source";
      source.textContent = article.domain || url.hostname;
      const date = document.createElement("time");
      date.textContent = displayDate(article.seendate);
      if (article.seendate) date.dateTime = normalizedDate(article.seendate);
      details.append(source, date);
      content.append(link, details);
      row.append(label, content);
      headlinesElement.append(row);
    }
    return safeArticles.length;
  };

  const readStoredPayload = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey));
      return value && Array.isArray(value.articles) ? value : null;
    } catch {
      return null;
    }
  };

  const applyPayload = (payload, source = "network") => {
    const count = renderArticles(payload.articles || []);
    const { fresh } = updateAgeLabel(payload.generatedAt);
    lastPayload = payload;
    if (source === "network" && count) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* Storage is optional. */ }
    }
    if (!count) {
      setStatus("error", "HEADLINE CACHE AWAITING UPDATE");
    } else if (fresh) {
      setStatus("live", "HEADLINES UPDATED · VERIFIED SOURCES");
    } else {
      setStatus("stale", "SHOWING LAST VERIFIED UPDATE");
    }
    return count;
  };

  const fetchHeadlines = async () => {
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    refreshButton.disabled = true;
    headlinesElement.setAttribute("aria-busy", "true");
    setStatus(lastPayload ? "refreshing" : "loading", lastPayload ? "CHECKING FOR UPDATES" : "LOADING VERIFIED HEADLINES");
    if (!lastPayload) updatedElement.textContent = "Loading latest cache…";

    try {
      const response = await fetch(`${cacheEndpoint}?v=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Headline cache responded ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error("Headline cache response was not recognized");
      applyPayload(data);
    } catch (error) {
      if (activeController === controller && (error.name !== "AbortError" || timedOut)) {
        const stored = lastPayload || readStoredPayload();
        if (stored?.articles?.length) {
          applyPayload(stored, "stored");
          setStatus("stale", "UPDATE DELAYED · SHOWING SAVED HEADLINES");
        } else {
          setStatus("error", "HEADLINE UPDATE TEMPORARILY UNAVAILABLE");
          updatedElement.textContent = "Use the official calendars below";
          headlinesElement.replaceChildren();
          const message = document.createElement("p");
          message.className = "macro-feed-empty";
          message.textContent = "The cached headline service did not respond. Use the official release calendars above or try again.";
          headlinesElement.append(message);
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeController === controller) {
        headlinesElement.setAttribute("aria-busy", "false");
        refreshButton.disabled = false;
      }
    }
  };

  const stored = readStoredPayload();
  if (stored?.articles?.length) applyPayload(stored, "stored");
  refreshButton.addEventListener("click", fetchHeadlines);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchHeadlines();
  });
  fetchHeadlines();
  window.setInterval(() => {
    if (!document.hidden) fetchHeadlines();
  }, refreshIntervalMs);
})();
