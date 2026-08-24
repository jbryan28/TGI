(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const layers = [
    {
      kicker: "Layer 01 / Core curriculum",
      title: "Build the Capital Operator foundation.",
      summary: "A finite, fully produced learning path establishes the doctrine before current-market commentary adds complexity.",
      points: ["26 doctrine lessons across seven phases", "Seven labs and seven 90% checkpoints", "Capstone, final examination, and completion certificate"],
      pulse: "18%",
    },
    {
      kicker: "Layer 02 / Operating desk",
      title: "Apply the doctrine to current markets.",
      summary: "A scheduled desk connects education to preparation without turning commentary into signals or manufactured activity.",
      points: ["Sunday Weekly Capital Brief", "Weekday Daily Desk Status", "Friday review and monthly Operator Clinic"],
      pulse: "50%",
    },
    {
      kicker: "Layer 03 / Review loop",
      title: "Convert decisions into evidence.",
      summary: "Review closes the gap between understanding the doctrine and consistently executing it under risk.",
      points: ["Weekly Capital Review", "Trade compliance and process grading", "Separate CDZA™ readiness pathway"],
      pulse: "82%",
    },
  ];

  const phases = [
    {
      kicker: "Phase 01 / Chapters 1–5",
      title: "Institutional foundation",
      description: "Replace prediction and reactive retail language with institutional evidence, Daily authority, and capital-based decision-making.",
      outcomes: ["The Market Is Not Random", "Liquidity Governs Expansion", "Institutions vs. Retail Behavior", "The Clean Chart Doctrine", "The Law of Capital Footprints"],
      proof: "Ten-chart evidence archive plus seven observation-only days.",
    },
    {
      kicker: "Phase 02 / Chapters 6–9",
      title: "Market structure",
      description: "Learn to distinguish institutional inventory and unfinished business from ordinary chart movement.",
      outcomes: ["Base and Institutional Inventory", "Displacement", "Inefficiency", "Fresh vs. Tested Inventory"],
      proof: "Twenty-five-chart Institutional Footprint Archive.",
    },
    {
      kicker: "Phase 03 / Chapters 10–11",
      title: "Daily Zone architecture",
      description: "Replace subjective rectangles with a repeatable grading and mapping process grounded in observable institutional evidence.",
      outcomes: ["Zone Strength Grading™", "TGI Zone Score™", "Daily Zone Blueprint Method™"],
      proof: "Grade 50 zones and build inventory maps for five markets.",
    },
    {
      kicker: "Phase 04 / Chapters 16–20",
      title: "Risk architecture",
      description: "Define invalidation, position size, payoff, management, drawdown, and recovery before learning to deploy capital.",
      outcomes: ["Structural Stop Placement", "The 1% Law", "Risk-to-Reward Engineering", "Trade Management Phases", "The Recovery Doctrine"],
      proof: "Personal risk model, circuit breakers, and five-loss recovery audit.",
    },
    {
      kicker: "Phase 05 / Chapters 12–15",
      title: "Authorized execution",
      description: "Require location, liquidity, compression, timing, and the full authorization sequence before converting evidence into action.",
      outcomes: ["The Control Window™", "Liquidity Harvesting", "Compression Before Expansion", "The Expansion Trigger™"],
      proof: "Twenty simulated authorized opportunities plus an Unauthorized Trade Log.",
    },
    {
      kicker: "Phase 06 / Chapters 21–24",
      title: "Capital operations",
      description: "Govern preparation, watchlists, exposure, review, and cross-market application as one connected operating system.",
      outcomes: ["Institutional Operating System™", "Capital Governance™", "Institutional Watchlist Construction", "Bitcoin and Cross-Market Application"],
      proof: "Governance dashboard, four Weekly Capital Reviews, and twenty-session preservation log.",
    },
    {
      kicker: "Phase 07 / Chapters 25–26",
      title: "Capital Operator qualification",
      description: "Convert doctrine into documented operating identity while keeping course completion separate from CDZA™ Certification.",
      outcomes: ["CDZA™ Execution Standard", "Capital Operator Identity™", "Playbook and 50-trade Process Audit", "Capital Operator Constitution"],
      proof: "Capstone, teach-back, 90% final examination, and CDZA™ readiness plan.",
    },
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
      $("#phase-proof").textContent = phase.proof;
    });
  });
})();
