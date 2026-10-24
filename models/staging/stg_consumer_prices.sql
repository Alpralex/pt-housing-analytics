-- Eurostat prc_hicp_minr: harmonised consumer price index, monthly, ECOICOP ver. 2, 2015 = 100.
-- It replaced prc_hicp_midx, which stopped at 2025-12. TOTAL (all items) is renamed CP00 to keep the
-- familiar code; CP041 = actual rental payments for housing.
select
    geo,
    case coicop18 when 'TOTAL' then 'CP00' else coicop18 end as coicop,
    cast(replace(time_period, 'M', '-') || '-01' as date)     as month_start,
    cast(obs_value as double)                                 as hicp_2015
from read_csv_auto('{{ var("raw_path") }}/prc_hicp_minr.csv', all_varchar = true)
where unit = 'I15'
  and coicop18 in ('TOTAL', 'CP041')
