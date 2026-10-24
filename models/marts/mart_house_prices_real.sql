-- House prices in real terms: nominal HPI deflated by the all-items HICP, both 2015 = 100.
-- Rents use the HICP actual-rentals index, so prices and rents can be read on the same base.
with hpi as (
    select geo, quarter_start, hpi_2015 from {{ ref('fct_house_prices') }} where purchase_type = 'TOTAL'
),
cpi as (
    select geo, quarter_start,
           max(hicp_2015) filter (where coicop = 'CP00')  as cpi_2015,
           max(hicp_2015) filter (where coicop = 'CP041') as rent_2015
    from {{ ref('fct_consumer_prices') }}
    group by all
)
select
    hpi.geo,
    hpi.quarter_start,
    hpi.hpi_2015                                         as nominal_hpi,
    hpi.hpi_2015 / cpi.cpi_2015 * 100                    as real_hpi,
    cpi.rent_2015                                        as rent_index,
    cpi.cpi_2015                                         as cpi_index,
    hpi.hpi_2015 / cpi.rent_2015 * 100                   as price_to_rent_index,
    hpi.hpi_2015 / lag(hpi.hpi_2015, 4) over w - 1       as nominal_yoy,
    (hpi.hpi_2015 / cpi.cpi_2015) / lag(hpi.hpi_2015 / cpi.cpi_2015, 4) over w - 1 as real_yoy
from hpi
join cpi using (geo, quarter_start)
window w as (partition by hpi.geo order by hpi.quarter_start)
