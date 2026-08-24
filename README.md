# Trader Growth Institute

Institutional market-intelligence homepage and interactive capital-review tools for TraderGrowth.com.

## Included

- Interactive Market Pulse for DXY, NAS100, and Gold
- Expandable founder story and selectable authority principles
- Five-stage TGI Operating System explorer
- Switchable Intelligence Briefing instruments
- Dedicated `/newsletter/` conversion route with a three-desk issue explorer, one canonical signup location, Beehiiv-safe embed configuration, and a `/newsletter/welcome/` confirmation route
- Interactive Institutional Market Cycle scrubber
- USDJPY base-to-displacement comparison slider
- Responsive resource carousel
- Weekly Capital Review at `/weekly-capital-review/` with autosave, export, print, and reset controls
- CDZA™ Execution Standard at `/cdza/`, grounded in Chapter 24 of *The Daily Zone Command*, with an interactive Compression → Displacement → Zone → Authorization sequence
- Official CDZA™ Certification Journal at `/cdza/journal/` with a 20-trade ledger, Grade A–F scorecard controls, browser-local autosave, and print/PDF support
- Interactive trading glossary at `/glossary/`
- Privacy Policy, Terms of Use, and Trading Risk Disclosure routes
- Automated interaction and screenshot QA in Chromium, Firefox, and WebKit

## Run locally

This is a dependency-free static site. Serve the project root with any local HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Quality checks

The pull-request workflow runs static structure checks and the complete interaction suite in Chromium, Firefox, and WebKit. Browser reports, failure traces, and full-page screenshots are retained as GitHub Actions artifacts.

```bash
npm install
npx playwright install chromium firefox webkit
npm run check
npm run test:e2e
```

## Newsletter and lead-capture configuration

The briefing funnel deliberately refuses to imply that an email was captured until a real Beehiiv form exists. In Beehiiv, create and publish one **Regular / Inline** subscribe form for external websites, configure double opt-in as required, and set the successful-submission redirect to:

```text
https://www.tradergrowth.com/newsletter/welcome/
```

The live Beehiiv form and attribution scripts are configured in `newsletter/config.js`:

```js
window.TGI_NEWSLETTER_CONFIG = Object.freeze({
  beehiivEmbedScriptUrl: "https://subscribe-forms.beehiiv.com/v3/loader.js",
  beehiivFormId: "11ce4844-7014-4245-ae48-50f9805170b0",
  beehiivAttributionScriptUrl: "https://subscribe-forms.beehiiv.com/attribution.js",
});
```

The integration accepts only HTTPS scripts hosted on a Beehiiv-owned domain and validates the form UUID before loading. Do not expose a private Beehiiv API key in client-side JavaScript. The attribution script forwards UTM acquisition context to Beehiiv.

## Publishing

The repository is already configured for GitHub Pages at `www.tradergrowth.com`. The pull-request quality gate must pass before any production publishing workflow is enabled. Production deployment remains a separate, explicit release decision because this domain is live-facing rather than a staging URL.

The legal pages are an operational draft grounded in current regulator guidance. Qualified counsel should approve the final policies before paid acquisition or broad public launch.
