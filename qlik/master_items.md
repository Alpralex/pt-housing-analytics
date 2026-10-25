# Master items

Create these under **Master items** after the first reload. Every measure starts from
`FactType`, because quarterly and annual series share one fact table. Indices are 2015 = 100.

"Latest" measures use `FirstSortedValue`, which returns the value of the last quarter (or year)
in the current selection. It returns null when two rows tie, so use them with one country
selected or in a chart with `Country` as a dimension. On a quarter or year axis they return that
period's value.

## Measures

### Prices (quarterly)

| Name | Expression | Format |
|---|---|---|
| House Price Index | `Avg({<FactType={'House prices'}>} [Nominal HPI])` | `0.0` |
| Real House Price Index | `Avg({<FactType={'House prices'}>} [Real HPI])` | `0.0` |
| Rent Index | `Avg({<FactType={'House prices'}>} [Rent Index])` | `0.0` |
| Consumer Price Index | `Avg({<FactType={'House prices'}>} [CPI Index])` | `0.0` |
| Price-to-Rent Index | `Avg({<FactType={'House prices'}>} [Price To Rent])` | `0.0` |
| House Price Index (Latest) | `FirstSortedValue({<FactType={'House prices'}>} [Nominal HPI], -%Quarter)` | `0.0` |
| Real House Price Index (Latest) | `FirstSortedValue({<FactType={'House prices'}>} [Real HPI], -%Quarter)` | `0.0` |
| House Price YoY % | `FirstSortedValue({<FactType={'House prices'}>} [Nominal YoY], -%Quarter)` | `+0.0%;-0.0%` |
| Real House Price YoY % | `FirstSortedValue({<FactType={'House prices'}>} [Real YoY], -%Quarter)` | `+0.0%;-0.0%` |
| House Price Change Since 2015 % | `FirstSortedValue({<FactType={'House prices'}>} [Nominal HPI], -%Quarter) / 100 - 1` | `+0%;-0%` |
| Real House Price Change Since 2015 % | `FirstSortedValue({<FactType={'House prices'}>} [Real HPI], -%Quarter) / 100 - 1` | `+0%;-0%` |
| Rent Change Since 2015 % | `FirstSortedValue({<FactType={'House prices'}>} [Rent Index], -%Quarter) / 100 - 1` | `+0%;-0%` |
| Last Price Quarter | `Year(Max({<FactType={'House prices'}>} %Quarter)) & '-Q' & Ceil(Month(Max({<FactType={'House prices'}>} %Quarter)) / 3)` | text |
| House Price Index by Type | `Avg({<FactType={'HPI by type'}>} [HPI by Type])` (dimension `Dwelling Type`) | `0.0` |
| HICP Index | `Avg({<FactType={'HICP'}>} [HICP Index])` (dimension `HICP Series`) | `0.0` |

### Affordability (annual)

| Name | Expression | Format |
|---|---|---|
| Price-to-Income Index | `Avg({<FactType={'Affordability'}>} [Price To Income])` | `0.0` |
| Annual House Price Index | `Avg({<FactType={'Affordability'}>} [Annual HPI])` | `0.0` |
| Income Index | `Avg({<FactType={'Affordability'}>} [Income Index])` | `0.0` |
| Median Income | `Avg({<FactType={'Affordability'}>} [Median Income])` | `#,##0 €` |
| Price-to-Income Year | `Max({<FactType={'Affordability'}, [Price To Income]={"*"}>} Year)` | `0` |
| Price-to-Income Index (Latest) | `FirstSortedValue({<FactType={'Affordability'}, [Price To Income]={"*"}>} [Price To Income], -Year)` | `0.0` |
| Price Growth Since 2015 % | `FirstSortedValue({<FactType={'Affordability'}, [Price To Income]={"*"}>} [Annual HPI], -Year) / 100 - 1` | `+0%;-0%` |
| Income Growth Since 2015 % | `FirstSortedValue({<FactType={'Affordability'}, [Price To Income]={"*"}>} [Income Index], -Year) / 100 - 1` | `+0%;-0%` |
| Overburden Rate % | `Avg({<FactType={'Affordability'}>} [Overburden Total]) / 100` | `0.0%` |
| Low-Income Overburden Rate % | `Avg({<FactType={'Affordability'}>} [Overburden Low Income]) / 100` | `0.0%` |
| Overburden Rate % (Latest) | `FirstSortedValue({<FactType={'Affordability'}, [Overburden Total]={"*"}>} [Overburden Total], -Year) / 100` | `0.0%` |
| Overburden Rate by Group % | `Avg({<FactType={'Living conditions'}, Indicator={'overburden_rate'}>} [LC Value]) / 100` (dimension `Income Group`) | `0.0%` |

The price growth measures take the last year that also has income (2024), so prices and incomes
are compared over the same years.

### Supply (annual)

| Name | Expression | Format |
|---|---|---|
| Permitted Dwellings | `Sum({<FactType={'Permits'}>} [Dwellings Permitted])` | `#,##0` |
| Permitted Dwellings (Latest) | `FirstSortedValue({<FactType={'Permits'}>} [Dwellings Permitted], -Year)` | `#,##0` |
| Permits vs 2005 % | `FirstSortedValue({<FactType={'Permits'}>} [Dwellings Permitted], -Year) / Sum({<FactType={'Permits'}, Year={2005}>} [Dwellings Permitted]) - 1` | `+0.0%;-0.0%` |
| Permits Multiple of Low | `FirstSortedValue({<FactType={'Permits'}>} [Dwellings Permitted], -Year) / Min({<FactType={'Permits'}, Year=>} [Dwellings Permitted])` | `0.0` |

### Portugal vs EU

These set `Geo` themselves and clear `Country` and `Country Group`, so they always compare Portugal
with the EU-27 whatever is selected; time selections still apply.

| Name | Expression | Format |
|---|---|---|
| Portugal vs EU House Price Gap | `FirstSortedValue({<FactType={'House prices'}, Geo={'PT'}, Country=, [Country Group]=>} [Nominal HPI], -%Quarter) - FirstSortedValue({<FactType={'House prices'}, Geo={'EU27_2020'}, Country=, [Country Group]=>} [Nominal HPI], -%Quarter)` | `+0.0;-0.0` |
| Portugal vs EU Real House Price Gap | same with `[Real HPI]` | `+0.0;-0.0` |
| Portugal vs EU Price-to-Income Gap | `FirstSortedValue({<FactType={'Affordability'}, [Price To Income]={"*"}, Geo={'PT'}, Country=, [Country Group]=>} [Price To Income], -Year) - FirstSortedValue({<FactType={'Affordability'}, [Price To Income]={"*"}, Geo={'EU27_2020'}, Country=, [Country Group]=>} [Price To Income], -Year)` | `+0.0;-0.0` |
| Portugal vs EU Overburden Gap (pp) | `FirstSortedValue({<FactType={'Affordability'}, [Overburden Total]={"*"}, Geo={'PT'}, Country=, [Country Group]=>} [Overburden Total], -Year) - FirstSortedValue({<FactType={'Affordability'}, [Overburden Total]={"*"}, Geo={'EU27_2020'}, Country=, [Country Group]=>} [Overburden Total], -Year)` | `+0.0;-0.0` |

## Dimensions

- **Time, quarterly** (drill-down): Year → Quarter Label
- **Time, annual**: Year
- **Geography**: Country (sorted Portugal first, EU-27 last), Country Group (focus, peer, benchmark)
- Dwelling Type, HICP Series, Income Group

Annual series have no quarter, so a selection in `Quarter Label` or `Quarter` leaves them empty.
Filter annual sheets by `Year` only.

## Variables

The load script sets `vLastQuarter` (2026-Q2), `vLastPTIYear` (2024), `vLastOBYear` (2025) and
`vLastPermitYear` (2025) for sheet subtitles, for example `='Prices to ' & '$(vLastQuarter)'`, and
the expression variables `vHPI`, `vRealHPI`, `vHPILatest`, `vRealHPILatest`, `vHPIYoY`,
`vPTILatest`, `vOBLatest` and `vPermitsLatest`.

## Colours

Assign a master colour to `Country`: Portugal in the accent colour, the six peers in greys and the
EU-27 dashed or dark grey, as on the web page.
