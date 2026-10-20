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
      kicker: "Stage 01",
      title: "Start with the daily chart",
      captionTitle: "Read the bigger picture.",
      caption: "Follow the daily candles to see where price rose, fell, and turned.",
      description: "Sixteen daily candles show price rising, falling, and returning to an earlier low. Each candle represents one day.",
      points: ["Each candle shows one day of price movement.", "Look for areas where price moved strongly.", "Mark the areas you want to study."],
    },
    {
      kicker: "Stage 02",
      title: "Mark Daily Zones",
      captionTitle: "Mark areas, not exact prices.",
      caption: "Gold marks Daily Supply, where price fell away. Green marks Daily Demand, where price rose away.",
      description: "The same daily candles now have a gold Daily Supply area around an earlier high and a green Daily Demand area around an earlier low. Both zones cover an area rather than a single price.",
      points: ["Mark areas where buyers or sellers pushed price away.", "Treat each zone as an area, not one exact price.", "Watch what happens when price returns."],
    },
    {
      kicker: "Stage 03",
      title: "Watch how price reacts",
      captionTitle: "A touch is a reason to watch.",
      caption: "Price returns to Daily Demand. The highlighted candle closes back above the zone; check the conditions in your plan before acting.",
      description: "Price returns to the green Daily Demand area. An arrow marks the return and a circle highlights the next candle closing back above the zone. This reaction alone does not guarantee a valid entry or a winning trade.",
      points: ["Wait for price to reach an area you marked.", "Look for the entry conditions in your plan.", "A zone alone is not a reason to enter a trade."],
    },
    {
      kicker: "Stage 04",
      title: "Plan your risk before entering",
      captionTitle: "Know the risk before the trade.",
      caption: "The shaded gap between the planned entry and stop-loss shows the price risk. Trade size sets the money at risk. Stops may fill beyond the planned price.",
      description: "A planned entry is marked above Daily Demand. A stop-loss is marked below the zone, with the distance between entry and stop shaded to show planned price risk. Trade size determines the money at risk; the stop price is not a guaranteed fill.",
      points: ["Decide what would make your trade idea wrong.", "Use a stop-loss to plan your exit if price goes against you.", "Choose a trade size that fits your loss limit."],
    },
    {
      kicker: "Stage 05",
      title: "Review your trading decision",
      captionTitle: "Review the win against your plan.",
      caption: "Example profit: +2R means twice the amount risked, before trading costs. Price rises to the planned target near Daily Supply. Review your entry, risk, and exit against the original plan.",
      description: "Three later daily candles are revealed. Price rises from the entry to the planned profit target at Daily Supply. A green check marks the winning exit. The target is twice as far from entry as the stop-loss. The example result is plus 2R, or twice the amount risked, before trading costs. This is a hypothetical teaching outcome, not a real trading result.",
      points: ["Compare what happened with your original plan.", "Record whether you followed your rules.", "Choose one thing to practice next."],
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
    stageButtons.forEach(button => { button.tabIndex = button === activeButton ? 0 : -1; });
    stagePanel.setAttribute("aria-labelledby", activeButton.id);
    $("#stage-kicker").textContent = stage.kicker;
    $("#stage-title").textContent = stage.title;
    $("#stage-diagram").dataset.step = String(activeStage);
    $("#stage-chart-title").textContent = stage.title;
    $("#stage-chart-desc").textContent = `Teaching chart. ${stage.description} No real market prices or trade results are shown.`;
    $("#stage-caption-title").textContent = stage.captionTitle;
    $("#stage-caption").textContent = stage.caption;
    $("#stage-current").textContent = String(activeStage + 1).padStart(2, "0");
    $("#stage-points").innerHTML = stage.points.map((point) => `<li>${point}</li>`).join("");

    // Reveal the selected step inside the horizontal tab strip without moving the page.
    const strip = activeButton.parentElement;
    const tabRect = activeButton.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    if (tabRect.left < stripRect.left) strip.scrollLeft += tabRect.left - stripRect.left;
    if (tabRect.right > stripRect.right) strip.scrollLeft += tabRect.right - stripRect.right;

    stagePanel.classList.remove("is-changing");
    requestAnimationFrame(() => stagePanel.classList.add("is-changing"));
    if (focusTab) activeButton.focus();
  };

  stageButtons.forEach((button, index) => {
    button.addEventListener("click", () => renderStage(index));
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = index + 1;
      if (event.key === "ArrowLeft") next = index - 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = stageButtons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      renderStage(next, true);
    });
  });
  $("#stage-prev")?.addEventListener("click", () => renderStage(activeStage - 1));
  $("#stage-next")?.addEventListener("click", () => renderStage(activeStage + 1));

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
