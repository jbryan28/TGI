(() => {
  const search = document.querySelector("#glossary-search");
  const clear = document.querySelector("#glossary-clear");
  const reset = document.querySelector("#glossary-reset");
  const count = document.querySelector("#glossary-result-count");
  const empty = document.querySelector("#glossary-empty");
  const cards = [...document.querySelectorAll(".glossary-term")];
  const filters = [...document.querySelectorAll("[data-glossary-filter]")];
  let activeCategory = "all";

  const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const render = () => {
    const query = normalize(search.value);
    let visible = 0;

    cards.forEach((card) => {
      const matchesCategory = activeCategory === "all" || card.dataset.category === activeCategory;
      const searchable = normalize(`${card.textContent} ${card.dataset.search || ""}`);
      const matchesSearch = !query || searchable.includes(query);
      const show = matchesCategory && matchesSearch;
      card.hidden = !show;
      if (show) visible += 1;
    });

    const label = visible === cards.length ? `Showing all ${cards.length} terms` : `Showing ${visible} of ${cards.length} terms`;
    count.textContent = label;
    empty.hidden = visible !== 0;
    clear.disabled = !search.value;
  };

  const showAll = () => {
    activeCategory = "all";
    search.value = "";
    filters.forEach((button) => {
      const active = button.dataset.glossaryFilter === "all";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    render();
    search.focus();
  };

  search.addEventListener("input", render);
  clear.addEventListener("click", () => {
    search.value = "";
    render();
    search.focus();
  });
  reset.addEventListener("click", showAll);

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.glossaryFilter;
      filters.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  render();
})();
