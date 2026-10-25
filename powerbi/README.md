# Portugal housing affordability in Power BI

The same model as the web dashboard, as a Power BI project (PBIP). The semantic model is written in TMDL, so every table, relationship and DAX measure is readable in Git. It loads the Parquet files that `scripts/export.py` writes to `exports/`.

## Open it

1. The Parquet files are committed in `exports/`. To refresh them, run `dbt build --profiles-dir .` and `python scripts/export.py` (see the main README).
2. Copy the repository to the Windows machine (in Parallels, for example `C:\pt-housing-analytics`).
3. Open `powerbi/PTHousing.pbip` in Power BI Desktop. If Desktop asks, turn on the PBIP preview in *Options > Preview features*.
4. In *Transform data > Manage parameters*, set **DataFolder** to the folder that holds the Parquet files, with a trailing backslash, for example `C:\pt-housing-analytics\exports\`.
5. Select **Refresh**. The model loads about 5,000 rows.

If Desktop refuses the report scaffold, open a blank report instead, go to **TMDL view**, paste the whole of `tmdl-view-script.tmdl` and select **Apply**. That creates the same tables, parameter, relationships and measures.

## Model

Two shared dimensions, country and time. Quarterly facts hang off `dim_quarter`, annual facts off `dim_year`, and `dim_quarter` rolls up to `dim_year`, so one year slicer filters every fact and one country slicer filters every fact:

```
dim_country ──┬── mart_house_prices_real   country × quarter: nominal and real HPI, rents, CPI, YoY (653 rows)
              ├── fct_house_prices         country × quarter × dwelling type (1,881 rows)
              ├── fct_consumer_prices      country × quarter × HICP series (1,392 rows)
              ├── mart_affordability       country × year: price-to-income, income, overburden (176 rows)
              ├── fct_living_conditions    country × survey year × indicator × income group (639 rows)
              └── fct_building_permits     country × year (84 rows; PT, ES, IE, EU-27)

dim_year ──── dim_quarter ──── the three quarterly facts
   └───────── the three annual facts
```

- All relationships are many-to-one, single direction, with the dimension on the one side. Every fact reaches each dimension by one path only, so there is no ambiguity.
- `dim_quarter[quarter_start]` is a date column and the key of the quarterly relationships. `quarter_label` (2026-Q2) sorts by it, and `country_name` sorts by `sort_order` (Portugal first, EU-27 last).
- `dim_year` is built in Power Query from the years in `dim_quarter` and `mart_affordability` (2004 to 2026), because the first income year is 2004 (survey 2005).
- `dim_quarter` is not marked as a date table: Power BI expects one row per day for that. Year-on-year changes come from dbt (`nominal_yoy`, `real_yoy`), and the "Latest" measures pick the last period in the filter context instead of using time-intelligence functions.
- Power Query adds three label columns: `dwelling_type` (All, New, Existing dwellings), `hicp_series` (All items, Actual rentals) and `income_group_name`.

## Measures

Indices are 2015 = 100. No measure shares a name with a column (Power BI names are case-insensitive).

| Folder | Measure | Definition |
| --- | --- | --- |
| Prices | House Price Index, Real House Price Index, Rent Index, Consumer Price Index, Price-to-Rent Index | Average over `mart_house_prices_real`; one value per country and quarter, the yearly average on a year axis |
| Prices | House Price Index (Latest), Real House Price Index (Latest), Rent Index (Latest) | Value in the last quarter of the filter context, per country |
| Prices | House Price YoY %, Real House Price YoY % | Change on the same quarter a year earlier, last quarter of the context (computed in dbt) |
| Prices | House Price Change Since 2015 %, Real House Price Change Since 2015 %, Rent Change Since 2015 % | Latest index ÷ 100 − 1 |
| Prices | Last Price Quarter | Last quarter with house prices, as text (2026-Q2) |
| Prices | House Price Index by Type, HICP Index | For the new vs existing and the price/rent/CPI charts |
| Affordability | Price-to-Income Index, Annual House Price Index, Income Index, Median Income (EUR) | Average over `mart_affordability` |
| Affordability | Price-to-Income Year, Price-to-Income Index (Latest) | Last year with a price-to-income index (2024) and its value |
| Affordability | Price Growth Since 2015 % (Income Year), Income Growth Since 2015 % | Annual price and income index in that year ÷ 100 − 1 |
| Affordability | Overburden Rate %, Low-Income Overburden Rate %, Overburden Year, Overburden Rate % (Latest) | Share of people spending over 40% of disposable income on housing, by survey year |
| Affordability | Overburden Rate by Group % | Over `fct_living_conditions`, with `income_group_name` as legend |
| Supply | Permitted Dwellings, Permits Year, Permitted Dwellings (Latest) | Sum of dwellings permitted |
| Supply | Permits vs 2005 %, Permits Multiple of Low | Latest year against 2005, and against the lowest year of the series |
| Portugal vs EU | Portugal vs EU House Price Gap, Portugal vs EU Real House Price Gap, Portugal vs EU Price-to-Income Gap | Portugal minus EU-27, index points, in the latest period |
| Portugal vs EU | Portugal vs EU Overburden Gap (pp) | Portugal minus EU-27, percentage points |

The gap measures remove the filters on `dim_country` and set Portugal and the EU-27 themselves, so they are the same whatever country is selected; time filters still apply.

The "Latest" and gap measures follow the filter context: on a quarter or year axis they return that period, in a card they return the last period selected. In a card with no country selected, the "Latest" measures average the eight countries, so the cards on page 1 filter on Portugal.

## Reference numbers

After the first refresh, these should match (Eurostat data of 24 Oct 2026):

| Measure | Filter | Value |
| --- | --- | --- |
| House Price Index (Latest), Last Price Quarter | Portugal | 301.4, 2026-Q2 |
| House Price YoY % | Portugal | +16.5% |
| Real House Price Index (Latest) | Portugal | 232.4 |
| Rent Change Since 2015 % | Portugal | +42.8% |
| Portugal vs EU House Price Gap | none | +132.9 (EU-27 168.6) |
| Price-to-Income Index (Latest) | Portugal, NL, IE, ES, EU-27 | 136.3, 130.8, 117.7, 107.6, 106.0 (2024) |
| Price Growth Since 2015 % (Income Year), Income Growth Since 2015 % | Portugal | +124.4%, +64.7% |
| Permitted Dwellings (Latest) | Portugal | 40,900 (2025) |
| Permits vs 2005 %, Permits Multiple of Low | Portugal | −44.7%, 5.8 |
| Overburden Rate % (Latest) | Portugal, EU-27 | 6.3%, 7.7% (2025) |
| Portugal vs EU Overburden Gap (pp) | none | −1.4 |

## Report to build (three pages, 1280 × 720)

**Page 1, Overview: "How far has housing in Portugal outrun incomes?"**

1. **Header:** text box with the question, and a subtitle "Eurostat, 2015 = 100, prices to" plus a card with Last Price Quarter.
2. **Slicers** in one row: `dim_country[country_name]` (dropdown, multi-select) and `dim_year[year]` (between, default 2015 to 2026).
3. **Four cards**, each filtered to Portugal in the visual filters: House Price YoY % (subtitle Real House Price YoY %), Real House Price Change Since 2015 %, Price-to-Income Index (Latest) (subtitle Price-to-Income Year), Overburden Rate % (Latest) (subtitle Portugal vs EU Overburden Gap (pp)).
4. **Line chart:** `dim_quarter[quarter_start]` on the axis, Real House Price Index as the value, `dim_country[country_name]` as the legend. Highlight Portugal with a thicker line. Add a field parameter or a bookmark pair to switch to House Price Index (nominal), as the web page's Real/Nominal toggle does.
5. **Bar chart:** House Price Index (Latest) by `dim_country[country_name]`, sorted descending. Portugal is first at 301.

**Page 2, Prices against rents and incomes**

1. **Line chart (Portugal):** `dim_quarter[quarter_start]` on the axis, House Price Index, Rent Index and Consumer Price Index as values.
2. **Bar chart:** Price-to-Income Index (Latest) by `dim_country[country_name]`, sorted descending, with a constant line at 100.
3. **Line chart (Portugal):** `dim_quarter[quarter_start]` on the axis, House Price Index by Type as the value, `fct_house_prices[dwelling_type]` as the legend, filtered to New and Existing dwellings.
4. **Card pair:** Price Growth Since 2015 % (Income Year) and Income Growth Since 2015 % for Portugal (+124% against +65%).

**Page 3, Supply and who carries the cost**

1. **Column chart:** Permitted Dwellings by `dim_year[year]`, filtered to Portugal. Cards: Permitted Dwellings (Latest), Permits vs 2005 %, Permits Multiple of Low.
2. **Line chart:** Overburden Rate by Group % by `dim_year[year]`, `fct_living_conditions[income_group_name]` as the legend, filtered to Portugal.
3. **Clustered bar:** Overburden Rate % (Latest) and Low-Income Overburden Rate % by `dim_country[country_name]`.
4. **Table:** `dim_country[country_name]` with House Price Index (Latest), Real House Price Index (Latest), Price-to-Income Index (Latest) and Overburden Rate % (Latest), one row per country.
5. **Cards** above the table: the four Portugal vs EU gap measures. They ignore the country slicer, so they always compare Portugal with the EU-27.

Use one colour for Portugal across pages and greys for the peers, as on the web page. Publish with *Publish to web* from your own Fabric workspace and put the link in the portfolio.
