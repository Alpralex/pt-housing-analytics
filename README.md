# How far has housing in Portugal outrun incomes?

A housing affordability BI project on official statistics: Eurostat house prices, rents, consumer prices and household income for Portugal, six peer countries and the EU-27, modelled in SQL with dbt on DuckDB, tested, and published as a web dashboard, a Power BI project and a Qlik Sense app on the same Parquet exports.

**Live dashboard:** https://guilhermerigonato.com/pt-housing-analytics/

## Findings

1. **House prices in Portugal have tripled since 2015.** The index reached 301 in Q2 2026 (2015 = 100), the steepest rise of the eight economies compared, still +16.5% year on year. In real terms prices are 2.3 times their 2015 level.
2. **Prices have outrun incomes faster than in any peer.** From 2015 to 2024 house prices rose 124% and median household income 65%. Price-to-income index 136, against 131 in the Netherlands, 118 in Ireland, 108 in Spain and 106 for the EU-27.
3. **Building has not caught up.** 40,900 dwellings were permitted in 2025, almost six times the 2014 low but 45% below the 73,900 of 2005. Rents (HICP) are +43% since 2015, far less than prices.
4. **The average household is not where the pressure shows.** 6.3% of people spend over 40% of income on housing (EU-27: 7.7%), because most households own outright. The squeeze falls on buyers and new tenants.

Data as published by Eurostat on 24 Oct 2026 (house prices to Q2 2026, HICP to Sep 2026, EU-SILC survey 2025).

## Model

```
raw (Eurostat API → CSV)     staging (views)               marts (tables)
prc_hpi_q ─────────────────▶ stg_house_prices ───────────▶ fct_house_prices        country × quarter × dwelling type
prc_hicp_minr ─────────────▶ stg_consumer_prices ────────▶ fct_consumer_prices     country × quarter × COICOP
ilc_lvho07a, ilc_di03 ─────▶ stg_living_conditions ──────▶ fct_living_conditions   country × year × indicator × income group
sts_cobp_a ────────────────▶ stg_building_permits ───────▶ fct_building_permits    country × year
seeds/countries.csv ───────────────────────────────────────▶ dim_country, dim_quarter
                                                             mart_house_prices_real  nominal and real prices, rents, price-to-rent
                                                             mart_affordability      price-to-income index, housing cost overburden
```

- 12 models, 1 seed, 25 tests: unique keys and key combinations, not null, relationships to the dimensions, accepted values, and a custom test that every index averages 100 in its 2015 base year (catches a wrong unit or rebasing).
- EU-SILC asks about the previous year's income, so income is aligned to its income year before it meets prices.
- Real prices deflate the house price index by the all-items HICP; the price-to-income index divides the annual house price index by median equivalised income indexed to 2015.
- Incomplete quarters of monthly data are dropped so they are never compared with full ones.

## Run it

```bash
pip install dbt-duckdb duckdb
python scripts/get_data.py          # Eurostat API → data/raw/*.csv (standard library only)
# or, with responses saved elsewhere: python scripts/get_data.py --from-json <dir>
dbt build --profiles-dir .          # seconds
python scripts/export.py            # exports/*.parquet for Power BI and Qlik, web/data/*.json for the page
```

Open `web/index.html` through any static server (`python -m http.server` in `web/`).

## Power BI version

`powerbi/PTHousing.pbip` is a Power BI project with the semantic model in TMDL: the eight Parquet files from `exports/`, a country dimension, a quarter dimension that rolls up to a year dimension, 13 single-direction relationships and 38 DAX measures (nominal and real house price index, YoY, change since 2015, rents, price-to-income, overburden, permits, and Portugal vs EU gaps).

1. The Parquet files are committed in `exports/`; run the pipeline above only to refresh them.
2. Open `powerbi/PTHousing.pbip` in Power BI Desktop.
3. In *Transform data > Manage parameters*, set **DataFolder** to the exports folder with a trailing backslash, for example `C:\pt-housing-analytics\exports\`, and select **Refresh**.

If Desktop refuses the project, paste `powerbi/tmdl-view-script.tmdl` into **TMDL view** of a blank report and select **Apply**. The model, measures and a three-page report spec are in [powerbi/README.md](powerbi/README.md).

## Qlik version

`qlik/load_script.qvs` loads the same Parquet files with the `(parquet)` format from `vPath` (default `lib://DataFiles/`, so upload `exports/*.parquet` to the space's DataFiles). Countries and a quarter calendar link to one concatenated fact table, through `Geo` and `%Quarter` only, so there are no synthetic keys; annual rows carry `Year`. Master measures are in [qlik/master_items.md](qlik/master_items.md) and the three sheets in [qlik/sheets.md](qlik/sheets.md).

## Reference numbers

Checked with DuckDB on the Parquet files (Eurostat data of 24 Oct 2026). Power BI and Qlik should show the same after the first load.

| Figure | Value |
| --- | --- |
| Rows loaded | 8 countries, 88 quarters (2005-Q1 to 2026-Q4), 4,825 fact rows (house prices real 653, by type 1,881, HICP 1,392, affordability 176, living conditions 639, permits 84) |
| House price index, Portugal, 2026-Q2 | 301.4 nominal, 232.4 real (2015 = 100) |
| House prices year on year, Portugal, 2026-Q2 | +16.5% nominal, +12.9% real |
| House price index 2026-Q2, other countries | NL 222.6, IE 205.9, ES 200.6, EU-27 168.6, DE 153.5, FR 125.5, IT 121.0 |
| Portugal vs EU-27 house price gap, 2026-Q2 | +132.9 points nominal, +109.3 real |
| New and existing dwellings, Portugal, 2026-Q2 | 235.2 and 327.5 |
| Rents (HICP actual rentals), Portugal, 2026-Q2 | 142.8, +43% since 2015; all-items HICP 129.7 |
| Prices and median income, Portugal, 2015 to 2024 | +124.4% and +64.7% |
| Price-to-income index, 2024 | PT 136.3, NL 130.8, IE 117.7, DE 108.9, ES 107.6, EU-27 106.0, FR 103.7, IT 82.3 |
| Dwellings permitted, Portugal | 40,900 in 2025; 7,000 in 2014 (5.8 times); 73,900 in 2005 (−44.7%) |
| Housing cost overburden, 2025 survey | PT 6.3%, EU-27 7.7% (gap −1.4 pp); below 60% of median income PT 24.4%, EU-27 29.1% |

## Data

Eurostat (© European Union), through the dissemination statistics API: `prc_hpi_q` house price index, `prc_hicp_minr` HICP, ECOICOP ver. 2 (all items, CP041 actual rentals; it replaced `prc_hicp_midx`, frozen at Dec 2025), `ilc_lvho07a` housing cost overburden rate, `ilc_di03` median equivalised net income, `sts_cobp_a` building permits.

## Caveats

- The HICP rent index covers all tenancies, including old contracts, so it rises more slowly than asking rents for new leases.
- National averages hide the regions: Lisbon and the Algarve are well above them. A regional layer from INE (median sale and rent values per m² by municipality) is the planned next step.
