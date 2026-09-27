(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const state = { data: null, market: null, actor: null, range: 52 };
  const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const signed = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "always" });

  const formatDate = (value) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${value}T00:00:00Z`),
    );

  const percentile = (series, value) => {
    if (!series.length) return 50;
    return Math.round((series.filter((item) => item <= value).length / series.length) * 100);
  };

  const selectedMarket = () => state.data.markets.find((market) => market.symbol === state.market);
  const selectedRecords = () => selectedMarket().records.slice(0, state.range);

  const actorMetrics = () => {
    const records = selectedMarket().records;
    const current = records[0].actors[state.actor];
    const previous = records[1]?.actors[state.actor] || current;
    const netSeries = records.slice(0, 52).map((record) => record.actors[state.actor].net);
    return {
      current,
      weeklyNetChange: current.net - previous.net,
      percentile52: percentile(netSeries, current.net),
      posture: current.net >= 0 ? "Net long" : "Net short",
    };
  };

  const setSignedTone = (element, value) => {
    element.classList.toggle("is-positive", value > 0);
    element.classList.toggle("is-negative", value < 0);
  };

  const renderControls = () => {
    const marketSelect = $("#cot-market");
    const groups = [...new Set(state.data.markets.map((market) => market.group))];
    marketSelect.replaceChildren();
    groups.forEach((group) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;
      state.data.markets
        .filter((market) => market.group === group)
        .forEach((market) => {
          const option = document.createElement("option");
          option.value = market.symbol;
          option.textContent = `${market.symbol} — ${market.name}`;
          optgroup.append(option);
        });
      marketSelect.append(optgroup);
    });
    marketSelect.value = state.market;
    renderActors();
  };

  const renderActors = () => {
    const market = selectedMarket();
    const select = $("#cot-actor");
    select.replaceChildren();
    market.availableActors.forEach((actor) => {
      const option = document.createElement("option");
      option.value = actor;
      option.textContent = market.records[0].actors[actor].label;
      select.append(option);
    });
    if (!market.availableActors.includes(state.actor)) state.actor = market.defaultActor;
    select.value = state.actor;
  };

  const renderSummary = () => {
    const market = selectedMarket();
    const record = market.records[0];
    const metrics = actorMetrics();
    const actor = metrics.current;
    const totalDirectional = actor.long + actor.short;
    const longShare = totalDirectional ? (actor.long / totalDirectional) * 100 : 50;

    $("#cot-net").textContent = signed.format(actor.net);
    $("#cot-posture").textContent = `${metrics.posture} · ${actor.netPctOpenInterest.toFixed(1)}% of open interest`;
    setSignedTone($("#cot-net"), actor.net);

    $("#cot-weekly-change").textContent = signed.format(metrics.weeklyNetChange);
    setSignedTone($("#cot-weekly-change"), metrics.weeklyNetChange);
    $("#cot-percentile").textContent = `${metrics.percentile52}th`;
    $("#cot-open-interest").textContent = integer.format(record.openInterest);
    $("#cot-open-interest-change").textContent = `${signed.format(record.openInterestChange)} week over week`;
    setSignedTone($("#cot-open-interest-change"), record.openInterestChange);

    $("#cot-long").textContent = integer.format(actor.long);
    $("#cot-short").textContent = integer.format(actor.short);
    $("#cot-long-pct").textContent = `${actor.longPct.toFixed(1)}% of OI`;
    $("#cot-short-pct").textContent = `${actor.shortPct.toFixed(1)}% of OI`;
    $("#cot-donut-value").textContent = `${Math.round(longShare)}%`;
    $("#cot-donut").style.setProperty("--long-share", `${longShare}%`);
    $("#cot-balance-note").textContent = `${actor.label} are ${metrics.posture.toLowerCase()} ${integer.format(Math.abs(actor.net))} contracts in ${market.name}.`;
    $("#cot-chart-symbol").textContent = `${market.symbol} · ${actor.label}`;
    $("#cot-chart-date").textContent = `Report date ${formatDate(record.reportDate)}`;
    $("#cot-chart-title").textContent = `${market.name} ${actor.label} net positioning history`;
    $("#cot-chart-desc").textContent = `${state.range} weeks of weekly net positioning for ${actor.label} in ${market.name}.`;
    $("#cot-status").textContent = `${market.name} · ${actor.label} · ${state.range}-week view`;
  };

  const renderChart = () => {
    const records = selectedRecords().slice().reverse();
    const values = records.map((record) => record.actors[state.actor].net);
    const maxMagnitude = Math.max(...values.map(Math.abs), 1) * 1.12;
    const left = 50;
    const right = 870;
    const top = 40;
    const bottom = 320;
    const zeroY = top + ((maxMagnitude - 0) / (maxMagnitude * 2)) * (bottom - top);
    const x = (index) => left + (index / Math.max(records.length - 1, 1)) * (right - left);
    const y = (value) => top + ((maxMagnitude - value) / (maxMagnitude * 2)) * (bottom - top);
    const points = values.map((value, index) => [x(index), y(value)]);
    const line = points.map(([px, py], index) => `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
    const area = `${line}L${right} ${zeroY.toFixed(1)}L${left} ${zeroY.toFixed(1)}Z`;
    const last = points.at(-1);

    $("#cot-line").setAttribute("d", line);
    $("#cot-area").setAttribute("d", area);
    $("#cot-zero-line").setAttribute("d", `M${left} ${zeroY.toFixed(1)}H${right}`);
    $("#cot-last-point").setAttribute("cx", last[0].toFixed(1));
    $("#cot-last-point").setAttribute("cy", last[1].toFixed(1));

    const labels = $("#cot-chart-labels");
    labels.replaceChildren();
    const indexes = [...new Set([0, Math.floor((records.length - 1) / 2), records.length - 1])];
    indexes.forEach((index) => {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x(index).toFixed(1));
      text.setAttribute("y", "348");
      text.setAttribute("text-anchor", index === 0 ? "start" : index === records.length - 1 ? "end" : "middle");
      text.textContent = formatDate(records[index].reportDate).replace(/, \d{4}/, "");
      labels.append(text);
    });
  };

  const renderTable = () => {
    const body = $("#cot-table-body");
    body.replaceChildren();
    selectedRecords().forEach((record, index) => {
      const actor = record.actors[state.actor];
      const row = document.createElement("tr");
      const values = [
        formatDate(record.reportDate),
        integer.format(actor.long),
        integer.format(actor.short),
        signed.format(actor.longChange),
        signed.format(actor.shortChange),
        `${actor.longPct.toFixed(1)}%`,
        `${actor.shortPct.toFixed(1)}%`,
        signed.format(actor.net),
      ];
      values.forEach((value, cellIndex) => {
        const cell = document.createElement(cellIndex === 0 ? "th" : "td");
        if (cellIndex === 0) cell.scope = "row";
        cell.textContent = value;
        if ([3, 4, 7].includes(cellIndex)) setSignedTone(cell, Number(value.replace(/[^\d+-]/g, "")));
        if (index === 0 && cellIndex === 0) {
          const badge = document.createElement("span");
          badge.className = "cot-latest-badge";
          badge.textContent = "Latest";
          cell.append(badge);
        }
        row.append(cell);
      });
      body.append(row);
    });
  };

  const renderRankings = () => {
    const ranked = state.data.markets.slice().sort((a, b) => b.latest.percentile52 - a.latest.percentile52);
    const fill = (selector, markets) => {
      const list = $(selector);
      list.replaceChildren();
      markets.forEach((market) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        const value = document.createElement("strong");
        label.textContent = `${market.symbol} · ${market.name}`;
        value.textContent = `${market.latest.percentile52}th`;
        item.append(label, value);
        list.append(item);
      });
    };
    fill("#cot-long-ranking", ranked.slice(0, 5));
    fill("#cot-short-ranking", ranked.slice(-5).reverse());
  };

  const render = () => {
    renderSummary();
    renderChart();
    renderTable();
  };

  const downloadCurrentView = () => {
    const market = selectedMarket();
    const actorLabel = market.records[0].actors[state.actor].label;
    const headings = ["Report date", "Long", "Short", "Change long", "Change short", "% long", "% short", "Net position"];
    const rows = selectedRecords().map((record) => {
      const actor = record.actors[state.actor];
      return [record.reportDate, actor.long, actor.short, actor.longChange, actor.shortChange, actor.longPct, actor.shortPct, actor.net];
    });
    const csv = [headings, ...rows].map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tgi-cot-${market.symbol.toLowerCase()}-${actorLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const initialize = async () => {
    try {
      const response = await fetch("data/cot.json");
      if (!response.ok) throw new Error("Positioning data is unavailable.");
      state.data = await response.json();
      state.market = state.data.markets[0].symbol;
      state.actor = state.data.markets[0].defaultActor;
      $("#hero-report-date").textContent = formatDate(state.data.latestReportDate);
      $("#hero-market-count").textContent = String(state.data.markets.length).padStart(2, "0");
      $("#cot-load-state").textContent = `Through ${formatDate(state.data.latestReportDate)}`;
      renderControls();
      renderRankings();
      render();
    } catch (error) {
      $("#cot-load-state").textContent = "Data temporarily unavailable";
      $("#cot-status").textContent = "The CFTC dataset could not be loaded. Please return shortly.";
      $("#cot-dashboard").classList.add("has-data-error");
    }
  };

  $("#cot-market").addEventListener("change", (event) => {
    state.market = event.target.value;
    state.actor = selectedMarket().defaultActor;
    renderActors();
    render();
  });

  $("#cot-actor").addEventListener("change", (event) => {
    state.actor = event.target.value;
    render();
  });

  $$('[data-cot-range]').forEach((button) => {
    button.addEventListener("click", () => {
      state.range = Number(button.dataset.cotRange);
      $$('[data-cot-range]').forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  $("#cot-download").addEventListener("click", downloadCurrentView);
  initialize();
})();
