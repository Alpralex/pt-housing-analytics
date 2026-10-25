// Generates the PBIR pages, visuals and "PT Housing" theme for powerbi/PTHousing.Report.
// Run from the repo root: node scripts/build_powerbi_report.mjs
// The script owns every page listed below and the PTHousing theme; it rewrites them on each run.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REPORT = path.resolve("powerbi/PTHousing.Report");
const DEF = path.join(REPORT, "definition");
const VISUAL_SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json";
const PAGE_SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json";

// Same visual style as the AtlanticaFPA report in finance-fpa-analytics.
const C = {
  page: "#F7F8F9", card: "#FFFFFF", border: "#DCE0E5", text: "#1B2430", muted: "#5D6876", grid: "#ECEFF2",
  blue: "#2A78D6", orange: "#EB6834", green: "#1F7A35", amber: "#B25B00", grey: "#5D6876", red: "#B42318",
  greenSoft: "#E3F1E6", redSoft: "#FBE4E1", subtotal: "#EEF1F4",
};

// ---------- expression helpers ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const str = (s) => lit(`'${s.replace(/'/g, "''")}'`);
const num = (n) => lit(`${n}D`);
const int = (n) => lit(`${n}L`);
const bool = (b) => lit(b ? "true" : "false");
const fill = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const col = (entity, prop) => ({ Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } });
const proj = (field) => {
  const f = field.Column || field.Measure;
  const entity = f.Expression.SourceRef.Entity;
  return { field, queryRef: `${entity}.${f.Property}`, nativeQueryRef: f.Property };
};
const named = (field, displayName) => ({ ...proj(field), displayName });
const ref = (field) => proj(field).queryRef;
const id = (...parts) => crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 20);
const filterId = (...parts) => "Filter" + crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 24);

// Basic visual-level filter: column IN (literals).
function inFilter(page, key, field, literals) {
  const c = field.Column;
  const entity = c.Expression.SourceRef.Entity;
  return {
    name: filterId(page, key),
    field,
    type: "Categorical",
    filter: {
      Version: 2,
      From: [{ Name: "f", Entity: entity, Type: 0 }],
      Where: [{
        Condition: {
          In: {
            Expressions: [{ Column: { Expression: { SourceRef: { Source: "f" } }, Property: c.Property } }],
            Values: literals.map((v) => [{ Literal: { Value: v } }]),
          },
        },
      }],
    },
    howCreated: "User",
  };
}

// Column NOT IN (literals).
function notInFilter(page, key, field, literals) {
  const f = inFilter(page, key, field, literals);
  f.filter.Where[0].Condition = { Not: { Expression: f.filter.Where[0].Condition } };
  return f;
}


// ---------- fields ----------
// Home table of every measure used on the pages (PBIR references a measure through its table).
const MEASURE_TABLE = {
  "House Price Index by Type": "fct_house_prices",
  "HICP Index": "fct_consumer_prices",
  "Overburden Rate by Group %": "fct_living_conditions",
  "Permitted Dwellings": "fct_building_permits",
  "Permitted Dwellings (Latest)": "fct_building_permits",
  "Permits vs 2005 %": "fct_building_permits",
  "Permits Multiple of Low": "fct_building_permits",
  "Price-to-Income Index (Latest)": "mart_affordability",
  "Price-to-Income Year": "mart_affordability",
  "Price Growth Since 2015 % (Income Year)": "mart_affordability",
  "Income Growth Since 2015 %": "mart_affordability",
  "Overburden Rate % (Latest)": "mart_affordability",
  "Low-Income Overburden Rate %": "mart_affordability",
  "Portugal vs EU Price-to-Income Gap": "mart_affordability",
  "Portugal vs EU Overburden Gap (pp)": "mart_affordability",
};
const meas = (prop) => ({ Measure: { Expression: { SourceRef: { Entity: MEASURE_TABLE[prop] || "mart_house_prices_real" } }, Property: prop } });

const F = {
  country: col("dim_country", "country_name"),
  year: col("dim_year", "year"),
  quarter: col("dim_quarter", "quarter_start"),
  dwelling: col("fct_house_prices", "dwelling_type"),
  incomeGroup: col("fct_living_conditions", "income_group_name"),
};

// Portugal in the accent colour, peers in greys, the EU-27 in dark grey (as on the web page).
const COUNTRIES = ["Portugal", "Spain", "Ireland", "Italy", "France", "Germany", "Netherlands", "EU-27"];
const COUNTRY_COLOR = {
  Portugal: C.blue, Spain: "#9AA4AF", Ireland: "#AEB6BF", Italy: "#C2C8CF", France: "#B6BDC5",
  Germany: "#A3ACB6", Netherlands: "#8E99A4", "EU-27": "#4A5562",
};
const countryScope = (name) => ({
  data: [{ scopeId: { Comparison: { ComparisonKind: 0, Left: F.country, Right: { Literal: { Value: `'${name}'` } } } } }],
});
const portugalOnly = (page, key) => inFilter(page, key, F.country, ["'Portugal'"]);

// Country (multi-select dropdown) and year range (2015 to 2026), synced across pages.
function slicers(page) {
  const country = container(page, "slicer_country", { x: 752, y: 16, w: 248, h: 80 }, {
    visualType: "slicer",
    syncGroup: { groupName: "CountrySync", fieldChanges: true, filterChanges: true },
    query: { queryState: { Values: { projections: [proj(F.country)] } } },
    objects: {
      data: [{ properties: { mode: str("Dropdown") } }],
      header: [{ properties: { show: bool(true), text: str("Country") } }],
    },
    visualContainerObjects: {
      general: [{ properties: { altText: str("Country filter dropdown. Applies to every page.") } }],
      padding: [vcoPadding(8)],
    },
  });
  const yearCol = (src) => ({ Column: { Expression: { SourceRef: { Source: src } }, Property: "year" } });
  const year = container(page, "slicer_year", { x: 1016, y: 16, w: 248, h: 80 }, {
    visualType: "slicer",
    syncGroup: { groupName: "YearSync", fieldChanges: true, filterChanges: true },
    query: { queryState: { Values: { projections: [proj(F.year)] } } },
    objects: {
      data: [{ properties: { mode: str("Between") } }],
      header: [{ properties: { show: bool(true), text: str("Years") } }],
      general: [{
        properties: {
          filter: {
            filter: {
              Version: 2,
              From: [{ Name: "y", Entity: "dim_year", Type: 0 }],
              Where: [{
                Condition: {
                  And: {
                    Left: { Comparison: { ComparisonKind: 2, Left: yearCol("y"), Right: { Literal: { Value: "2015L" } } } },
                    Right: { Comparison: { ComparisonKind: 4, Left: yearCol("y"), Right: { Literal: { Value: "2026L" } } } },
                  },
                },
              }],
            },
          },
        },
      }],
    },
    visualContainerObjects: {
      general: [{ properties: { altText: str("Year range slider, set to 2015 to 2026. Applies to every page.") } }],
      padding: [vcoPadding(8)],
    },
  });
  return [country, year];
}

const ptCard = (page, key, pos, measure, label, opts = {}) =>
  container(page, key, pos, card(page, key, pos, meas(measure), label, opts).visual,
    { filterConfig: { filters: [portugalOnly(page, key + "_pt")] } });

function countryLines(page, key, pos, measure, title, alt, subtitle) {
  return container(page, key, pos, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [named(F.quarter, "Quarter")] },
        Y: { projections: [named(meas(measure), measure)] },
        Series: { projections: [named(F.country, "Country")] },
      },
    },
    objects: {
      dataPoint: COUNTRIES.map((c) => ({ properties: { fill: fill(COUNTRY_COLOR[c]) }, selector: countryScope(c) })),
      lineStyles: [
        { properties: { strokeWidth: num(1.5), lineChartType: str("linear"), areaShow: bool(false) } },
        { properties: { strokeWidth: num(3.5) }, selector: countryScope("Portugal") },
      ],
      legend: legendTop,
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { ...axisOn, gridlineShow: bool(true), gridlineColor: fill(C.grid) } }],
    },
    visualContainerObjects: chartVcos(title, alt, subtitle),
  });
}

function countryBars(page, key, pos, measures, title, alt, opts = {}) {
  const single = measures.length === 1;
  return container(page, key, pos, {
    visualType: opts.type || "clusteredBarChart",
    query: {
      queryState: {
        Category: { projections: [named(F.country, "Country")] },
        Y: { projections: measures.map(([m, n]) => named(meas(m), n)) },
      },
      sortDefinition: { sort: [{ field: meas(measures[0][0]), direction: "Descending" }], isDefaultSort: true },
    },
    objects: {
      dataPoint: single
        ? COUNTRIES.map((c) => ({ properties: { fill: fill(COUNTRY_COLOR[c]) }, selector: countryScope(c) }))
        : measures.map(([m, , c]) => ({ properties: { fill: fill(c) }, selector: { metadata: ref(meas(m)) } })),
      labels: [{ properties: { show: bool(true), fontSize: num(10), color: fill(C.text) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false), showAxisTitle: bool(false) } }],
      legend: single ? [{ properties: { show: bool(false) } }] : legendTop,
      ...(opts.refLine !== undefined ? {
        xAxisReferenceLine: [{
          properties: {
            show: bool(true), displayName: str(opts.refLineName || ""), value: num(opts.refLine),
            lineColor: fill(C.muted), style: str("dashed"), width: num(1.5),
            dataLabelShow: bool(true), dataLabelText: str("Name"), dataLabelColor: fill(C.muted),
          },
          selector: { id: "1" },
        }],
      } : {}),
    },
    visualContainerObjects: chartVcos(title, alt, opts.subtitle),
  });
}

// ---------- pages ----------
const PAGE_IDS = { overview: "b1c2d3e4f5a6b7c8d901", prices: "b1c2d3e4f5a6b7c8d902", supply: "b1c2d3e4f5a6b7c8d903" };

function overviewPage() {
  const p = PAGE_IDS.overview;
  z = 0;
  const quarter = card(p, "card_last_quarter", { x: 544, y: 16, w: 192, h: 80 }, meas("Last Price Quarter"), "Prices to", {
    alt: "Last quarter with house price data.",
  });
  const cards = [
    ptCard(p, "card_yoy", { x: 16, y: 112, w: 300, h: 128 }, "House Price YoY %", "Portugal house prices, year on year", {
      reference: { field: meas("Real House Price YoY %"), title: "after inflation" },
      alt: "Portugal house price change on the same quarter a year earlier, nominal and after inflation.",
    }),
    ptCard(p, "card_real_since_2015", { x: 332, y: 112, w: 300, h: 128 }, "Real House Price Change Since 2015 %", "Real house prices since 2015", {
      alt: "Change in Portugal's inflation-adjusted house prices since 2015.",
    }),
    ptCard(p, "card_pti", { x: 648, y: 112, w: 300, h: 128 }, "Price-to-Income Index (Latest)", "Price-to-income index, latest income year (2015 = 100)", {
      alt: "Portugal's house price to income index in the latest year with income data.",
    }),
    ptCard(p, "card_overburden", { x: 964, y: 112, w: 300, h: 128 }, "Overburden Rate % (Latest)", "Housing cost overburden", {
      reference: { field: meas("Portugal vs EU Overburden Gap (pp)"), title: "pp vs EU-27" },
      alt: "Share of people in Portugal spending over 40% of disposable income on housing, and the gap to the EU-27 in percentage points.",
    }),
  ];
  const lines = countryLines(p, "line_real_hpi", { x: 16, y: 256, w: 816, h: 448 }, "Real House Price Index",
    "Real house prices by country (2015 = 100)",
    "Line chart of inflation-adjusted house price indices by quarter for Portugal (thick blue line), five other EU countries and the EU-27 (greys).",
    "Deflated by consumer prices. Portugal in blue");
  const bars = countryBars(p, "bar_hpi_latest", { x: 848, y: 256, w: 416, h: 448 }, [["House Price Index (Latest)", "House price index"]],
    "House price index, latest quarter (2015 = 100)",
    "Bar chart of the latest nominal house price index by country, highest first; Portugal leads at about 301.",
    { subtitle: "Nominal prices" });
  return {
    name: p, displayName: "Overview",
    visuals: [...header(p, "How far has housing in Portugal outrun incomes?", "Eurostat house price, rent and income data, 2015 = 100. Income data run to 2024"),
      quarter, ...slicers(p), ...cards, lines, bars],
  };
}

function pricesPage() {
  const p = PAGE_IDS.prices;
  z = 0;
  const ptLines = lineChart(p, "line_price_rent_cpi", { x: 16, y: 112, w: 616, h: 296 }, F.quarter, [
    { field: meas("House Price Index"), name: "House prices", color: C.blue },
    { field: meas("Rent Index"), name: "Rents", color: C.orange },
    { field: meas("Consumer Price Index"), name: "Consumer prices", color: C.grey, dashed: true },
  ], "Portugal: house prices against rents and consumer prices",
  "Line chart of Portugal's house price, rent and consumer price indices by quarter, 2015 = 100.",
  { subtitle: "2015 = 100", filters: [portugalOnly(p, "pt_lines")], units: null });
  const pti = countryBars(p, "bar_pti", { x: 648, y: 112, w: 616, h: 296 }, [["Price-to-Income Index (Latest)", "Price-to-income"]],
    "Price-to-income index by country (2015 = 100)",
    "Bar chart of the house price to income index by country in the latest year, highest first, with a dashed line at 100.",
    { subtitle: "Above 100: prices grew faster than incomes since 2015", refLine: 100, refLineName: "2015" });
  const byType = container(p, "line_new_existing", { x: 16, y: 424, w: 816, h: 280 }, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [named(F.quarter, "Quarter")] },
        Y: { projections: [named(meas("House Price Index by Type"), "House price index")] },
        Series: { projections: [named(F.dwelling, "Dwelling type")] },
      },
    },
    objects: {
      lineStyles: [{ properties: { strokeWidth: num(2), lineChartType: str("linear"), areaShow: bool(false) } }],
      legend: legendTop,
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { ...axisOn, gridlineShow: bool(true), gridlineColor: fill(C.grid) } }],
    },
    visualContainerObjects: chartVcos("Portugal: new against existing dwellings",
      "Line chart of Portugal's house price index for new dwellings and for existing dwellings by quarter.", "2015 = 100"),
  }, { filterConfig: { filters: [portugalOnly(p, "pt_type"), inFilter(p, "new_existing", F.dwelling, ["'New dwellings'", "'Existing dwellings'"])] } });
  const priceGrowth = ptCard(p, "card_price_growth", { x: 848, y: 424, w: 416, h: 132 }, "Price Growth Since 2015 % (Income Year)", "Portugal house prices, 2015 to the latest income year", {
    alt: "Growth of Portugal's annual house price index from 2015 to the latest income year.",
  });
  const incomeGrowth = ptCard(p, "card_income_growth", { x: 848, y: 572, w: 416, h: 132 }, "Income Growth Since 2015 %", "Portugal median income, 2015 to the latest income year", {
    alt: "Growth of Portugal's median disposable income from 2015 to the latest income year.",
  });
  return {
    name: p, displayName: "Prices, rents and incomes",
    visuals: [...header(p, "Prices have outrun rents and incomes", "House prices against rents, consumer prices and median income"),
      ...slicers(p), ptLines, pti, byType, priceGrowth, incomeGrowth],
  };
}

function supplyPage() {
  const p = PAGE_IDS.supply;
  z = 0;
  const permitCards = [
    ptCard(p, "card_permits", { x: 16, y: 112, w: 194, h: 96 }, "Permitted Dwellings (Latest)", "Dwellings permitted, latest year", {
      units: "1", alt: "Dwellings permitted in Portugal in the latest year.",
    }),
    ptCard(p, "card_permits_2005", { x: 227, y: 112, w: 194, h: 96 }, "Permits vs 2005 %", "Against 2005", {
      alt: "Dwellings permitted in Portugal in the latest year against 2005.",
    }),
    ptCard(p, "card_permits_low", { x: 438, y: 112, w: 194, h: 96 }, "Permits Multiple of Low", "Times the lowest year", {
      alt: "Dwellings permitted in Portugal in the latest year as a multiple of the lowest year in the series.",
    }),
  ];
  const permits = container(p, "column_permits", { x: 16, y: 328, w: 616, h: 184 }, {
    visualType: "columnChart",
    query: {
      queryState: {
        Category: { projections: [named(F.year, "Year")] },
        Y: { projections: [named(meas("Permitted Dwellings"), "Dwellings permitted")] },
      },
      sortDefinition: { sort: [{ field: F.year, direction: "Ascending" }], isDefaultSort: true },
    },
    objects: {
      dataPoint: [{ properties: { fill: fill(C.blue) } }],
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { ...axisOn, gridlineShow: bool(true), gridlineColor: fill(C.grid), labelDisplayUnits: num(1000) } }],
      legend: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: chartVcos("Portugal: dwellings permitted per year",
      "Column chart of the number of dwellings permitted in Portugal each year.", "Thousands of dwellings"),
  }, { filterConfig: { filters: [portugalOnly(p, "pt_permits")] } });
  const burden = container(p, "line_overburden_group", { x: 16, y: 528, w: 616, h: 176 }, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [named(F.year, "Year")] },
        Y: { projections: [named(meas("Overburden Rate by Group %"), "Overburden rate")] },
        Series: { projections: [named(F.incomeGroup, "Income group")] },
      },
    },
    objects: {
      dataPoint: [["All people", C.blue], ["Below 60% of median income", C.orange], ["Above 60% of median income", "#AEB6BF"]].map(([g, c]) => ({
        properties: { fill: fill(c) },
        selector: { data: [{ scopeId: { Comparison: { ComparisonKind: 0, Left: F.incomeGroup, Right: { Literal: { Value: `'${g}'` } } } } }] },
      })),
      lineStyles: [{ properties: { strokeWidth: num(2), lineChartType: str("linear"), areaShow: bool(false) } }],
      legend: legendTop,
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { ...axisOn, gridlineShow: bool(true), gridlineColor: fill(C.grid) } }],
    },
    visualContainerObjects: chartVcos("Portugal: housing cost overburden by income group",
      "Line chart of the share of people in Portugal spending over 40% of disposable income on housing, by income group and year.",
      "Share spending over 40% of disposable income on housing"),
  }, { filterConfig: { filters: [portugalOnly(p, "pt_burden")] } });
  const burdenBars = countryBars(p, "bar_overburden_country", { x: 648, y: 112, w: 616, h: 336 }, [
    ["Overburden Rate % (Latest)", "All people", C.blue],
    ["Low-Income Overburden Rate %", "Below 60% of median income", C.orange],
  ], "Housing cost overburden by country, latest survey",
  "Clustered bar chart of the housing cost overburden rate for all people and for people below 60% of median income, by country.",
  { subtitle: "Share spending over 40% of disposable income on housing" });
  const gapCard = (key, x, measure, label, alt) => card(p, key, { x, y: 224, w: 142, h: 88 }, meas(measure), label, { alt });
  const gaps = [
    gapCard("card_gap_hpi", 16, "Portugal vs EU House Price Gap", "Prices vs EU", "Portugal minus EU-27 house price index, index points."),
    gapCard("card_gap_real", 174, "Portugal vs EU Real House Price Gap", "Real vs EU", "Portugal minus EU-27 real house price index, index points."),
    gapCard("card_gap_pti", 332, "Portugal vs EU Price-to-Income Gap", "P/I vs EU", "Portugal minus EU-27 price-to-income index, index points."),
    gapCard("card_gap_overburden", 490, "Portugal vs EU Overburden Gap (pp)", "Burden pp", "Portugal minus EU-27 overburden rate, percentage points."),
  ];
  const table = container(p, "table_countries", { x: 648, y: 464, w: 616, h: 240 }, {
    visualType: "tableEx",
    query: {
      queryState: {
        Values: {
          projections: [
            named(F.country, "Country"),
            named(meas("House Price Index (Latest)"), "House prices"),
            named(meas("Real House Price Index (Latest)"), "Real prices"),
            named(meas("Price-to-Income Index (Latest)"), "Price/income"),
            named(meas("Overburden Rate % (Latest)"), "Overburden"),
          ],
        },
      },
      sortDefinition: { sort: [{ field: meas("House Price Index (Latest)"), direction: "Descending" }], isDefaultSort: true },
    },
    objects: {
      columnHeaders: [{ properties: { columnAdjustment: str("growToFit"), autoSizeColumnWidth: bool(true) } }],
      total: [{ properties: { totals: bool(false) } }],
    },
    visualContainerObjects: chartVcos("Country comparison, latest period (indices 2015 = 100)",
      "Table with one row per country: latest house price index, real house price index, price-to-income index and overburden rate.",
      null),
  });
  return {
    name: p, displayName: "Supply and cost burden",
    visuals: [...header(p, "Who carries the cost?", "Building permits, and the share of people overburdened by housing costs"),
      ...slicers(p), ...permitCards, permits, burden, burdenBars, ...gaps, table],
  };
}


// ---------- visual builders ----------
let z = 0;
function container(page, key, pos, visual, extra = {}) {
  z += 1000;
  return {
    $schema: VISUAL_SCHEMA,
    name: id(page, key),
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    visual,
    ...extra,
  };
}

const vcoPadding = (p) => ({ properties: { top: num(p), bottom: num(p), left: num(p), right: num(p) } });

function chartVcos(title, alt, subtitle) {
  return {
    title: [{ properties: { show: bool(true), text: str(title) } }],
    general: [{ properties: { altText: str(alt) } }],
    padding: [vcoPadding(12)],
    // Without an explicit subtitle Desktop shows an auto-generated one in the UI language.
    subTitle: [{ properties: subtitle ? { show: bool(true), text: str(subtitle) } : { show: bool(false) } }],
  };
}

function textbox(page, key, pos, text, style) {
  return container(page, key, pos, {
    visualType: "textbox",
    objects: {
      general: [{
        properties: {
          paragraphs: [{ textRuns: [{ value: text, textStyle: style }], horizontalTextAlignment: "left" }],
        },
      }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      padding: [vcoPadding(0)],
    },
  });
}

function header(page, title, subtitle) {
  return [
    textbox(page, "title", { x: 16, y: 16, w: 520, h: 40 }, title,
      { fontFamily: "Segoe UI Semibold", fontSize: "22px", color: C.text }),
    textbox(page, "subtitle", { x: 16, y: 58, w: 520, h: 40 }, subtitle,
      { fontFamily: "Segoe UI", fontSize: "13px", color: C.muted }),
  ];
}

// Entity (multi-select dropdown) and fiscal year (single select, preset to 2026), synced across pages.
function card(page, key, pos, field, label, opts = {}) {
  const objects = {
    value: [{
      properties: {
        fontSize: num(20),
        ...(opts.units ? { labelDisplayUnits: str(opts.units) } : {}),
        ...(opts.precision !== undefined ? { labelPrecision: int(opts.precision) } : {}),
      },
      selector: { id: "default" },
    }],
    label: [{ properties: { show: bool(true), text: str(label), fontSize: num(11), fontColor: fill(C.muted) }, selector: { id: "default" } }],
    padding: [{ properties: { paddingUniform: num(8) }, selector: { id: "default" } }],
    layout: [{ properties: { paddingUniform: num(0) }, selector: { id: "default" } }],
    outline: [{ properties: { show: bool(false) }, selector: { id: "default" } }],
    divider: [{ properties: { show: bool(false) }, selector: { id: "default" } }],
  };
  if (opts.reference) {
    const refId = id(page, key, "ref");
    const sel = { data: [{ dataViewWildcard: { matchingOption: 0 } }], metadata: ref(field), id: refId, order: 0 };
    const partSel = { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: ref(field), id: refId };
    objects.referenceLabel = [{ properties: { value: { expr: opts.reference.field } }, selector: sel }];
    const titleProps = { show: bool(true), titleContentType: str("custom"), titleText: str(opts.reference.title), titleFontColor: fill(C.muted) };
    objects.referenceLabelTitle = [
      { properties: titleProps, selector: { id: "default" } },
      { properties: titleProps, selector: partSel },
    ];
    const valueProps = { show: bool(true), valueFontColor: opts.reference.signColor ? signFont(opts.reference.field) : fill(C.text), valueBold: bool(true) };
    if (opts.reference.units) valueProps.valueDisplayUnits = str(opts.reference.units);
    if (opts.reference.precision !== undefined) valueProps.valuePrecision = int(opts.reference.precision);
    objects.referenceLabelValue = [{ properties: valueProps, selector: partSel }];
  }
  return container(page, key, pos, {
    visualType: "cardVisual",
    query: { queryState: { Data: { projections: [proj(field)] } } },
    objects,
    visualContainerObjects: {
      title: [{ properties: { show: bool(false) } }],
      general: [{ properties: { altText: str(opts.alt || label) } }],
      padding: [vcoPadding(8)],
      spacing: [{ properties: { customizeSpacing: bool(true), verticalSpacing: num(2) }, selector: { id: "default" } }],
    },
  });
}

// Green when the measure is above zero, red when below (the reporting sign makes > 0 favourable on every line).
function signCases(field, pos, neg) {
  return {
    expr: {
      Conditional: {
        Cases: [
          { Condition: { Comparison: { ComparisonKind: 1, Left: field, Right: { Literal: { Value: "0D" } } } }, Value: { Literal: { Value: `'${pos}'` } } },
          { Condition: { Comparison: { ComparisonKind: 3, Left: field, Right: { Literal: { Value: "0D" } } } }, Value: { Literal: { Value: `'${neg}'` } } },
        ],
      },
    },
  };
}
const signFont = (field) => ({ solid: { color: signCases(field, C.green, C.red) } });
const signBack = (field) => ({ solid: { color: signCases(field, C.greenSoft, C.redSoft) } });

const axisOn = { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false) };
const legendTop = [{ properties: { show: bool(true), position: str("Top"), fontSize: num(10), labelColor: fill(C.muted) } }];

function lineChart(page, key, pos, category, series, title, alt, opts = {}) {
  return container(page, key, pos, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [proj(category)] },
        Y: { projections: series.map((s) => named(s.field, s.name)) },
      },
    },
    objects: {
      dataPoint: series.map((s) => ({ properties: { fill: fill(s.color) }, selector: { metadata: ref(s.field) } })),
      lineStyles: [
        { properties: { strokeWidth: num(2), lineChartType: str("linear"), areaShow: bool(false) } },
        ...series.filter((s) => s.dashed).map((s) => ({ properties: { lineStyle: str("dashed") }, selector: { metadata: ref(s.field) } })),
      ],
      legend: legendTop,
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { ...axisOn } }],
      valueAxis: [{ properties: { ...axisOn, gridlineShow: bool(true), gridlineColor: fill(C.grid), ...(opts.units ? { labelDisplayUnits: str(opts.units) } : {}) } }],
    },
    visualContainerObjects: chartVcos(title, alt, opts.subtitle),
  }, opts.filters ? { filterConfig: { filters: opts.filters } } : {});
}


// ---------- theme ----------
function theme(name) {
  const axis = { gridlineColor: { solid: { color: C.grid } }, labelColor: { solid: { color: C.muted } } };
  return {
    $schema: "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json",
    name,
    dataColors: [C.blue, C.orange, C.green, C.amber, C.grey],
    good: C.green, neutral: C.grey, bad: C.red,
    maximum: "#256ABF", center: "#79A6DD", minimum: "#CDE2FB", null: C.grey,
    foreground: C.text, foregroundNeutralSecondary: C.muted, foregroundNeutralTertiary: C.muted,
    background: C.card, backgroundLight: C.grid, backgroundNeutral: C.border, tableAccent: C.blue,
    textClasses: {
      callout: { fontSize: 20, fontFace: "Segoe UI Semibold", color: C.text },
      title: { fontSize: 12, fontFace: "Segoe UI Semibold", color: C.text },
      header: { fontSize: 12, fontFace: "Segoe UI Semibold", color: C.text },
      label: { fontSize: 10, fontFace: "Segoe UI", color: C.text },
    },
    visualStyles: {
      "*": {
        "*": {
          background: [{ show: true, color: { solid: { color: C.card } }, transparency: 0 }],
          border: [{ show: true, color: { solid: { color: C.border } }, radius: 6, width: 1 }],
          dropShadow: [{ show: false }],
          padding: [{ top: 8, bottom: 8, left: 8, right: 8 }],
          title: [{ show: true, fontFamily: "Segoe UI Semibold", fontSize: 12, fontColor: { solid: { color: C.text } } }],
          subTitle: [{ fontFamily: "Segoe UI", fontSize: 10, fontColor: { solid: { color: C.muted } } }],
          categoryAxis: [{ ...axis, gridlineStyle: "solid" }],
          valueAxis: [{ ...axis, gridlineStyle: "solid" }],
          legend: [{ labelColor: { solid: { color: C.muted } } }],
        },
      },
      textbox: { "*": { padding: [{ top: 0, bottom: 0, left: 0, right: 0 }], background: [{ show: false }], border: [{ show: false }] } },
      cardVisual: { "*": { value: [{ bold: true, $id: "default" }], label: [{ show: true, $id: "default" }], title: [{ show: false }] } },
      slicer: {
        "*": {
          header: [{ fontFamily: "Segoe UI Semibold", textSize: 10, fontColor: { solid: { color: C.text } }, outlineStyle: 0 }],
          items: [{ fontFamily: "Segoe UI", textSize: 10, fontColor: { solid: { color: C.text } }, outlineStyle: 0, padding: 2 }],
        },
      },
      tableEx: {
        "*": {
          columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: "growToFit", backColor: { solid: { color: C.page } }, fontColor: { solid: { color: C.text } }, bold: true }],
          values: [{ backColorPrimary: { solid: { color: C.card } }, backColorSecondary: { solid: { color: "#FAFBFC" } }, fontColorPrimary: { solid: { color: C.text } }, fontColorSecondary: { solid: { color: C.text } } }],
        },
      },
      pivotTable: {
        "*": {
          columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: "growToFit", backColor: { solid: { color: C.page } }, fontColor: { solid: { color: C.text } }, bold: true }],
          rowHeaders: [{ fontColor: { solid: { color: C.text } } }],
          values: [{ backColorPrimary: { solid: { color: C.card } }, backColorSecondary: { solid: { color: C.card } }, fontColorPrimary: { solid: { color: C.text } }, fontColorSecondary: { solid: { color: C.text } } }],
        },
      },
    },
  };
}

// ---------- write ----------
const write = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
};

const pages = [overviewPage(), pricesPage(), supplyPage()];
for (const page of pages) {
  const dir = path.join(DEF, "pages", page.name);
  fs.rmSync(path.join(dir, "visuals"), { recursive: true, force: true });
  write(path.join(dir, "page.json"), {
    $schema: PAGE_SCHEMA,
    name: page.name,
    displayName: page.displayName,
    displayOption: "FitToPage",
    height: 720,
    width: 1280,
    objects: {
      background: [{ properties: { color: fill(C.page), transparency: num(0) } }],
      outspace: [{ properties: { color: fill(C.page), transparency: num(0) } }],
    },
  });
  for (const v of page.visuals) write(path.join(dir, "visuals", v.name, "visual.json"), v);
}

const pagesJsonPath = path.join(DEF, "pages", "pages.json");
const pagesJson = JSON.parse(fs.readFileSync(pagesJsonPath, "utf8"));
pagesJson.pageOrder = pages.map((p) => p.name);
pagesJson.activePageName = pages[0].name;
write(pagesJsonPath, pagesJson);

// Theme: rotate the file name on every run so Desktop does not serve a cached copy.
const regDir = path.join(REPORT, "StaticResources", "RegisteredResources");
fs.mkdirSync(regDir, { recursive: true });
for (const f of fs.readdirSync(regDir)) if (/^PTHousing-[0-9a-f]+\.json$/.test(f)) fs.rmSync(path.join(regDir, f));
const themeName = `PTHousing-${crypto.randomBytes(4).toString("hex")}.json`;
write(path.join(regDir, themeName), theme(themeName));

const reportPath = path.join(DEF, "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.themeCollection.customTheme = {
  name: themeName,
  reportVersionAtImport: report.themeCollection.baseTheme.reportVersionAtImport,
  type: "RegisteredResources",
};
report.resourcePackages = report.resourcePackages.filter((r) => r.type !== "RegisteredResources");
report.resourcePackages.push({
  name: "RegisteredResources",
  type: "RegisteredResources",
  items: [{ name: themeName, path: themeName, type: "CustomTheme" }],
});
write(reportPath, report);

console.log(`Wrote ${pages.length} pages, ${pages.reduce((n, p) => n + p.visuals.length, 0)} visuals, theme ${themeName}`);
