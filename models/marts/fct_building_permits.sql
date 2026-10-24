-- Grain: country x year. Supply side: how many new homes were authorised.
select p.geo, p.year, p.dwellings_permitted
from {{ ref('stg_building_permits') }} p
join {{ ref('dim_country') }} using (geo)
where p.year >= 2005
