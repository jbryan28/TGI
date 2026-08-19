const certificationDomains = [
  {
    letter: "C",
    kicker: "Sequence 01",
    title: "Compression",
    summary: "Institutional inventory is accumulated or distributed while volatility contracts and available liquidity is absorbed.",
    outcomes: ["Inventory is accumulated or distributed.", "Volatility contracts and liquidity is absorbed.", "Institutions prepare positions."],
    chartLabel: "COMPRESSION",
    chartStatus: "Inventory is prepared",
    path: "M40 230L85 218L130 232L175 214L220 225L265 207L310 224L355 210L400 218L445 205L490 220L535 212L580 217L625 208L680 214",
    point: [680, 214],
  },
  {
    letter: "D",
    kicker: "Sequence 02",
    title: "Displacement",
    summary: "Price leaves the base aggressively, making institutional participation visible as inventory is released into expansion.",
    outcomes: ["Price leaves the base with force.", "Institutional participation becomes visible.", "Released inventory creates expansion."],
    chartLabel: "DISPLACEMENT",
    chartStatus: "Participation becomes visible",
    path: "M40 235L85 226L130 232L175 222L220 229L265 218L310 226L355 215L400 222L445 208L490 216L535 172L580 125L625 82L680 56",
    point: [680, 56],
  },
  {
    letter: "Z",
    kicker: "Sequence 03",
    title: "Zone",
    summary: "The origin of displacement becomes the institutional decision point where remaining inventory may create future opportunity.",
    outcomes: ["The origin of displacement is identified.", "Remaining inventory defines the decision point.", "Future opportunity is evaluated at location."],
    chartLabel: "DAILY ZONE",
    chartStatus: "The origin becomes the decision point",
    path: "M40 250L85 228L130 238L175 210L220 220L265 190L310 202L355 165L400 180L445 142L490 156L535 114L580 128L625 92L680 104",
    point: [355, 165],
  },
  {
    letter: "A",
    kicker: "Sequence 04",
    title: "Authorization",
    summary: "Price returns to the zone, liquidity is harvested, compression forms, and a new expansion release authorizes consideration of capital deployment.",
    outcomes: ["Price returns to qualified inventory.", "Liquidity is harvested and compression forms.", "Capital is considered only after the Authorization Event™."],
    chartLabel: "AUTHORIZATION",
    chartStatus: "Evidence before capital",
    path: "M40 245L85 220L130 232L175 190L220 208L265 158L310 178L355 126L400 146L445 112L490 136L535 178L580 164L625 104L680 68",
    point: [680, 68],
  },
];

const $ = (selector) => document.querySelector(selector);
const domainTabs = [...document.querySelectorAll("[data-certification-domain]")];
let activeDomain = 0;

const renderDomain = (index, moveFocus = false) => {
  activeDomain = (index + certificationDomains.length) % certificationDomains.length;
  const domain = certificationDomains[activeDomain];

  domainTabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === activeDomain;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  $("#domain-kicker").textContent = domain.kicker;
  $("#domain-title").textContent = domain.title;
  $("#domain-summary").textContent = domain.summary;
  $("#domain-outcomes").innerHTML = domain.outcomes.map((outcome) => `<li>${outcome}</li>`).join("");
  $("#domain-chart-label").textContent = domain.chartLabel;
  $("#domain-chart-status").textContent = domain.chartStatus;
  $("#domain-chart-line").setAttribute("d", domain.path);
  $("#domain-chart-point").setAttribute("cx", domain.point[0]);
  $("#domain-chart-point").setAttribute("cy", domain.point[1]);
  $("#domain-current").textContent = domain.letter;

  document.querySelectorAll(".domain-chart-caption span").forEach((label, labelIndex) => label.classList.toggle("is-active", labelIndex === activeDomain));
  if (moveFocus) domainTabs[activeDomain].focus();
};

domainTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => renderDomain(index));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return renderDomain(0, true);
    if (event.key === "End") return renderDomain(certificationDomains.length - 1, true);
    renderDomain(index + (event.key === "ArrowRight" ? 1 : -1), true);
  });
});

$("#domain-prev").addEventListener("click", () => renderDomain(activeDomain - 1));
$("#domain-next").addEventListener("click", () => renderDomain(activeDomain + 1));
