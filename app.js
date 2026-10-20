(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const header = $("[data-header]");
  const navToggle = $(".nav-toggle");
  const siteNav = $("#site-nav");
  const navHome = siteNav ? { parent: siteNav.parentNode, nextSibling: siteNav.nextSibling } : null;

  const restoreNavigation = () => {
    if (!siteNav || !navHome || siteNav.parentNode === navHome.parent) return;
    navHome.parent.insertBefore(siteNav, navHome.nextSibling);
  };

  const closeNavigation = () => {
    navToggle?.setAttribute("aria-expanded", "false");
    siteNav?.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    restoreNavigation();
  };

  const setHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    if (!isOpen && siteNav) document.body.appendChild(siteNav);
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav?.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
    if (isOpen) restoreNavigation();
  });

  $$("a", siteNav).forEach((link) => {
    link.addEventListener("click", () => {
      closeNavigation();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeNavigation();
  });

  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const chartAreaPath = (linePath, bottom = 350) => {
    const points = [...linePath.matchAll(/(?:M|L)(\d+)[ ,](\d+)/g)];
    if (!points.length) return linePath;
    const firstX = points[0][1];
    const lastX = points.at(-1)[1];
    return `${linePath}L${lastX} ${bottom}L${firstX} ${bottom}Z`;
  };

  const activateTabs = (buttons, activeButton) => {
    buttons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  };

  const publishedCharts = {
    DXY: { name: "U.S. dollar index", timeframe: "Daily", date: "18 October 2026", src: "assets/member-charts/dxy-2026-10-18.webp", height: 1484, description: "original candles and five marked Daily Zones" },
    NAS100: { name: "U.S. stock index", timeframe: "Daily", date: "18 October 2026", src: "assets/member-charts/nas100-2026-10-18.webp", height: 1484, description: "original candles and four marked Daily Zones" },
    GOLD: { name: "Gold", timeframe: "Daily", date: "18 October 2026", src: "assets/member-charts/gold-2026-10-18.webp", height: 1484, description: "original candles and five marked Daily Zones" },
    USDJPY: { name: "U.S. dollar / Japanese yen", timeframe: "4H", date: "12 October 2026", src: "assets/member-charts/usdjpy-4h-2026-10-12.webp", height: 1310, description: "original candles, marked buy and completion areas, and a conditional projected path" },
  };

  const bindPublishedCharts = (selector, dataKey, prefix) => {
    const buttons = $$(selector);
    if (!buttons.length) return;
    const image = $(`#${prefix}-chart-image`);
    const link = $(`#${prefix}-chart-open`);
    const panel = $(`#${prefix}-chart-panel`);
    const caption = $(`#${prefix}-chart-caption`);
    const render = (button) => {
      const symbol = button.dataset[dataKey];
      const chart = publishedCharts[symbol];
      if (!chart) return;
      activateTabs(buttons, button);
      buttons.forEach(item => { item.tabIndex = item === button ? 0 : -1; });
      image.src = chart.src;
      image.width = 2048;
      image.height = chart.height;
      image.alt = `Jay Bryan’s ${symbol} ${chart.timeframe} chart review from ${chart.date}, with ${chart.description}. Historical snapshot.`;
      link.href = chart.src;
      link.setAttribute("aria-label", `Open ${symbol} ${chart.timeframe} chart from ${chart.date} at full size (opens in a new tab)`);
      panel.setAttribute("aria-labelledby", button.id);
      caption.textContent = `${symbol} · ${chart.timeframe} · ${chart.date}`;
      if (prefix === "hero") {
        $("#hero-symbol").textContent = symbol;
        $("#hero-timeframe").textContent = chart.timeframe;
        $("#hero-status-regime").textContent = chart.name;
        $("#hero-status-timeframe").textContent = chart.timeframe;
        $("#hero-candle-description").textContent = chart.timeframe === "Daily" ? "One day per candle in this chart." : "Four hours per candle in this chart.";
      } else {
        $("#briefing-symbol").textContent = `${symbol} · ${chart.timeframe}`;
      }
    };
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => render(button));
      button.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        render(buttons[next]);
        buttons[next].focus();
      });
    });
    render(buttons.find(button => button.getAttribute("aria-selected") === "true") || buttons[0]);
  };
  bindPublishedCharts("[data-hero-market]", "heroMarket", "hero");

  const principleButtons = $$("[data-principle]");
  const principleExplainer = $("#authority-explainer");
  principleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      principleButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      principleExplainer.textContent = button.dataset.principle;
    });
  });

  const operatingStages = [
    {
      symbol: "DXY DAILY",
      kicker: "Stage 01",
      title: "Start with the daily chart",
      chartLabel: "A wider view of price",
      points: ["Each candle shows one day of price movement.", "Look for areas where price moved strongly.", "Mark the areas you want to study."],
      path: "M35 245L75 210L115 220L155 160L195 190L235 120L275 145L315 105L355 165L395 185L435 215L475 190L515 235L555 230L595 255L635 220L680 225",
    },
    {
      symbol: "USDJPY DAILY",
      kicker: "Stage 02",
      title: "Mark Daily Zones",
      chartLabel: "Find areas of past buying and selling",
      points: ["Mark areas where buyers or sellers pushed price away.", "Treat each zone as an area, not one exact price.", "Watch what happens when price returns."],
      path: "M35 190L75 178L115 205L155 185L195 202L235 182L275 206L315 186L355 208L395 188L435 205L475 180L515 198L555 175L595 194L635 170L680 182",
    },
    {
      symbol: "GOLD 4H",
      kicker: "Stage 03",
      title: "Watch how price reacts",
      chartLabel: "A zone is a place to watch",
      points: ["Wait for price to reach an area you marked.", "Look for the entry conditions in your plan.", "A zone alone is not a reason to enter a trade."],
      path: "M35 255L75 238L115 247L155 225L195 242L235 215L275 230L315 208L355 225L395 198L435 204L475 174L515 190L555 128L595 145L635 88L680 104",
    },
    {
      symbol: "NAS100 1H",
      kicker: "Stage 04",
      title: "Plan your risk before entering",
      chartLabel: "Know your planned exit if the idea is wrong",
      points: ["Decide what would make your trade idea wrong.", "Use a stop-loss to plan your exit if price goes against you.", "Choose a trade size that fits your loss limit."],
      path: "M35 250L75 230L115 240L155 205L195 218L235 184L275 198L315 160L355 174L395 138L435 152L475 118L515 132L555 102L595 120L635 92L680 110",
    },
    {
      symbol: "USDJPY DAILY",
      kicker: "Stage 05",
      title: "Review your trading decision",
      chartLabel: "Learn from the decision",
      points: ["Compare what happened with your original plan.", "Record whether you followed your rules.", "Choose one thing to practice next."],
      path: "M35 268L75 240L115 252L155 215L195 226L235 180L275 195L315 145L355 160L395 105L435 128L475 82L515 98L555 68L595 112L635 140L680 128",
    },
  ];

  let activeStage = 0;
  const stageButtons = $$("[data-stage]");
  const stagePanel = $("#stage-panel");

  const renderStage = (index, focusTab = false) => {
    activeStage = (index + operatingStages.length) % operatingStages.length;
    const stage = operatingStages[activeStage];
    const activeButton = stageButtons[activeStage];

    activateTabs(stageButtons, activeButton);
    $("#stage-symbol").textContent = stage.symbol;
    $("#stage-kicker").textContent = stage.kicker;
    $("#stage-title").textContent = stage.title;
    $("#stage-chart-label").textContent = stage.chartLabel;
    $("#stage-current").textContent = String(activeStage + 1).padStart(2, "0");
    $("#stage-line").setAttribute("d", stage.path);
    $("#stage-area").setAttribute("d", chartAreaPath(stage.path, 305));
    $("#stage-points").innerHTML = stage.points.map((point) => `<li>${point}</li>`).join("");

    stagePanel.classList.remove("is-changing");
    requestAnimationFrame(() => stagePanel.classList.add("is-changing"));
    if (focusTab) activeButton.focus();
  };

  stageButtons.forEach((button) => button.addEventListener("click", () => renderStage(Number(button.dataset.stage))));
  $("#stage-prev")?.addEventListener("click", () => renderStage(activeStage - 1, true));
  $("#stage-next")?.addEventListener("click", () => renderStage(activeStage + 1, true));

  bindPublishedCharts("[data-instrument]", "instrument", "briefing");

  const cycleStages = [
    { max: 24, name: "Sideways price", detail: "Price stays in a range", description: "Price may stay within a small area while buyers and sellers trade." },
    { max: 49, name: "Move outside a range", detail: "Watch the response", description: "Price may move beyond an earlier high or low. Watch what happens next." },
    { max: 78, name: "Strong move", detail: "Price moves away", description: "Price can move away from a zone. Wait for your entry conditions." },
    { max: 100, name: "Pullback", detail: "Price changes direction", description: "Price may move back toward an earlier area. Recheck your plan as conditions change." },
  ];

  const cycleScrubber = $("#cycle-scrubber");
  const cycleButtons = $$("[data-cycle-stage]");

  const renderCycle = (value) => {
    const position = Math.max(0, Math.min(100, Number(value)));
    const stage = cycleStages.find((item) => position <= item.max) || cycleStages.at(-1);
    const stageIndex = cycleStages.indexOf(stage);
    $("#cycle-progress-fill").style.width = `${position}%`;
    $("#cycle-tooltip").style.left = `${Math.max(5, Math.min(95, position))}%`;
    $("#cycle-tooltip span").textContent = stage.name;
    $("#cycle-tooltip b").textContent = stage.detail;
    $("#cycle-description").textContent = stage.description;
    cycleButtons.forEach((button, index) => {
      const isActive = index === stageIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  };

  cycleScrubber?.addEventListener("input", (event) => renderCycle(event.target.value));
  cycleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.cycleStage;
      cycleScrubber.value = value;
      renderCycle(value);
    });
  });

  const caseSlider = $("#case-slider");
  caseSlider?.addEventListener("input", (event) => {
    $("#case-comparison").style.setProperty("--position", `${event.target.value}%`);
  });

  const resourceTrack = $("#resource-track");
  const resourceCards = resourceTrack ? $$(".resource-card", resourceTrack) : [];
  let activeResource = 0;

  const renderResource = () => {
    if (!resourceTrack || !resourceCards.length) return;
    resourceCards.forEach((card, index) => card.classList.toggle("is-featured", index === activeResource));
    $("#resources-count").textContent = `${String(activeResource + 1).padStart(2, "0")} / ${String(resourceCards.length).padStart(2, "0")}`;

    const viewport = resourceTrack.parentElement;
    viewport.classList.add("has-carousel-controls");
    viewport.scrollLeft = 0;
    const cardWidth = resourceCards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(resourceTrack).gap) || 16;
    const maxOffset = Math.max(0, resourceTrack.scrollWidth - viewport.clientWidth);
    const offset = Math.min(activeResource * (cardWidth + gap), maxOffset);
    resourceTrack.style.transform = `translateX(-${offset}px)`;
    $("#resources-count").setAttribute("aria-label", `Resource ${activeResource + 1} of ${resourceCards.length}`);
  };

  $("#resources-prev")?.addEventListener("click", () => {
    activeResource = (activeResource - 1 + resourceCards.length) % resourceCards.length;
    renderResource();
  });
  $("#resources-next")?.addEventListener("click", () => {
    activeResource = (activeResource + 1) % resourceCards.length;
    renderResource();
  });
  resourceCards.forEach((card, index) => {
    card.addEventListener("focus", () => {
      activeResource = index;
      renderResource();
    });
  });
  renderResource();
  window.addEventListener("resize", renderResource);

})();
