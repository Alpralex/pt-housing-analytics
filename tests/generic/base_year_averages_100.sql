{# An index published with 2015 = 100 must average 100 over 2015 (within rounding). Catches wrong units or rebasing. #}
{% test base_year_averages_100(model, value_column, date_column, group_by) %}
select {{ group_by }}, avg({{ value_column }}) as avg_2015
from {{ model }}
where year({{ date_column }}) = 2015
group by {{ group_by }}
having abs(avg({{ value_column }}) - 100) > 0.5
{% endtest %}
