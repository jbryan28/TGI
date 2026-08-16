(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const header = $("[data-header]");
  const navToggle = $(".nav-toggle");
  const siteNav = $("#site-nav");

  const setHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav?.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  $$("a", siteNav).forEach((link) => {
    link.addEventListener("click", () => {
      navToggle?.setAttribute("aria-expanded", "false");
      siteNav?.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    });
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

  const heroMarkets = {
    DXY: {
      regime: "Accumulation",
      path: "M40 280L76 244L112 202L148 228L184 140L220 178L256 86L292 118L328 194L364 128L400 96L436 155L472 170L508 218L544 190L580 244L616 260L652 246L688 272",
      point: [688, 272],
    },
    NAS100: {
      regime: "Expansion",
      path: "M40 292L76 270L112 282L148 240L184 250L220 208L256 224L292 180L328 202L364 156L400 168L436 115L472 132L508 92L544 118L580 82L616 98L652 65L688 78",
      point: [688, 78],
    },
    GOLD: {
      regime: "Capital Completion",
      path: "M40 278L76 250L112 258L148 214L184 230L220 188L256 205L292 148L328 176L364 128L400 140L436 98L472 112L508 80L544 104L580 72L616 126L652 156L688 144",
      point: [688, 144],
    },
  };

  const heroButtons = $$("[data-hero-market]");
  heroButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const symbol = button.dataset.heroMarket;
      const market = heroMarkets[symbol];
      if (!market) return;

      activateTabs(heroButtons, button);
      $("#hero-symbol").textContent = symbol;
      $("#hero-regime").textContent = `Market regime: ${market.regime}`;
      $("#hero-status-regime").textContent = market.regime;
      $("#hero-chart-line").setAttribute("d", market.path);
      $("#hero-chart-area").setAttribute("d", chartAreaPath(market.path));
      $("#hero-last-point").setAttribute("cx", market.point[0]);
      $("#hero-last-point").setAttribute("cy", market.point[1]);
      $("#hero-chart-title").textContent = `${symbol} daily market structure`;
      $("#hero-chart-desc").textContent = `${symbol} daily chart showing price, supply, demand, and balance.`;
    });
  });

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
      title: "Market Regime: Accumulation",
      chartLabel: "Market regime: Accumulation",
      points: ["Begin with the Daily chart.", "Separate authority from noise.", "Define the prevailing regime."],
      path: "M35 245L75 210L115 220L155 160L195 190L235 120L275 145L315 105L355 165L395 185L435 215L475 190L515 235L555 230L595 255L635 220L680 225",
    },
    {
      symbol: "USDJPY DAILY",
      kicker: "Stage 02",
      title: "Locate Institutional Inventory",
      chartLabel: "Compression inside Daily demand",
      points: ["Map Daily supply and demand.", "Find the base beneath displacement.", "Let liquidity expose inventory."],
      path: "M35 190L75 178L115 205L155 185L195 202L235 182L275 206L315 186L355 208L395 188L435 205L475 180L515 198L555 175L595 194L635 170L680 182",
    },
    {
      symbol: "GOLD 4H",
      kicker: "Stage 03",
      title: "Authorize Execution",
      chartLabel: "Compression break → retest → impulse",
      points: ["Wait for a break in compression.", "Require the retest to hold.", "Enter only on proven intent."],
      path: "M35 255L75 238L115 247L155 225L195 242L235 215L275 230L315 208L355 225L395 198L435 204L475 174L515 190L555 128L595 145L635 88L680 104",
    },
    {
      symbol: "NAS100 1H",
      kicker: "Stage 04",
      title: "Govern Risk Before Entry",
      chartLabel: "1% law · minimum 1:3 R",
      points: ["Define invalidation first.", "Size from the stop, not conviction.", "Protect the capital mandate."],
      path: "M35 250L75 230L115 240L155 205L195 218L235 184L275 198L315 160L355 174L395 138L435 152L475 118L515 132L555 102L595 120L635 92L680 110",
    },
    {
      symbol: "USDJPY DAILY",
      kicker: "Stage 05",
      title: "Complete the Capital Cycle",
      chartLabel: "Partial → protect → distribute",
      points: ["Secure profit at first liquidity.", "Remove unnecessary exposure.", "Return capital to flat risk."],
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

  const briefingMarkets = {
    DXY: {
      regime: "Accumulation",
      bias: "Bullish > 102.10",
      risk: "CPI / NFP",
      price: "102.247",
      path: "M40 252L80 212L120 225L160 150L200 185L240 116L280 138L320 96L360 168L400 182L440 235L480 205L520 245L560 277L600 250L640 300L680 285L720 245L760 225L805 236L840 208",
    },
    GOLD: {
      regime: "Expansion",
      bias: "Bullish > 2,420",
      risk: "FOMC / CPI",
      price: "2,468.30",
      path: "M40 292L80 270L120 278L160 246L200 258L240 215L280 232L320 190L360 204L400 170L440 186L480 140L520 158L560 116L600 132L640 88L680 105L720 72L760 94L805 62L840 74",
    },
    NAS100: {
      regime: "Liquidity Harvesting",
      bias: "Neutral < 25,150",
      risk: "CPI / Earnings",
      price: "24,982.8",
      path: "M40 215L80 180L120 205L160 142L200 175L240 126L280 158L320 105L360 148L400 116L440 170L480 145L520 210L560 188L600 244L640 220L680 264L720 235L760 246L805 216L840 230",
    },
    USDJPY: {
      regime: "Expansion",
      bias: "Bullish > 158.88",
      risk: "BOJ / US10Y",
      price: "159.640",
      path: "M40 300L80 278L120 287L160 258L200 270L240 240L280 252L320 215L360 228L400 190L440 204L480 170L520 186L560 148L600 162L640 120L680 134L720 98L760 112L805 72L840 86",
    },
  };

  const briefingButtons = $$("[data-instrument]");
  briefingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const symbol = button.dataset.instrument;
      const market = briefingMarkets[symbol];
      if (!market) return;
      activateTabs(briefingButtons, button);
      $("#briefing-symbol").textContent = `${symbol} DAILY`;
      $("#briefing-price").textContent = market.price;
      $("#signal-regime").textContent = market.regime;
      $("#signal-bias").textContent = market.bias;
      $("#signal-risk").textContent = market.risk;
      $("#briefing-line").setAttribute("d", market.path);
      $("#briefing-area").setAttribute("d", chartAreaPath(market.path, 365));
      $("#briefing-chart-title").textContent = `${symbol} chart with institutional zones`;
    });
  });

  const cycleStages = [
    { max: 24, name: "Accumulation", detail: "Smart Money Builds Positions", description: "Inventory builds while price remains contained inside value." },
    { max: 49, name: "Liquidity Harvesting", detail: "Liquidity Taken", description: "Price reaches beyond the range to harvest resting orders." },
    { max: 78, name: "Expansion", detail: "Price Discovery", description: "Price discovery begins as institutional inventory is released." },
    { max: 100, name: "Capital Completion", detail: "Profits Distributed", description: "The move matures and risk is distributed or returned to flat." },
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
  const resourceCards = $$(".resource-card", resourceTrack);
  let activeResource = 0;

  const renderResource = () => {
    resourceCards.forEach((card, index) => card.classList.toggle("is-featured", index === activeResource));
    $("#resources-count").textContent = `${String(activeResource + 1).padStart(2, "0")} / ${String(resourceCards.length).padStart(2, "0")}`;

    if (window.matchMedia("(max-width: 900px)").matches) {
      const cardWidth = resourceCards[0].getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(resourceTrack).gap) || 16;
      resourceTrack.style.transform = `translateX(-${activeResource * (cardWidth + gap)}px)`;
    } else {
      resourceTrack.style.transform = "translateX(0)";
    }
  };

  $("#resources-prev")?.addEventListener("click", () => {
    activeResource = (activeResource - 1 + resourceCards.length) % resourceCards.length;
    renderResource();
  });
  $("#resources-next")?.addEventListener("click", () => {
    activeResource = (activeResource + 1) % resourceCards.length;
    renderResource();
  });
  window.addEventListener("resize", renderResource);

  const signupForm = $("#signup-form");
  signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = $("#email");
    const message = $("#form-message");
    const endpoint = signupForm.dataset.endpoint;

    message.className = "form-message";
    if (!emailInput.validity.valid) {
      message.textContent = "Enter a valid email address.";
      message.classList.add("is-error");
      emailInput.focus();
      return;
    }

    if (!endpoint) {
      message.textContent = "Briefing signup is awaiting the Beehiiv endpoint.";
      message.classList.add("is-error");
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.value.trim() }),
      });
      if (!response.ok) throw new Error("Subscription failed");
      message.textContent = "You’re on the list. Watch your inbox for the next briefing.";
      message.classList.add("is-success");
      signupForm.reset();
    } catch {
      message.textContent = "We could not complete the signup. Please try again.";
      message.classList.add("is-error");
    }
  });
})();
