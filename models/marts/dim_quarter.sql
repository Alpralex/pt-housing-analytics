-- One row per calendar quarter from 2005 to the current year.
select
    q::date                                         as quarter_start,
    year(q)                                         as year,
    quarter(q)                                      as quarter,
    year(q) || '-Q' || quarter(q)                   as quarter_label
from generate_series(date '2005-01-01', date_trunc('year', current_date) + interval 9 month, interval 3 month) t(q)
