(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const desks = [
    {
      kicker: "Desk 01 / Prepare",
      title: "Read authority before opportunity.",
      summary: "Establish the environment that governs every lower-timeframe decision.",
      points: ["Market regime", "Conditional Weekly Bias", "High-impact risk calendar"],
      path: "16%",
      marker: "28%",
    },
    {
      kicker: "Desk 02 / Authorize",
      title: "Define where capital earns permission.",
      summary: "Map qualified inventory, then require evidence before a location becomes an execution.",
      points: ["Qualified Daily Zones", "Authorization conditions", "Objective invalidation"],
      path: "49%",
      marker: "59%",
    },
    {
      kicker: "Desk 03 / Preserve",
      title: "Know when participation is unauthorized.",
      summary: "Protect the mandate when volatility, correlation, or structure makes the opportunity unqualified.",
      points: ["No-trade conditions", "Exposure and correlation limits", "Capital-preservation decision"],
      path: "76%",
      marker: "84%",
    },
  ];

  const deskButtons = $$('[data-briefing-desk]');
  const renderDesk = (index) => {
    const desk = desks[index];
    if (!desk) return;

    deskButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === index;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    $("#desk-kicker").textContent = desk.kicker;
    $("#desk-title").textContent = desk.title;
    $("#desk-summary").textContent = desk.summary;
    $("#desk-points").innerHTML = desk.points.map((point) => `<li>${point}</li>`).join("");
    $("#desk-path").style.width = desk.path;
    $("#desk-marker").style.left = desk.marker;
  };

  deskButtons.forEach((button) => {
    button.addEventListener("click", () => renderDesk(Number(button.dataset.briefingDesk)));
  });

  const track = (event, detail = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...detail });
  };

  $$('[data-newsletter-cta]').forEach((link) => {
    link.addEventListener("click", () => track("newsletter_cta_click", { placement: link.dataset.newsletterCta }));
  });

  const fallbackForm = $("#newsletter-preview-form");
  const fallbackMessage = $("#newsletter-form-message");
  const embedHost = $("#beehiiv-embed-host");
  const newsletterConfig = window.TGI_NEWSLETTER_CONFIG || {};
  const configuredUrl = newsletterConfig.beehiivEmbedScriptUrl?.trim();
  const configuredFormId = newsletterConfig.beehiivFormId?.trim();
  const attributionUrl = newsletterConfig.beehiivAttributionScriptUrl?.trim();

  const isApprovedBeehiivUrl = (value) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "beehiiv.com" || url.hostname.endsWith(".beehiiv.com"));
    } catch {
      return false;
    }
  };

  const isValidFormId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");

  if (isApprovedBeehiivUrl(configuredUrl) && isValidFormId(configuredFormId) && embedHost && fallbackForm) {
    const script = document.createElement("script");
    script.src = configuredUrl;
    script.async = true;
    script.dataset.cfasync = "false";
    script.dataset.beehiivForm = configuredFormId;
    script.addEventListener("load", () => {
      fallbackForm.hidden = true;
      track("newsletter_embed_loaded", { provider: "beehiiv", form_id: configuredFormId });
    });
    script.addEventListener("error", () => {
      fallbackMessage.textContent = "The secure signup form could not load. Please refresh and try again.";
      fallbackMessage.className = "form-message is-error";
    });
    embedHost.appendChild(script);
  }

  if (isApprovedBeehiivUrl(attributionUrl)) {
    const attributionScript = document.createElement("script");
    attributionScript.src = attributionUrl;
    attributionScript.type = "text/javascript";
    attributionScript.async = true;
    attributionScript.dataset.newsletterAttribution = "beehiiv";
    document.body.appendChild(attributionScript);
  }

  fallbackForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = $("#newsletter-email");
    fallbackMessage.className = "form-message";

    if (!email.validity.valid) {
      fallbackMessage.textContent = "Enter a valid email address.";
      fallbackMessage.classList.add("is-error");
      email.focus();
      return;
    }

    fallbackMessage.textContent = "The secure signup form is unavailable. Please refresh and try again.";
    fallbackMessage.classList.add("is-error");
  });
})();
