(() => {
  "use strict";

  const form = document.querySelector("#review-form");
  const weekEnding = document.querySelector("#week-ending");
  const status = document.querySelector("#save-status");
  const storageKey = "tgi-weekly-capital-review-v1";
  let saveTimer;

  if (!form || !weekEnding) return;

  const todayISO = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  };

  const serialize = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.week_ending = weekEnding.value;
    data.updated_at = new Date().toISOString();
    return data;
  };

  const setStatus = (message) => {
    status.textContent = message;
  };

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(serialize()));
      setStatus(`Saved locally at ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}.`);
    } catch {
      setStatus("This browser blocked local saving. Export the review before leaving.");
    }
  };

  const scheduleSave = () => {
    setStatus("Saving…");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 350);
  };

  const restore = () => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey));
    } catch {
      saved = null;
    }

    if (!saved) {
      weekEnding.value = todayISO();
      return;
    }

    Object.entries(saved).forEach(([name, value]) => {
      if (["updated_at", "week_ending"].includes(name)) return;
      const fields = [...form.elements].filter((field) => field.name === name);
      fields.forEach((field) => {
        if (field.type === "radio") field.checked = field.value === value;
        else field.value = value;
      });
    });

    weekEnding.value = saved.week_ending || todayISO();
    if (saved.updated_at) {
      const restoredAt = new Date(saved.updated_at);
      setStatus(`Restored review saved ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(restoredAt)}.`);
    }
  };

  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);
  weekEnding.addEventListener("input", scheduleSave);

  document.querySelector("#print-review")?.addEventListener("click", () => window.print());

  document.querySelector("#export-review")?.addEventListener("click", () => {
    const data = serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TGI-Weekly-Capital-Review-${data.week_ending || "undated"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Review exported.");
  });

  document.querySelector("#reset-review")?.addEventListener("click", () => {
    const confirmed = window.confirm("Clear every field and start a new weekly review?");
    if (!confirmed) return;
    form.reset();
    weekEnding.value = todayISO();
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // The form can still reset when local storage is unavailable.
    }
    setStatus("Review cleared. New changes will save automatically.");
  });

  restore();
})();
