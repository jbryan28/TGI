# Trader Growth Institute

Institutional market-intelligence homepage and interactive capital-review tools for TraderGrowth.com.

## Included

- Interactive Market Pulse for DXY, NAS100, and Gold
- Expandable founder story and selectable authority principles
- Five-stage TGI Operating System explorer
- Switchable Intelligence Briefing instruments
- Interactive Institutional Market Cycle scrubber
- USDJPY base-to-displacement comparison slider
- Responsive resource carousel
- Weekly Capital Review at `/weekly-capital-review/` with autosave, export, print, and reset controls

## Run locally

This is a dependency-free static site. Serve the project root with any local HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Lead-capture configuration

The briefing form deliberately refuses to imply that an email was captured until a real endpoint exists. Add the Beehiiv or first-party subscription endpoint to the form as a `data-endpoint` attribute:

```html
<form id="signup-form" data-endpoint="https://your-secure-subscription-endpoint.example">
```

The endpoint must accept a JSON `POST` body containing `{ "email": "..." }` and return a successful HTTP status.

Do not expose a private Beehiiv API key in client-side JavaScript. Use a serverless function or Beehiiv's approved embedded subscription form.

## Publishing

The site is compatible with static hosting and GitHub Pages. Connect the custom TraderGrowth.com domain only after confirming that its existing DNS and production host are ready to move.
