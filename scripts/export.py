"""Export the marts: Parquet files for Power BI (exports/) and compact JSON for the web page (web/data/)."""
import json
import os
import duckdb

DB = os.environ.get("HOUSING_DB_PATH", "data/housing.duckdb")
con = duckdb.connect(DB, read_only=True)
os.makedirs("exports", exist_ok=True)
os.makedirs("web/data", exist_ok=True)

for t in ["dim_country", "dim_quarter", "fct_house_prices", "fct_consumer_prices",
          "fct_living_conditions", "fct_building_permits", "mart_house_prices_real", "mart_affordability"]:
    con.execute(f"copy {t} to 'exports/{t}.parquet' (format parquet)")


def rows(sql):
    return [list(r) for r in con.execute(sql).fetchall()]


web = {
    # quarter, geo, nominal HPI, real HPI, rent index, CPI
    "quarterly": """
        select strftime(quarter_start, '%Y-%m-%d'), geo, round(nominal_hpi, 1), round(real_hpi, 1),
               round(rent_index, 1), round(cpi_index, 1)
        from mart_house_prices_real order by 1, 2""",
    # quarter, geo, purchase type, HPI
    "by_type": """
        select strftime(quarter_start, '%Y-%m-%d'), geo, purchase_type, round(hpi_2015, 1)
        from fct_house_prices where purchase_type <> 'TOTAL' order by 1, 2, 3""",
    # year, geo, HPI, median income, price-to-income index, overburden total, overburden below 60% of median
    "annual": """
        select year, geo, round(hpi_2015, 1), round(median_income_eur), round(price_to_income_index, 1),
               overburden_total, overburden_poor
        from mart_affordability order by 1, 2""",
    # year, geo, dwellings permitted
    "permits": """
        select year, geo, dwellings_permitted from fct_building_permits order by 1, 2""",
}
for name, sql in web.items():
    data = rows(sql)
    with open(f"web/data/{name}.json", "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(name, len(data))

meta = {
    "countries": rows("select geo, country_name, country_group from dim_country order by sort_order"),
    "last_quarter": rows("select strftime(max(quarter_start), '%Y-%m-%d') from mart_house_prices_real where geo = 'PT'")[0][0],
    "last_silc_year": rows("select max(year) from mart_affordability where geo = 'PT' and overburden_total is not null")[0][0],
}
with open("web/data/meta.json", "w") as f:
    json.dump(meta, f, separators=(",", ":"))
print(meta)
