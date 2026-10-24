-- Grain: country x survey year x indicator x income group.
select s.geo, s.survey_year, s.indicator, s.income_group, s.value
from {{ ref('stg_living_conditions') }} s
join {{ ref('dim_country') }} using (geo)
where s.survey_year >= 2005
