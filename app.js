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

  const mobileLayout = window.matchMedia("(max-width: 620px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const fadeTasks = new WeakMap();
  const fadeSlide = (element, change) => {
    if (!element || reducedMotion.matches) { change(); return; }
    const previous = fadeTasks.get(element) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      if (reducedMotion.matches) { change(); return; }
      const out = element.animate([{opacity:1}, {opacity:0}], {duration:160, fill:"forwards", easing:"ease-in"});
      await out.finished;
      change();
      out.cancel();
      const incoming = element.animate([{opacity:0}, {opacity:1}], {duration:240, easing:"ease-out"});
      await incoming.finished;
    });
    fadeTasks.set(element, task);
    task.finally(() => { if (fadeTasks.get(element) === task) fadeTasks.delete(element); });
  };
  const fadeRenderer = (element, render) => {
    let initial = true;
    return (...args) => {
      if (initial) { initial = false; render(...args); }
      else fadeSlide(element, () => render(...args));
    };
  };

  // Four seconds between advances; interaction gives the reader a fresh interval.
  const bindSlideshow = (name, root, viewport, advance, mobileOnly = false) => {
    if (!root || !viewport) return;
    let visible = false;
    let hovered = false;
    let touching = false;
    let focused = false;
    let timer;
    root.dataset.slideshow = name;
    const announcements = $$("[aria-live]", root);
    const sync = () => {
      clearTimeout(timer);
      const enabled = !mobileOnly || mobileLayout.matches;
      const paused = reducedMotion.matches || touching || focused;
      const running = enabled && !paused && visible && !hovered && !document.hidden;
      root.dataset.slideshowState = !enabled ? "static" : paused ? "paused" : running ? "playing" : "waiting";
      announcements.forEach(element => element.setAttribute("aria-live", paused ? "polite" : "off"));
      if (running) timer = setTimeout(() => { advance(); sync(); }, 4000);
    };
    root.addEventListener("pointerdown", () => { touching = true; sync(); }, {passive:true});
    ["pointerup", "pointercancel"].forEach(type => document.addEventListener(type, () => { touching = false; sync(); }, {passive:true}));
    ["click", "input", "keydown", "wheel"].forEach(type => root.addEventListener(type, sync, {capture:true, passive:true}));
    root.addEventListener("focusin", event => { focused = event.target.matches(":focus-visible"); sync(); });
    root.addEventListener("focusout", event => { if (!root.contains(event.relatedTarget)) focused = false; sync(); });
    root.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") { hovered = true; sync(); } });
    root.addEventListener("pointerleave", event => { if (event.pointerType === "mouse") { hovered = false; sync(); } });
    document.addEventListener("visibilitychange", sync);
    mobileLayout.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
        sync();
      }, {threshold:[0,.15]}).observe(viewport);
    }
    sync();
  };

  const edgeArrows = (element, prefix, mobileOnly = false, wrap = false) => {
    if (!element) return;
    let frame = element;
    if (wrap) {
      frame = document.createElement("div");
      element.before(frame);
      frame.appendChild(element);
    }
    frame.classList.add("slideshow-frame");
    if (mobileOnly) frame.classList.add("slideshow-mobile-frame");
    ["prev", "next"].forEach((direction, index) => {
      const button = $(`#${prefix}-${direction}`);
      if (!button) return;
      button.classList.add("slideshow-arrow", `slideshow-arrow--${direction}`);
      button.innerHTML = `<svg viewBox="0 0 24 40" aria-hidden="true"><path d="${index ? "M5 4L19 20L5 36" : "M19 4L5 20L19 36"}"/></svg>`;
      frame.appendChild(button);
    });
  };

  const bindMobileSwipe = (element, changeSlide, allowLinks = false) => {
    if (!element) return;
    element.classList.add("mobile-gesture");
    document.body.classList.add("has-mobile-swipes");
    let start = null;
    let suppressClick = false;
    element.addEventListener("pointerdown", (event) => {
      suppressClick = false;
      if (!mobileLayout.matches || event.pointerType !== "touch" || !event.isPrimary) {
        start = null;
        return;
      }
      const excluded = allowLinks ? "button,input,select,textarea" : "a,button,input,select,textarea";
      if (event.target.closest(excluded)) { start = null; return; }
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { passive: true });
    element.addEventListener("pointercancel", () => { start = null; });
    element.addEventListener("pointerup", (event) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      suppressClick = true;
      changeSlide(dx < 0 ? 1 : -1);
    }, { passive: true });
    element.addEventListener("mousedown", (event) => {
      // A touch swipe can emit a compatibility mouse event that refocuses the old link.
      if (suppressClick) event.preventDefault();
    }, true);
    element.addEventListener("click", (event) => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  };

  // Native scrolling keeps card rails usable without JavaScript or swipe gestures.
  const bindMobileCards = (prefix, onSelect) => {
    const track = $(`#${prefix}-track`);
    if (!track) return;
    const cards = $$(".mobile-swipe-card", track);
    const previous = $(`#${prefix}-prev`);
    const next = $(`#${prefix}-next`);
    const count = $(`#${prefix}-count`);
    let index = 0;
    document.body.classList.add("has-mobile-swipes");
    const update = (value) => {
      index = Math.max(0, Math.min(cards.length - 1, value));
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
      previous.disabled = index === 0;
      next.disabled = index === cards.length - 1;
      onSelect?.(cards[index]);
    };
    const move = (value, animate = true) => {
      const change = () => {
      update(value);
      if (mobileLayout.matches) track.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: "instant" });
      };
      if (animate) fadeSlide(track, change); else change();
    };
    previous.addEventListener("click", () => move(index - 1));
    next.addEventListener("click", () => move(index + 1));
    let scheduled = false;
    track.addEventListener("scroll", () => {
      if (scheduled || !mobileLayout.matches) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        let nearest = 0;
        let distance = Infinity;
        cards.forEach((card, i) => {
          const gap = Math.abs(card.offsetLeft - cards[0].offsetLeft - track.scrollLeft);
          if (gap < distance) { nearest = i; distance = gap; }
        });
        update(nearest);
      });
    }, { passive: true });
    cards.forEach((card, i) => {
      card.addEventListener("focus", () => move(i));
      if (onSelect) card.addEventListener("click", () => move(i));
    });
    track.addEventListener("keydown", (event) => {
      if (!mobileLayout.matches) return;
      let value;
      if (event.key === "ArrowRight") value = index + 1;
      if (event.key === "ArrowLeft") value = index - 1;
      if (event.key === "Home") value = 0;
      if (event.key === "End") value = cards.length - 1;
      if (value === undefined) return;
      event.preventDefault();
      move(value);
      if (event.target !== track) cards[index].focus();
    });
    window.addEventListener("resize", () => {
      if (mobileLayout.matches) move(index, false);
      else track.scrollLeft = 0;
    });
    edgeArrows(track, prefix, true, true);
    move(0, false);
    bindSlideshow(prefix, track.closest(".briefing-benefits, section"), track, () => move((index + 1) % cards.length), true);
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
    const render = fadeRenderer(panel, (button) => {
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
      $("#hero-chart-full").href = chart.src;
      link.setAttribute("aria-label", `Open ${symbol} ${chart.timeframe} chart from ${chart.date} at full size (opens in a new tab)`);
      panel.setAttribute("aria-labelledby", button.id);
      caption.textContent = `${symbol} · ${chart.timeframe} · ${chart.date}`;
      if (prefix === "hero") {
        $("#hero-symbol").textContent = symbol;
        $("#hero-timeframe").textContent = chart.timeframe;
        $("#hero-status-regime").textContent = chart.name;
        $("#hero-status-timeframe").textContent = chart.timeframe;
        $("#hero-candle-description").textContent = chart.timeframe === "Daily" ? "One day per candle in this chart." : "Four hours per candle in this chart.";
        $("#hero-market-count").textContent = `${String(buttons.indexOf(button) + 1).padStart(2, "0")} / 04`;
      }
    });
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
    Object.values(publishedCharts).forEach(chart => { const preload = new Image(); preload.src = chart.src; });
    const move = (direction) => {
      const current = buttons.findIndex(button => button.getAttribute("aria-selected") === "true");
      render(buttons[(current + direction + buttons.length) % buttons.length]);
    };
    $("#hero-market-prev")?.addEventListener("click", () => move(-1));
    $("#hero-market-next")?.addEventListener("click", () => move(1));
    edgeArrows($(".published-chart-media", panel), "hero-market");
    bindMobileSwipe(panel, move, true);
    bindSlideshow("charts", panel.closest("section"), panel, () => move(1));
  };
  bindPublishedCharts("[data-hero-market]", "heroMarket", "hero");

  bindMobileCards("benefits");
  bindMobileCards("paths");

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

  const renderStage = fadeRenderer(stagePanel, (index, focusTab = false) => {
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

    if (focusTab) activeButton.focus();
  });
  if (stagePanel) renderStage(0);

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

  edgeArrows($("#stage-diagram"), "stage", false, true);
  bindMobileSwipe(stagePanel, (direction) => renderStage(activeStage + direction));
  bindSlideshow("steps", stagePanel?.closest("section"), stagePanel, () => renderStage(activeStage + 1));

  // Reserve the tallest lesson at this width so automatic changes do not move the page.
  const sizeLessons = () => {
    if (!stagePanel) return;
    const sample = stagePanel.cloneNode(true);
    const title = $("#stage-title", sample);
    const points = $("#stage-points", sample);
    const captionTitle = $("#stage-caption-title", sample);
    const caption = $("#stage-caption", sample);
    const figure = $(".stage-chart-wrap", sample);
    const copy = $(".stage-copy", sample);
    sample.removeAttribute("id");
    $$("[id]", sample).forEach(element => element.removeAttribute("id"));
    sample.classList.remove("is-changing");
    sample.setAttribute("aria-hidden", "true");
    sample.inert = true;
    sample.style.cssText = `position:fixed;left:-10000px;top:0;visibility:hidden;width:${stagePanel.getBoundingClientRect().width}px;pointer-events:none`;
    figure.style.minHeight = copy.style.minHeight = "0";
    stagePanel.parentElement.appendChild(sample);
    let figureHeight = 0;
    let copyHeight = 0;
    operatingStages.forEach(stage => {
      title.textContent = stage.title;
      points.innerHTML = stage.points.map(point => `<li>${point}</li>`).join("");
      captionTitle.textContent = stage.captionTitle;
      caption.textContent = stage.caption;
      figureHeight = Math.max(figureHeight, figure.getBoundingClientRect().height);
      copyHeight = Math.max(copyHeight, copy.getBoundingClientRect().height);
    });
    sample.remove();
    $(".stage-chart-wrap", stagePanel).style.minHeight = `${Math.ceil(figureHeight)}px`;
    $(".stage-copy", stagePanel).style.minHeight = `${Math.ceil(copyHeight)}px`;
  };
  let lessonResize;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(lessonResize);
    lessonResize = requestAnimationFrame(sizeLessons);
  });
  document.fonts.ready.then(sizeLessons);

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
      button.tabIndex = isActive ? 0 : -1;
    });
    $("#cycle-chart").setAttribute("aria-labelledby", cycleButtons[stageIndex].id);
    $("#cycle-count").textContent = `${String(stageIndex + 1).padStart(2, "0")} / 04`;
    const activeTab = cycleButtons[stageIndex];
    const strip = activeTab.parentElement;
    const box = activeTab.getBoundingClientRect();
    const bounds = strip.getBoundingClientRect();
    if (box.left < bounds.left) strip.scrollLeft += box.left - bounds.left;
    if (box.right > bounds.right) strip.scrollLeft += box.right - bounds.right;
  };

  cycleScrubber?.addEventListener("input", (event) => renderCycle(event.target.value));
  cycleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.cycleStage;
      cycleScrubber.value = value;
      fadeSlide($("#cycle-chart"), () => renderCycle(value));
    });
    button.addEventListener("keydown", (event) => {
      const current = cycleButtons.indexOf(button);
      let next;
      if (event.key === "ArrowRight") next = (current + 1) % cycleButtons.length;
      if (event.key === "ArrowLeft") next = (current - 1 + cycleButtons.length) % cycleButtons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = cycleButtons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      cycleButtons[next].click();
      cycleButtons[next].focus();
    });
  });
  const moveCycle = (direction) => {
    const current = cycleButtons.findIndex(button => button.getAttribute("aria-selected") === "true");
    const value = cycleButtons[(current + direction + cycleButtons.length) % cycleButtons.length].dataset.cycleStage;
    cycleScrubber.value = value;
    fadeSlide($("#cycle-chart"), () => renderCycle(value));
  };
  $("#cycle-prev")?.addEventListener("click", () => moveCycle(-1));
  $("#cycle-next")?.addEventListener("click", () => moveCycle(1));
  edgeArrows($("#cycle-chart"), "cycle");
  bindMobileSwipe($("#cycle-chart"), moveCycle);
  if (cycleScrubber) renderCycle(cycleScrubber.value);
  bindSlideshow("cycle", cycleScrubber?.closest("section"), $("#cycle-chart"), () => moveCycle(1));

  const resourceTrack = $("#resource-track");
  const resourceCards = resourceTrack ? $$(".resource-card", resourceTrack) : [];
  let activeResource = 0;

  const renderResource = fadeRenderer(resourceTrack, () => {
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
  });

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
  edgeArrows(resourceTrack?.parentElement, "resources");
  renderResource();
  window.addEventListener("resize", renderResource);
  bindMobileSwipe(resourceTrack?.parentElement, (direction) => {
    activeResource = (activeResource + direction + resourceCards.length) % resourceCards.length;
    renderResource();
  }, true);
  resourceTrack?.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (activeResource + 1) % resourceCards.length;
    if (event.key === "ArrowLeft") next = (activeResource - 1 + resourceCards.length) % resourceCards.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = resourceCards.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    activeResource = next;
    renderResource();
    resourceCards[next].focus();
  });
  bindSlideshow("resources", resourceTrack?.closest("section"), resourceTrack?.parentElement, () => {
    activeResource = (activeResource + 1) % resourceCards.length;
    renderResource();
  });

})();
