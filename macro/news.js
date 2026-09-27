(() => {
  const apiEndpoint = "https://api.gdeltproject.org/api/v2/doc/doc";
  const searchQuery = '(inflation OR "Federal Reserve" OR central bank OR interest rates OR Treasury yields OR employment OR payrolls OR oil prices OR crude oil OR gold prices OR commodities OR foreign exchange OR currency markets)';
  const refreshIntervalMs = 15 * 60 * 1000;
  const headlinesElement = document.querySelector("#macro-headlines");
  const statusElement = document.querySelector("#macro-feed-status");
  const statusTextElement = document.querySelector("#macro-feed-status-text");
  const updatedElement = document.querySelector("#macro-last-updated");
  const refreshButton = document.querySelector("#macro-refresh");
  if (!headlinesElement || !statusElement || !statusTextElement || !updatedElement || !refreshButton) return;

  let lastSuccessfulUpdate = null;
  let activeController = null;

  const setStatus = (state, message) => {
    statusElement.dataset.state = state;
    statusTextElement.textContent = message;
  };

  const normalizedDate = (value) => /^\d{8}T\d{6}Z$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : value;

  const displayDate = (value) => {
    if (!value) return "Publisher time unavailable";
    const normalized = normalizedDate(value);
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "Publisher time unavailable";
    return `Indexed ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(parsed)} UTC`;
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
      empty.textContent = "No matching coverage was returned. Try refreshing later or use the official calendars above.";
      headlinesElement.append(empty);
      return 0;
    }

    for (const article of safeArticles) {
      const url = new URL(article.url);
      const row = document.createElement("article");
      const label = document.createElement("span");
      label.className = "macro-feed-category";
      label.textContent = "NEWS LINK";
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

  const fetchHeadlines = async () => {
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12000);
    refreshButton.disabled = true;
    headlinesElement.setAttribute("aria-busy", "true");
    setStatus(lastSuccessfulUpdate ? "refreshing" : "loading", lastSuccessfulUpdate ? "REFRESHING HEADLINES" : "CONNECTING TO HEADLINE FEED");
    updatedElement.textContent = lastSuccessfulUpdate ? `Last updated ${lastSuccessfulUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Connecting to feed…";

    try {
      const url = new URL(apiEndpoint);
      url.search = new URLSearchParams({
        query: searchQuery,
        mode: "ArtList",
        format: "json",
        timespan: "24h",
        maxrecords: "50",
        sort: "DateDesc",
      }).toString();
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Feed responded ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error("Headline feed response was not recognized");
      const count = renderArticles(data.articles);
      lastSuccessfulUpdate = new Date();
      updatedElement.textContent = `Updated ${lastSuccessfulUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      setStatus("live", count ? "HEADLINES LIVE · GDELT" : "CONNECTED · NO MATCHING HEADLINES");
    } catch (error) {
      if (activeController === controller && (error.name !== "AbortError" || timedOut)) {
        setStatus("error", lastSuccessfulUpdate ? "REFRESH FAILED · SHOWING LAST RESULTS" : "FEED TEMPORARILY UNAVAILABLE");
        updatedElement.textContent = lastSuccessfulUpdate ? `Last successful update ${lastSuccessfulUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Feed unavailable · retry shortly";
        if (!lastSuccessfulUpdate) {
          headlinesElement.replaceChildren();
          const message = document.createElement("p");
          message.className = "macro-feed-empty";
          message.textContent = "The headline service did not respond. Use the official release calendars above or try again.";
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

  refreshButton.addEventListener("click", fetchHeadlines);
  fetchHeadlines();
  window.setInterval(() => {
    if (!document.hidden) fetchHeadlines();
  }, refreshIntervalMs);
})();
