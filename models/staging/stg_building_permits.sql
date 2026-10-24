-- Eurostat sts_cobp_a: building permits, annual. Number of dwellings permitted in residential buildings
-- (CPA_F41001_X_410014 = residential buildings except residences for communities), in thousands.
select
    geo,
    cast(time_period as int)         as year,
    cast(obs_value as double) * 1000 as dwellings_permitted
from read_csv_auto('{{ var("raw_path") }}/sts_cobp_a.csv', all_varchar = true)
where indic_bt = 'BPRM_DW'
  and cpa2_1 = 'CPA_F41001_X_410014'
  and unit = 'THS'
