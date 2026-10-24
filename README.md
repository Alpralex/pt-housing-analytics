# How far has housing in Portugal outrun incomes?

A housing affordability BI project on official statistics: Eurostat house prices, rents, consumer prices and household income for Portugal, six peer countries and the EU-27, modelled in SQL with dbt on DuckDB, tested, and published as a web dashboard and as Parquet files for Power BI.

**Live dashboard:** https://claude.ai/artifact/GpNUo5QukBeux5UxpvmN3J (moves to guilhermerigonato.com/pt-housing-analytics/ once the repo is published)

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
python scripts/export.py            # exports/*.parquet for Power BI, web/data/*.json for the page
```

Open `web/index.html` through any static server (`python -m http.server` in `web/`).

## Data

Eurostat (© European Union), through the dissemination statistics API: `prc_hpi_q` house price index, `prc_hicp_minr` HICP, ECOICOP ver. 2 (all items, CP041 actual rentals; it replaced `prc_hicp_midx`, frozen at Dec 2025), `ilc_lvho07a` housing cost overburden rate, `ilc_di03` median equivalised net income, `sts_cobp_a` building permits.

## Caveats

- The HICP rent index covers all tenancies, including old contracts, so it rises more slowly than asking rents for new leases.
- National averages hide the regions: Lisbon and the Algarve are well above them. A regional layer from INE (median sale and rent values per m² by municipality) is the planned next step.
