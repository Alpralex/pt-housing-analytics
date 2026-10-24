-- Annual affordability by country: house prices against median household income, both 2015 = 100,
-- plus the share of people overburdened by housing costs.
-- Price-to-income index above 100 means prices grew faster than incomes since 2015.
-- EU-SILC asks about the previous year's income, so survey year t gives income for year t - 1: income is
-- aligned to its income year before it meets house prices. Overburden stays on the survey year.
with hpi_year as (
    select geo, year(quarter_start) as year, avg(hpi_2015) as hpi_2015, count(*) as quarters
    from {{ ref('fct_house_prices') }}
    where purchase_type = 'TOTAL'
    group by all
    having count(*) = 4
),
income as (
    select geo, survey_year - 1 as year, value as median_income_eur
    from {{ ref('fct_living_conditions') }}
    where indicator = 'median_income_eur'
),
burden as (
    select geo, survey_year as year,
           max(value) filter (where income_group = 'TOTAL') as overburden_total,
           max(value) filter (where income_group = 'B_60')  as overburden_poor
    from {{ ref('fct_living_conditions') }}
    where indicator = 'overburden_rate'
    group by all
),
lc as (
    select geo, year, i.median_income_eur, b.overburden_total, b.overburden_poor
    from income i full join burden b using (geo, year)
),
base as (
    select geo, median_income_eur as income_2015 from lc where year = 2015
)
select
    lc.geo,
    lc.year,
    h.hpi_2015,
    lc.median_income_eur,
    lc.median_income_eur / b.income_2015 * 100                    as income_2015,
    h.hpi_2015 / (lc.median_income_eur / b.income_2015 * 100) * 100 as price_to_income_index,
    lc.overburden_total,
    lc.overburden_poor
from lc
left join hpi_year h using (geo, year)
left join base b using (geo)
