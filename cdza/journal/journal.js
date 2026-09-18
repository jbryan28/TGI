const journalForm = document.querySelector("#journal-form");
const journalStatus = document.querySelector("#journal-status");
const storageKey = "tgi-cdza-certification-journal-v1";
let saveTimer;

const snapshot = () => Object.fromEntries(
  [...journalForm.elements]
    .filter((field) => field.name)
    .map((field) => [field.name, field.type === "checkbox" ? field.checked : field.value]),
);

const save = () => {
  localStorage.setItem(storageKey, JSON.stringify(snapshot()));
  journalStatus.textContent = `Saved locally at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
};

const restore = () => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return;
  try {
    const values = JSON.parse(stored);
    Object.entries(values).forEach(([name, value]) => {
      const field = journalForm.elements.namedItem(name);
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value;
    });
    journalStatus.textContent = "Saved journal restored from this browser.";
  } catch {
    journalStatus.textContent = "The saved journal could not be restored.";
  }
};

journalForm.addEventListener("input", () => {
  clearTimeout(saveTimer);
  journalStatus.textContent = "Saving…";
  saveTimer = setTimeout(save, 300);
});

document.querySelector("#journal-print").addEventListener("click", () => window.print());
document.querySelector("#journal-reset").addEventListener("click", () => {
  if (!window.confirm("Clear every locally saved CDZA journal entry in this browser?")) return;
  journalForm.reset();
  localStorage.removeItem(storageKey);
  journalStatus.textContent = "Journal cleared.";
});

restore();
