(() => {
  const host = document.getElementById('dollar-embed-host');
  const status = document.getElementById('signup-status');
  const config = window.TGI_NEWSLETTER_CONFIG || {};
  const approved = value => {
    try { const u = new URL(value); return u.protocol === 'https:' && (u.hostname === 'beehiiv.com' || u.hostname.endsWith('.beehiiv.com')); }
    catch { return false; }
  };
  const fail = () => { status.hidden = false; status.textContent = 'The secure signup form could not load. Please refresh and try again.'; };
  if (!host || !status) return;
  if (!approved(config.beehiivEmbedScriptUrl) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.beehiivFormId || '')) { fail(); return; }
  const track = (event, detail = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({event, campaign: 'dollar-moving', ...detail}); };
  track('guide_landing_view');
  const script = document.createElement('script');
  script.src = config.beehiivEmbedScriptUrl; script.async = true; script.dataset.cfasync = 'false'; script.dataset.beehiivForm = config.beehiivFormId;
  script.addEventListener('error', fail);
  // Script load alone is not proof the form rendered or that a subscription succeeded.
  let timer;
  const observer = new MutationObserver(() => {
    if (host.querySelector('iframe, form')) { status.hidden = true; observer.disconnect(); clearTimeout(timer); track('guide_embed_rendered', {provider: 'beehiiv'}); }
  });
  observer.observe(host, {childList: true, subtree: true});
  timer = setTimeout(() => { if (!host.querySelector('iframe, form')) { fail(); observer.disconnect(); } }, 12000);
  host.appendChild(script);
  if (approved(config.beehiivAttributionScriptUrl)) { const attribution = document.createElement('script'); attribution.src = config.beehiivAttributionScriptUrl; attribution.async = true; document.body.appendChild(attribution); }
})();
