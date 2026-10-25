# Sheet guide

Three sheets, in the order of the web page's findings. Build them with the master items in place.
Default selection for the demo: `Country` = Portugal on the KPI objects (set it in each KPI's
set expression with `Geo={'PT'}`, or keep a bookmark "Portugal" with `Country` = Portugal).

## 1. Prices: "How far have house prices risen?"
- KPIs (Portugal): House Price YoY % (**+16.5%** in 2026-Q2), House Price Index (Latest) (**301.4**),
  Real House Price Index (Latest) (**232.4**, prices 2.3 times their 2015 level in real terms),
  Portugal vs EU House Price Gap (**+132.9** points, EU-27 168.6).
- Line chart: Real House Price Index by Quarter Label, one line per Country. Alternative measure
  House Price Index, so the chart switches between real and nominal like the web page's toggle.
  For the default view from 2015, add `_From2015={1}` to the chart's set expression rather than
  selecting the flag: a selection on a quarter field also empties the annual series on sheets 2 and 3.
- Bar chart: House Price Index (Latest) by Country, sorted descending. **Portugal is first at 301,
  then the Netherlands 223, Ireland 206, Spain 201; EU-27 169.**
- Filter pane: Country, Country Group, Year.

## 2. Affordability: "Have incomes kept up?"
- Line chart (Portugal): House Price Index, Rent Index and Consumer Price Index by Quarter Label.
  **Rents +43% since 2015 (142.8), consumer prices +30%, house prices +201%.**
- Bar chart: Price-to-Income Index (Latest) by Country, sorted descending, reference line at 100.
  **Portugal 136.3, Netherlands 130.8, Ireland 117.7, Germany 108.9, Spain 107.6, EU-27 106.0 (2024).**
- KPIs (Portugal): Price Growth Since 2015 % (**+124%**) and Income Growth Since 2015 % (**+65%**),
  2015 to 2024.
- Line chart (Portugal): House Price Index by Type by Quarter Label, dimension Dwelling Type,
  excluding All dwellings (existing 327.5, new 235.2 in 2026-Q2).

## 3. Supply and burden: "Who carries the cost?"
- Bar chart (Portugal): Permitted Dwellings by Year. **40,900 in 2025, 5.8 times the 2014 low of
  7,000, and 44.7% below the 73,900 of 2005.** KPIs: Permitted Dwellings (Latest), Permits vs 2005 %,
  Permits Multiple of Low.
- Line chart (Portugal): Overburden Rate by Group % by Year, dimension Income Group.
  Below 60% of median income: 24.4% in 2025; all people: 6.3%.
- Bar chart: Overburden Rate % (Latest) by Country. **Portugal 6.3% against EU-27 7.7% (2025)**;
  KPI Portugal vs EU Overburden Gap (pp) shows **−1.4**.
- Text: the squeeze falls on buyers and new tenants, which national averages hide (most households
  own outright; the HICP rent index includes old contracts).

## Bookmarks for the demo video
1. "Portugal since 2015": Country = Portugal, Year = 2015 to 2026, on the prices sheet.
2. "Peers": Country = Portugal, Spain, Netherlands, Ireland, EU-27 on the affordability sheet.
3. "Supply": Country = Portugal on the supply sheet.
