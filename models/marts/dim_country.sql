select geo, country_name, country_group, sort_order
from {{ ref('countries') }}
