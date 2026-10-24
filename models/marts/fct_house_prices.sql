-- Grain: country x quarter x purchase type.
select
    h.geo,
    h.quarter_start,
    h.purchase_type,
    h.hpi_2015,
    h.hpi_2015 / lag(h.hpi_2015, 4) over w - 1 as yoy_change
from {{ ref('stg_house_prices') }} h
join {{ ref('dim_country') }} c using (geo)
where h.quarter_start >= date '2005-01-01'
window w as (partition by h.geo, h.purchase_type order by h.quarter_start)
