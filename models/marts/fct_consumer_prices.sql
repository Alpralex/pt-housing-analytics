-- Grain: country x quarter x COICOP. Quarterly average of the monthly index; incomplete quarters are dropped
-- so they never get compared with full ones.
select
    geo,
    date_trunc('quarter', month_start)::date as quarter_start,
    coicop,
    avg(hicp_2015)                           as hicp_2015
from {{ ref('stg_consumer_prices') }}
join {{ ref('dim_country') }} using (geo)
where month_start >= date '2005-01-01'
group by all
having count(*) = 3
