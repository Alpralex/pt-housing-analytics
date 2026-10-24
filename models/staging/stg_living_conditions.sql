-- Eurostat EU-SILC, annual. Two indicators in one long table:
--   overburden_rate: % of people living in a household that spends over 40% of disposable income on housing (ilc_lvho07a)
--   median_income_eur: median equivalised net income in euro (ilc_di03)
-- rskpovth: TOTAL, A_60 = above 60% of median income, B_60 = below (at risk of poverty).
select
    geo,
    cast(time_period as int)  as survey_year,
    'overburden_rate'         as indicator,
    rskpovth                  as income_group,
    cast(obs_value as double) as value
from read_csv_auto('{{ var("raw_path") }}/ilc_lvho07a.csv', all_varchar = true)
where unit = 'PC' and age = 'TOTAL' and sex = 'T'
  and rskpovth in ('TOTAL', 'A_60', 'B_60')

union all

select
    geo,
    cast(time_period as int),
    'median_income_eur',
    'TOTAL',
    cast(obs_value as double)
from read_csv_auto('{{ var("raw_path") }}/ilc_di03.csv', all_varchar = true)
where unit = 'EUR' and age = 'TOTAL' and sex = 'T' and statinfo = 'MED_EI'
