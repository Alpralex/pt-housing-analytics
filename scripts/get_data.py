"""Download the Eurostat tables used by the project into data/raw/<dataset>.csv.

Uses the Eurostat statistics API (JSON-stat 2.0) and flattens each table to a long CSV:
one column per dimension, then time, value and status flag. Standard library only.
"""
import csv
import itertools
import json
import os
import sys
import urllib.parse
import urllib.request

API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
GEOS = ["PT", "ES", "IE", "IT", "FR", "DE", "NL", "EU27_2020"]

# dataset -> extra filters (repeated keys allowed). Everything else is filtered in dbt staging.
DATASETS = {
    "prc_hpi_q": {"unit": ["I15_Q"]},                       # house price index, quarterly, 2015 = 100
    # HICP monthly, ECOICOP ver. 2 (replaced prc_hicp_midx, frozen at 2025-12): all items, actual rentals
    "prc_hicp_minr": {"unit": ["I15"], "coicop18": ["TOTAL", "CP041"]},
    "ilc_lvho07a": {"unit": ["PC"], "age": ["TOTAL"], "sex": ["T"]},  # housing cost overburden rate
    "ilc_di03": {"age": ["TOTAL"], "sex": ["T"], "unit": ["EUR"]},  # mean and median equivalised net income
    "sts_cobp_a": {"geo": ["PT", "ES", "IE", "EU27_2020"]},  # building permits, annual
}
OUT = os.environ.get("HOUSING_RAW_PATH", "data/raw")


def fetch(ds, filters):
    params = [("format", "JSON"), ("lang", "EN")]
    geos = filters.get("geo", GEOS)
    params += [("geo", g) for g in geos]
    for k, vals in filters.items():
        if k != "geo":
            params += [(k, v) for v in vals]
    url = API + ds + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=180) as r:
        return json.load(r)


def flatten(js):
    ids, sizes = js["id"], js["size"]
    cats = []
    for d in ids:
        index = js["dimension"][d]["category"]["index"]
        codes = sorted(index, key=index.get) if isinstance(index, dict) else index
        cats.append(codes)
    values, status = js.get("value", {}), js.get("status", {})
    if isinstance(values, list):
        values = {str(i): v for i, v in enumerate(values) if v is not None}
    for n, combo in enumerate(itertools.product(*cats)):
        v = values.get(str(n))
        if v is None:
            continue
        yield list(combo) + [v, status.get(str(n), "")]


def main():
    """Usage: get_data.py [--from-json DIR] [dataset ...]. --from-json converts responses saved elsewhere."""
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    src = None
    if args[:1] == ["--from-json"]:
        src, args = args[1], args[2:]
    for ds, filters in DATASETS.items():
        if args and ds not in args:
            continue
        try:
            if src:
                with open(os.path.join(src, ds + ".json")) as f:
                    js = json.load(f)
            else:
                js = fetch(ds, filters)
        except Exception as e:  # report and keep going so one bad filter doesn't stop the rest
            print(f"{ds}: FAILED {e}", file=sys.stderr)
            continue
        header = [d.lower() for d in js["id"]]
        header = ["time_period" if h == "time" else h for h in header] + ["obs_value", "obs_flag"]
        rows = list(flatten(js))
        with open(f"{OUT}/{ds}.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
        print(f"{ds}: {len(rows)} rows, updated {js.get('updated', '?')}")


if __name__ == "__main__":
    main()
