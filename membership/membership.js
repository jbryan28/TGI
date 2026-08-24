(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const layers = [
    {
      kicker: "Layer 01 / Core curriculum",
      title: "Build the Capital Operator foundation.",
      summary: "A finite learning path establishes the doctrine before live market commentary adds complexity.",
      points: ["Market structure and higher-timeframe authority", "Daily Zones, liquidity, and institutional inventory", "Risk architecture and authorized execution"],
      pulse: "18%",
    },
    {
      kicker: "Layer 02 / Operating desk",
      title: "Apply the doctrine to current markets.",
      summary: "The recurring layer connects structured education to preparation without turning commentary into signals.",
      points: ["Weekly market briefing and drivers", "Institutional watchlist and Daily Zone context", "Scenario conditions, invalidation, and no-trade logic"],
      pulse: "50%",
    },
    {
      kicker: "Layer 03 / Review loop",
      title: "Convert decisions into evidence.",
      summary: "Review closes the gap between understanding the doctrine and consistently executing it under risk.",
      points: ["Weekly Capital Review", "Trade reviews and process grading", "Member updates and documented lessons"],
      pulse: "82%",
    },
  ];

  const phases = [
    { kicker: "Phase 01", title: "Institutional foundation", description: "Replace prediction, excitement, and isolated setups with mandate, probability, and structured decision-making.", outcomes: ["Capital Operator identity", "Role clarity and operating mandate", "Preparation over prediction"] },
    { kicker: "Phase 02", title: "Market structure", description: "Read higher-timeframe authority, market regime, liquidity, and the institutional cycle before evaluating a setup.", outcomes: ["Monthly–Weekly–Daily hierarchy", "Regime classification", "Liquidity and institutional intent"] },
    { kicker: "Phase 03", title: "Daily Zones", description: "Locate the institutional inventory that gives lower-timeframe execution a defensible decision point.", outcomes: ["Supply and demand qualification", "Base and displacement", "Zone freshness and structural context"] },
    { kicker: "Phase 04", title: "Risk architecture", description: "Define loss, concentration, drawdown, and payoff requirements before capital receives permission.", outcomes: ["The 1% Law™", "Correlation and exposure control", "Risk–reward engineering"] },
    { kicker: "Phase 05", title: "Authorized execution", description: "Require the complete evidence sequence before converting a location into a trade decision.", outcomes: ["Compression break", "Controlled retest", "Impulse and invalidation"] },
    { kicker: "Phase 06", title: "Portfolio thinking", description: "Assign each account a job and govern positions as connected capital exposures rather than isolated trades.", outcomes: ["Investor versus Cash Flow Desk", "Account mandate", "Portfolio-level capital allocation"] },
    { kicker: "Phase 07", title: "Capital Operator framework", description: "Integrate preparation, execution, management, review, and preservation into one repeatable operating cycle.", outcomes: ["Weekly operating rhythm", "Capital preservation decisions", "Evidence-based scaling readiness"] },
  ];

  const layerButtons = $$('[data-membership-layer]');
  layerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.membershipLayer);
      const layer = layers[index];
      if (!layer) return;
      layerButtons.forEach((item, itemIndex) => {
        const active = itemIndex === index;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      $("#layer-kicker").textContent = layer.kicker;
      $("#layer-title").textContent = layer.title;
      $("#layer-summary").textContent = layer.summary;
      $("#layer-points").innerHTML = layer.points.map((point) => `<li>${point}</li>`).join("");
      $("#layer-pulse").style.left = layer.pulse;
    });
  });

  const phaseButtons = $$('[data-program-phase]');
  phaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.programPhase);
      const phase = phases[index];
      if (!phase) return;
      phaseButtons.forEach((item, itemIndex) => {
        const active = itemIndex === index;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      $("#phase-kicker").textContent = phase.kicker;
      $("#phase-title").textContent = phase.title;
      $("#phase-description").textContent = phase.description;
      $("#phase-outcomes").innerHTML = phase.outcomes.map((outcome) => `<li>${outcome}</li>`).join("");
    });
  });
})();
