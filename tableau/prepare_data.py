"""Write the Tableau data files from the dbt exports (../exports/*.parquet).

    python tableau/prepare_data.py

Tableau Public reads text files, not Parquet, so the marts are flattened into three tidy CSVs (UTF-8, comma,
'.' decimals). Country names in English and Portuguese so one workbook serves both language versions.
"""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
EXP = ROOT / "exports"
OUT = ROOT / "tableau" / "data"
PT_NAMES = {"PT": "Portugal", "ES": "Espanha", "IE": "Irlanda", "IT": "Itália", "FR": "França", "DE": "Alemanha",
            "NL": "Países Baixos", "EU27_2020": "UE-27"}


def countries() -> pd.DataFrame:
    c = pd.read_parquet(EXP / "dim_country.parquet")
    c["country_pt"] = c["geo"].map(PT_NAMES)
    c["highlight"] = c["geo"].map(lambda g: "Portugal" if g == "PT" else "Other")
    return c


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    c = countries()

    # 1. Annual: house prices vs household income, both 2015 = 100 (long format: one row per series)
    a = pd.read_parquet(EXP / "mart_affordability.parquet")
    a = a[(a["year"] >= 2015) & a["hpi_2015"].notna() & a["income_2015"].notna()]
    long = pd.concat([
        a.assign(series="House prices", series_pt="Preços das casas", index_2015=a["hpi_2015"]),
        a.assign(series="Household income", series_pt="Rendimento das famílias", index_2015=a["income_2015"]),
    ])[["geo", "year", "series", "series_pt", "index_2015"]]
    long = long.merge(c, on="geo")
    long["index_2015"] = long["index_2015"].round(1)
    long.sort_values(["sort_order", "series", "year"]).to_csv(OUT / "prices_vs_income.csv", index=False)

    # 2. Annual affordability per country (latest year with both series = ranking)
    aff = a[["geo", "year", "hpi_2015", "income_2015", "price_to_income_index", "median_income_eur",
             "overburden_total"]].merge(c, on="geo")
    aff = aff.round({"hpi_2015": 1, "income_2015": 1, "price_to_income_index": 1, "overburden_total": 1})
    aff.sort_values(["sort_order", "year"]).to_csv(OUT / "affordability.csv", index=False)

    # 3. Quarterly: nominal and real house prices, rents (2015 = 100)
    q = pd.read_parquet(EXP / "mart_house_prices_real.parquet")
    q = q[pd.to_datetime(q["quarter_start"]) >= "2010-01-01"]
    q = q[["geo", "quarter_start", "nominal_hpi", "real_hpi", "rent_index"]].merge(c, on="geo")
    q["quarter_start"] = pd.to_datetime(q["quarter_start"]).dt.date
    q = q.round({"nominal_hpi": 1, "real_hpi": 1, "rent_index": 1})
    q.sort_values(["sort_order", "quarter_start"]).to_csv(OUT / "quarterly_prices.csv", index=False)

    # 4. Building permits, Portugal only (dwellings)
    p = pd.read_parquet(EXP / "fct_building_permits.parquet").merge(c, on="geo")
    p[p["geo"] == "PT"].sort_values("year").to_csv(OUT / "permits_pt.csv", index=False)

    for f in sorted(OUT.glob("*.csv")):
        print(f.name, len(pd.read_csv(f)), "rows")


if __name__ == "__main__":
    main()
