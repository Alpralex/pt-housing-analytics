"""Generate the Tableau Public workbook (homes_vs_incomes.twbx) from the CSVs in tableau/data.

    python tableau/build_workbook.py            # English titles
    python tableau/build_workbook.py --lang pt  # Portuguese titles

The workbook is plain XML; writing it from a script keeps it reviewable in Git and lets both language versions
come from one definition. It was generated without Tableau at hand: open it in Tableau Public Desktop, check
each sheet, then save to Tableau Public (see tableau/README.md, which also has the manual build steps).
"""

from __future__ import annotations

import argparse
import uuid
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

TEXT = {
    "en": {
        "title": "Homes have outrun incomes in Portugal",
        "subtitle": "House prices and median household income, 2015 = 100. Eurostat, data to Q2 2026 (prices) and 2024 (income).",
        "s1": "Portugal: house prices vs household income (2015 = 100)",
        "s2": "Price-to-income index, 2024 (above 100: prices grew faster than incomes since 2015)",
        "s3": "Real house prices, 2015 = 100 (Portugal highlighted)",
        "s4": "Portugal: dwellings permitted per year",
        "dash": "Homes vs incomes",
        "series": "series",
        "country": "country_name",
        "source": "Source: Eurostat (prc_hpi_q, prc_hicp_minr, ilc_di03, sts_cobp_a). Built by Guilherme Rigonato · guilhermerigonato.com",
    },
    "pt": {
        "title": "As casas fugiram aos salários em Portugal",
        "subtitle": "Preços das casas e rendimento mediano das famílias, 2015 = 100. Eurostat, dados até ao 2.º trimestre de 2026 (preços) e 2024 (rendimento).",
        "s1": "Portugal: preços das casas vs rendimento das famílias (2015 = 100)",
        "s2": "Índice preço/rendimento, 2024 (acima de 100: os preços subiram mais do que os rendimentos desde 2015)",
        "s3": "Preços reais das casas, 2015 = 100 (Portugal em destaque)",
        "s4": "Portugal: fogos licenciados por ano",
        "dash": "Casas vs rendimentos",
        "series": "series_pt",
        "country": "country_pt",
        "source": "Fonte: Eurostat (prc_hpi_q, prc_hicp_minr, ilc_di03, sts_cobp_a). Feito por Guilherme Rigonato · guilhermerigonato.com",
    },
}

# CSV columns and their Tableau types: (datatype, role, type)
COLS = {
    "prices_vs_income": {
        "geo": "string", "year": "integer", "series": "string", "series_pt": "string", "index_2015": "real",
        "country_name": "string", "country_group": "string", "sort_order": "integer", "country_pt": "string",
        "highlight": "string",
    },
    "affordability": {
        "geo": "string", "year": "integer", "hpi_2015": "real", "income_2015": "real", "price_to_income_index": "real",
        "median_income_eur": "real", "overburden_total": "real", "country_name": "string", "country_group": "string",
        "sort_order": "integer", "country_pt": "string", "highlight": "string",
    },
    "quarterly_prices": {
        "geo": "string", "quarter_start": "date", "nominal_hpi": "real", "real_hpi": "real", "rent_index": "real",
        "country_name": "string", "country_group": "string", "sort_order": "integer", "country_pt": "string",
        "highlight": "string",
    },
    "permits_pt": {
        "geo": "string", "year": "integer", "dwellings_permitted": "real", "country_name": "string",
        "country_group": "string", "sort_order": "integer", "country_pt": "string", "highlight": "string",
    },
}
MEASURES = {"index_2015", "hpi_2015", "income_2015", "price_to_income_index", "median_income_eur", "overburden_total",
            "nominal_hpi", "real_hpi", "rent_index", "dwellings_permitted"}

AMBER = "#d97706"
GREY = "#b8b8b8"


def ds_name(table: str) -> str:
    return f"federated.{table}"


def a(v) -> str:
    return quoteattr(str(v))


def column_def(name: str, datatype: str) -> str:
    if name in MEASURES:
        role, typ = "measure", "quantitative"
    elif datatype in ("integer",) and name == "year":
        role, typ = "dimension", "ordinal"
    elif datatype == "date":
        role, typ = "dimension", "ordinal"
    else:
        role, typ = "dimension", "nominal"
    return f"<column datatype={a(datatype)} name={a(f'[{name}]')} role={a(role)} type={a(typ)} />"


def datasource(table: str) -> str:
    cols = COLS[table]
    rel_cols = "\n".join(
        f"            <column datatype={a(t)} name={a(c)} ordinal={a(i)} />" for i, (c, t) in enumerate(cols.items())
    )
    defs = "\n".join("      " + column_def(c, t) for c, t in cols.items())
    return f"""    <datasource caption={a(table)} inline='true' name={a(ds_name(table))} version='18.1'>
      <connection class='federated'>
        <named-connections>
          <named-connection caption={a(table)} name={a('textscan.' + table)}>
            <connection class='textscan' directory='Data/data' filename={a(table + '.csv')} password='' server='' />
          </named-connection>
        </named-connections>
        <relation connection={a('textscan.' + table)} name={a(table + '.csv')} table={a(f'[{table}#csv]')} type='table'>
          <columns character-set='UTF-8' header='yes' locale='en_GB' separator=','>
{rel_cols}
          </columns>
        </relation>
      </connection>
      <aliases enabled='yes' />
{defs}
    </datasource>"""


class Sheet:
    """One worksheet: rows/cols shelves, a mark type, optional colour, filters and sort."""

    def __init__(self, name, table, rows, cols, mark, color=None, detail=None, filters=(), sort=None, palette=None):
        self.name, self.table, self.rows, self.cols, self.mark = name, table, rows, cols, mark
        self.color, self.detail, self.filters, self.sort, self.palette = color, detail, filters, sort, palette

    # instance names: [none:x:nk] dimension nominal, [none:year:ok] ordinal, [sum:x:qk] measure, [tqr:date:qk] quarter
    def inst(self, spec: str) -> tuple[str, str, str, str]:
        deriv, col = spec.split(":")
        dtype = COLS[self.table][col]
        if deriv == "sum":
            return f"[sum:{col}:qk]", col, "Sum", "quantitative"
        if deriv == "tqr":
            return f"[tqr:{col}:qk]", col, "Quarter-Trunc", "quantitative"
        if dtype == "integer" and col == "year":
            return f"[none:{col}:ok]", col, "None", "ordinal"
        return f"[none:{col}:nk]", col, "None", "nominal"

    def ref(self, spec: str) -> str:
        return f"[{ds_name(self.table)}].{self.inst(spec)[0]}"

    def xml(self) -> str:
        specs = [*self.rows, *self.cols, *[f[0] for f in self.filters]]
        if self.color:
            specs.append(self.color)
        if self.detail:
            specs.append(self.detail)
        if self.sort:
            specs.extend(self.sort)
        seen_cols, deps = set(), []
        for s in dict.fromkeys(specs):
            name, col, deriv, typ = self.inst(s)
            if col not in seen_cols:
                deps.append("            " + column_def(col, COLS[self.table][col]))
                seen_cols.add(col)
            deps.append(f"            <column-instance column={a(f'[{col}]')} derivation={a(deriv)} name={a(name)} pivot='key' type={a(typ)} />")
        filters = []
        for spec, member in self.filters:
            ref = self.ref(spec)
            level = self.inst(spec)[0]
            m = f"&quot;{escape(member)}&quot;" if not str(member).isdigit() and member not in ("true", "false") else member
            filters.append(
                f"          <filter class='categorical' column={a(ref)}>\n"
                f"            <groupfilter function='member' level={a(level)} member='{m}' user:ui-domain='database' user:ui-enumeration='inclusive' user:ui-marker='enumerate' />\n"
                f"          </filter>"
            )
        slices = "".join(f"<column>{escape(self.ref(s))}</column>" for s, _ in self.filters)
        sort = ""
        if self.sort:
            dim, measure = self.sort
            sort = f"\n          <sort class='computed' column={a(self.ref(dim))} direction='DESC' using={a(self.ref(measure))} />"
        enc = ""
        if self.color or self.detail:
            parts = []
            if self.color:
                parts.append(f"<color column={a(self.ref(self.color))} />")
            if self.detail:
                parts.append(f"<lod column={a(self.ref(self.detail))} />")
            enc = "\n              <encodings>" + "".join(parts) + "</encodings>"
        palette = ""
        if self.palette and self.color:
            buckets = "".join(
                f"<map to={a(c)}><bucket>&quot;{escape(v)}&quot;</bucket></map>" for v, c in self.palette.items()
            )
            palette = (
                f"\n        <style>\n          <style-rule element='mark'>\n"
                f"            <encoding attr='color' field={a(self.ref(self.color))} type='palette'>{buckets}</encoding>\n"
                f"          </style-rule>\n        </style>"
            )
        else:
            palette = "\n        <style />"
        rows = " / ".join(escape(self.ref(r)) for r in self.rows)
        cols = " / ".join(escape(self.ref(c)) for c in self.cols)
        return f"""    <worksheet name={a(self.name)}>
      <table>
        <view>
          <datasources>
            <datasource caption={a(self.table)} name={a(ds_name(self.table))} />
          </datasources>
          <datasource-dependencies datasource={a(ds_name(self.table))}>
{chr(10).join(deps)}
          </datasource-dependencies>
{chr(10).join(filters)}{sort}
          <slices>{slices}</slices>
          <aggregation value='true' />
        </view>{palette}
        <panes>
          <pane selection-relaxation-option='selection-relaxation-allow'>
            <view>
              <breakdown value='auto' />
            </view>
            <mark class={a(self.mark)} />{enc}
          </pane>
        </panes>
        <rows>{rows}</rows>
        <cols>{cols}</cols>
      </table>
      <simple-id uuid={a('{' + str(uuid.uuid4()).upper() + '}')} />
    </worksheet>"""


def sheets(t: dict) -> list[Sheet]:
    return [
        Sheet(t["s1"], "prices_vs_income", rows=["sum:index_2015"], cols=["none:year"], mark="Line",
              color=f"none:{t['series']}", filters=[("none:geo", "PT")],
              palette={TEXT_SERIES[t["series"]][0]: AMBER, TEXT_SERIES[t["series"]][1]: "#4b5563"}),
        Sheet(t["s2"], "affordability", rows=[f"none:{t['country']}"], cols=["sum:price_to_income_index"], mark="Bar",
              color="none:highlight", filters=[("none:year", "2024")],
              sort=(f"none:{t['country']}", "sum:price_to_income_index"),
              palette={"Portugal": AMBER, "Other": GREY}),
        Sheet(t["s3"], "quarterly_prices", rows=["sum:real_hpi"], cols=["tqr:quarter_start"], mark="Line",
              color="none:highlight", detail=f"none:{t['country']}", palette={"Portugal": AMBER, "Other": GREY}),
        Sheet(t["s4"], "permits_pt", rows=["sum:dwellings_permitted"], cols=["none:year"], mark="Bar"),
    ]


TEXT_SERIES = {
    "series": ("House prices", "Household income"),
    "series_pt": ("Preços das casas", "Rendimento das famílias"),
}


def dashboard(t: dict, names: list[str]) -> str:
    title = (
        f"<run bold='true' fontcolor='#111827' fontsize='22'>{escape(t['title'])}</run>"
        f"<run>&#10;</run><run fontcolor='#4b5563' fontsize='11'>{escape(t['subtitle'])}</run>"
    )
    src = f"<run fontcolor='#6b7280' fontsize='9'>{escape(t['source'])}</run>"
    zones = [
        f"<zone h='11000' id='3' type-v2='text' w='98000' x='1000' y='1000'><formatted-text>{title}</formatted-text></zone>",
        f"<zone h='41000' id='4' name={a(names[0])} w='48500' x='1000' y='12500' />",
        f"<zone h='41000' id='5' name={a(names[1])} w='48500' x='50500' y='12500' />",
        f"<zone h='41000' id='6' name={a(names[2])} w='48500' x='1000' y='54000' />",
        f"<zone h='41000' id='7' name={a(names[3])} w='48500' x='50500' y='54000' />",
        f"<zone h='3500' id='8' type-v2='text' w='98000' x='1000' y='95500'><formatted-text>{src}</formatted-text></zone>",
    ]
    inner = "\n          ".join(zones)
    return f"""    <dashboard name={a(t['dash'])}>
      <style />
      <size maxheight='900' maxwidth='1200' minheight='900' minwidth='1200' sizing-mode='fixed' />
      <zones>
        <zone h='100000' id='2' type-v2='layout-basic' w='100000' x='0' y='0'>
          {inner}
        </zone>
      </zones>
      <simple-id uuid={a('{' + str(uuid.uuid4()).upper() + '}')} />
    </dashboard>"""


def workbook(lang: str) -> str:
    t = TEXT[lang]
    sh = sheets(t)
    names = [s.name for s in sh]
    windows = "\n".join(f"    <window class='worksheet' name={a(n)} />" for n in names)
    return f"""<?xml version='1.0' encoding='utf-8' ?>
<workbook original-version='18.1' source-build='2024.2.0 (20242.24.0807.0327)' source-platform='mac' version='18.1' xmlns:user='http://www.tableausoftware.com/xml/user'>
  <preferences>
    <preference name='ui.encoding.shelf.height' value='24' />
    <preference name='ui.shelf.height' value='26' />
  </preferences>
  <datasources>
{chr(10).join(datasource(tb) for tb in COLS)}
  </datasources>
  <worksheets>
{chr(10).join(s.xml() for s in sh)}
  </worksheets>
  <dashboards>
{dashboard(t, names)}
  </dashboards>
  <windows source-height='30'>
{windows}
    <window class='dashboard' maximized='true' name={a(t['dash'])} />
  </windows>
</workbook>
"""


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--lang", choices=["en", "pt"], default="en")
    lang = p.parse_args().lang
    xml = workbook(lang)
    stem = "homes_vs_incomes" if lang == "en" else "casas_vs_rendimentos"
    twbx = ROOT / f"{stem}.twbx"
    with zipfile.ZipFile(twbx, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{stem}.twb", xml)
        for f in sorted(DATA.glob("*.csv")):
            z.write(f, f"Data/data/{f.name}")
    print(f"wrote {twbx.name}")


if __name__ == "__main__":
    main()
