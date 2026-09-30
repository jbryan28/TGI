const canonicalUrl = "https://www.tradergrowth.com/jay/";
const shareButton = document.getElementById("share-card");
const status = document.getElementById("share-status");

shareButton.addEventListener("click", async () => {
  const data = { title: "Jay Bryan | Trader Growth Institute", text: "Connect with Jay Bryan and explore TGI.", url: canonicalUrl };
  try {
    if (navigator.share) {
      await navigator.share(data);
      status.textContent = "Contact page shared.";
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(canonicalUrl);
      status.textContent = "Link copied. Paste it into a message or email.";
    } else {
      status.textContent = `Share this link: ${canonicalUrl}`;
    }
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = `Share this link: ${canonicalUrl}`;
  }
});
