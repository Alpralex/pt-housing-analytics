-- Eurostat prc_hpi_q: house price index, quarterly, 2015 = 100.
-- purchase: TOTAL = all dwellings, DW_NEW = new dwellings, DW_EXST = existing dwellings.
select
    geo,
    purchase                                                   as purchase_type,
    make_date(cast(left(time_period, 4) as int),
              (cast(right(time_period, 1) as int) - 1) * 3 + 1, 1) as quarter_start,
    cast(obs_value as double)                                  as hpi_2015
from read_csv_auto('{{ var("raw_path") }}/prc_hpi_q.csv', all_varchar = true)
where unit = 'I15_Q'
  and purchase in ('TOTAL', 'DW_NEW', 'DW_EXST')
