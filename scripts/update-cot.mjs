import fs from "node:fs/promises";

const API = "https://publicreporting.cftc.gov/resource";
const HISTORY_WEEKS = 60;

const markets = [
  { symbol: "DXY", name: "U.S. Dollar Index", group: "Currencies", dataset: "tff", code: "098662", defaultActor: "leveragedFunds" },
  { symbol: "EUR", name: "Euro FX", group: "Currencies", dataset: "tff", code: "099741", defaultActor: "leveragedFunds" },
  { symbol: "GBP", name: "British Pound", group: "Currencies", dataset: "tff", code: "096742", defaultActor: "leveragedFunds" },
  { symbol: "JPY", name: "Japanese Yen", group: "Currencies", dataset: "tff", code: "097741", defaultActor: "leveragedFunds" },
  { symbol: "CAD", name: "Canadian Dollar", group: "Currencies", dataset: "tff", code: "090741", defaultActor: "leveragedFunds" },
  { symbol: "AUD", name: "Australian Dollar", group: "Currencies", dataset: "tff", code: "232741", defaultActor: "leveragedFunds" },
  { symbol: "NZD", name: "New Zealand Dollar", group: "Currencies", dataset: "tff", code: "112741", defaultActor: "leveragedFunds" },
  { symbol: "CHF", name: "Swiss Franc", group: "Currencies", dataset: "tff", code: "092741", defaultActor: "leveragedFunds" },
  { symbol: "GOLD", name: "Gold", group: "Commodities", dataset: "dcot", code: "088691", defaultActor: "managedMoney" },
  { symbol: "SILVER", name: "Silver", group: "Commodities", dataset: "dcot", code: "084691", defaultActor: "managedMoney" },
  { symbol: "WTI", name: "WTI Crude Oil", group: "Commodities", dataset: "dcot", code: "067411", defaultActor: "managedMoney" },
  { symbol: "BTC", name: "Bitcoin", group: "Digital Assets", dataset: "tff", code: "133741", defaultActor: "leveragedFunds" },
  { symbol: "NAS100", name: "Nasdaq-100", group: "Equity Indexes", dataset: "tff", code: "209742", defaultActor: "leveragedFunds" },
  { symbol: "SP500", name: "S&P 500", group: "Equity Indexes", dataset: "tff", code: "13874A", defaultActor: "leveragedFunds" },
  { symbol: "US10Y", name: "U.S. 10-Year Note", group: "Rates", dataset: "tff", code: "043602", defaultActor: "leveragedFunds" },
];

const actorFields = {
  tff: {
    leveragedFunds: {
      label: "Leveraged Funds",
      long: "lev_money_positions_long",
      short: "lev_money_positions_short",
      spread: "lev_money_positions_spread",
      longChange: "change_in_lev_money_long",
      shortChange: "change_in_lev_money_short",
      longPct: "pct_of_oi_lev_money_long",
      shortPct: "pct_of_oi_lev_money_short",
    },
    assetManagers: {
      label: "Asset Managers",
      long: "asset_mgr_positions_long",
      short: "asset_mgr_positions_short",
      spread: "asset_mgr_positions_spread",
      longChange: "change_in_asset_mgr_long",
      shortChange: "change_in_asset_mgr_short",
      longPct: "pct_of_oi_asset_mgr_long",
      shortPct: "pct_of_oi_asset_mgr_short",
    },
    dealers: {
      label: "Dealers",
      long: "dealer_positions_long_all",
      short: "dealer_positions_short_all",
      spread: "dealer_positions_spread_all",
      longChange: "change_in_dealer_long_all",
      shortChange: "change_in_dealer_short_all",
      longPct: "pct_of_oi_dealer_long_all",
      shortPct: "pct_of_oi_dealer_short_all",
    },
  },
  dcot: {
    managedMoney: {
      label: "Managed Money",
      long: "m_money_positions_long_all",
      short: "m_money_positions_short_all",
      spread: "m_money_positions_spread",
      longChange: "change_in_m_money_long_all",
      shortChange: "change_in_m_money_short_all",
      longPct: "pct_of_oi_m_money_long_all",
      shortPct: "pct_of_oi_m_money_short_all",
    },
    producers: {
      label: "Producers / Merchants",
      long: "prod_merc_positions_long",
      short: "prod_merc_positions_short",
      longChange: "change_in_prod_merc_long",
      shortChange: "change_in_prod_merc_short",
      longPct: "pct_of_oi_prod_merc_long",
      shortPct: "pct_of_oi_prod_merc_short",
    },
    swapDealers: {
      label: "Swap Dealers",
      long: "swap_positions_long_all",
      short: "swap__positions_short_all",
      spread: "swap__positions_spread_all",
      longChange: "change_in_swap_long_all",
      shortChange: "change_in_swap_short_all",
      longPct: "pct_of_oi_swap_long_all",
      shortPct: "pct_of_oi_swap_short_all",
    },
  },
};

const number = (value) => Number(value || 0);
const round = (value, places = 1) => Number(value.toFixed(places));

const queryDataset = async (dataset, codes) => {
  const resource = dataset === "tff" ? "gpe5-46if" : "72hh-3qpy";
  const quotedCodes = codes.map((code) => `'${code}'`).join(",");
  const params = new URLSearchParams({
    "$where": `cftc_contract_market_code in (${quotedCodes})`,
    "$order": "report_date_as_yyyy_mm_dd DESC",
    "$limit": String(codes.length * HISTORY_WEEKS + 100),
  });
  const response = await fetch(`${API}/${resource}.json?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "TraderGrowth-COT-Dashboard/1.0" },
  });
  if (!response.ok) throw new Error(`CFTC ${dataset} request failed: ${response.status} ${response.statusText}`);
  return response.json();
};

const normalizeActor = (row, fields) => {
  const long = number(row[fields.long]);
  const short = number(row[fields.short]);
  const openInterest = number(row.open_interest_all);
  return {
    label: fields.label,
    long,
    short,
    spread: number(row[fields.spread]),
    longChange: number(row[fields.longChange]),
    shortChange: number(row[fields.shortChange]),
    longPct: round(number(row[fields.longPct])),
    shortPct: round(number(row[fields.shortPct])),
    net: long - short,
    netPctOpenInterest: openInterest ? round(((long - short) / openInterest) * 100) : 0,
  };
};

const percentile = (series, value) => {
  if (!series.length) return 50;
  const belowOrEqual = series.filter((item) => item <= value).length;
  return Math.round((belowOrEqual / series.length) * 100);
};

const raw = {
  tff: await queryDataset("tff", markets.filter((market) => market.dataset === "tff").map((market) => market.code)),
  dcot: await queryDataset("dcot", markets.filter((market) => market.dataset === "dcot").map((market) => market.code)),
};

const outputMarkets = markets.map((market) => {
  const records = raw[market.dataset]
    .filter((row) => row.cftc_contract_market_code === market.code)
    .slice(0, HISTORY_WEEKS)
    .map((row) => ({
      reportDate: row.report_date_as_yyyy_mm_dd.slice(0, 10),
      openInterest: number(row.open_interest_all),
      openInterestChange: number(row.change_in_open_interest_all),
      actors: Object.fromEntries(
        Object.entries(actorFields[market.dataset]).map(([key, fields]) => [key, normalizeActor(row, fields)]),
      ),
    }));

  if (!records.length) throw new Error(`No CFTC records returned for ${market.symbol} (${market.code}).`);

  const defaultSeries = records.map((record) => record.actors[market.defaultActor].net);
  const latest = records[0].actors[market.defaultActor];
  const previous = records[1]?.actors[market.defaultActor] || latest;

  return {
    ...market,
    availableActors: Object.keys(actorFields[market.dataset]),
    latest: {
      reportDate: records[0].reportDate,
      net: latest.net,
      weeklyNetChange: latest.net - previous.net,
      fourWeekNetChange: latest.net - (records[4]?.actors[market.defaultActor].net ?? latest.net),
      thirteenWeekNetChange: latest.net - (records[13]?.actors[market.defaultActor].net ?? latest.net),
      percentile52: percentile(defaultSeries.slice(0, 52), latest.net),
      posture: latest.net >= 0 ? "Net long" : "Net short",
    },
    records,
  };
});

const latestReportDate = outputMarkets.map((market) => market.latest.reportDate).sort().at(-1);
const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  latestReportDate,
  source: {
    label: "U.S. Commodity Futures Trading Commission",
    url: "https://publicreporting.cftc.gov/stories/s/Commitments-of-Traders/r4w3-av2u/",
    note: "Weekly COT reports generally reflect Tuesday positions and are released Friday.",
  },
  markets: outputMarkets,
};

await fs.mkdir("cot/data", { recursive: true });
await fs.writeFile("cot/data/cot.json", `${JSON.stringify(payload)}\n`);
console.log(`Wrote ${outputMarkets.length} markets through ${latestReportDate} to cot/data/cot.json.`);
