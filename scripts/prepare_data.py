import csv
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
DATE_FORMAT_IDS = set(range(14, 23)) | {45, 46, 47}
EXCEL_EPOCH = datetime(1899, 12, 30)

ALFA_SHEETS = {
    "Open Tickets_Oct 26": "alert_open.csv",
    "Resolved Tickets_Oct 26": "alert_resolved.csv",
    "Closed Tickets_Oct 26": "alert_closed.csv",
}


def find(source: Path, pattern: str) -> Path:
    matches = sorted(source.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No file matching {pattern!r} in {source}")
    return matches[0]


def unescape(text: str) -> str:
    return re.sub(r"_x([0-9A-Fa-f]{4})_", lambda m: chr(int(m.group(1), 16)), text)


def date_styles(z: zipfile.ZipFile) -> set[int]:
    root = ET.fromstring(z.read("xl/styles.xml"))
    custom = {}
    fmts = root.find("m:numFmts", NS)
    if fmts is not None:
        for f in fmts.findall("m:numFmt", NS):
            code = re.sub(r'"[^"]*"|\[[^\]]*\]', "", f.get("formatCode", "")).lower()
            custom[int(f.get("numFmtId"))] = bool(re.search(r"[dmyhs]", code))
    styles = set()
    xfs = root.find("m:cellXfs", NS)
    for i, xf in enumerate(xfs.findall("m:xf", NS) if xfs is not None else []):
        fid = int(xf.get("numFmtId", "0"))
        if fid in DATE_FORMAT_IDS or custom.get(fid):
            styles.add(i)
    return styles


def serial_to_text(value: str) -> str:
    moment = EXCEL_EPOCH + timedelta(days=float(value))
    moment = (moment + timedelta(milliseconds=500)).replace(microsecond=0)
    return moment.strftime("%d-%m-%Y %H:%M:%S")


def read_xlsx(path: Path, convert_dates: bool):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append(unescape("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))))
    dates = date_styles(z) if convert_dates else set()
    rels = {
        r.get("Id"): r.get("Target")
        for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    }
    for sheet in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", NS):
        target = rels[sheet.get(REL)].lstrip("/")
        target = target if target.startswith("xl/") else f"xl/{target}"
        rows = []
        for _, el in ET.iterparse(z.open(target)):
            if not el.tag.endswith("}row"):
                continue
            row = {}
            for c in el.findall("m:c", NS):
                col = re.match(r"[A-Z]+", c.get("r")).group()
                v = c.find("m:v", NS)
                kind = c.get("t")
                if kind == "inlineStr":
                    val = unescape("".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t")))
                elif v is None:
                    val = ""
                elif kind == "s":
                    val = shared[int(v.text)]
                elif kind is None and int(c.get("s", "0")) in dates:
                    val = serial_to_text(v.text)
                else:
                    val = v.text
                row[col] = val
            rows.append(row)
            el.clear()
        yield sheet.get("name"), rows


def write_rows(rows, out: Path) -> int:
    cols = list(rows[0].keys())
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow([r.get(c, "") for c in cols])
    return len(rows) - 1


def convert_csv(src: Path, out: Path) -> int:
    raw = src.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    rows = list(csv.reader(text.splitlines(keepends=True)))
    with out.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)
    return len(rows) - 1


def convert_any(src: Path, out: Path) -> int:
    if src.suffix.lower() == ".xlsx":
        _, rows = next(read_xlsx(src, convert_dates=True))
        return write_rows(rows, out)
    return convert_csv(src, out)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else root.parent / "data-csv"
    target.mkdir(parents=True, exist_ok=True)

    counts = {}
    alfa = find(source, "Alfa_Open_Resolved_Closed*.xlsx")
    for name, rows in read_xlsx(alfa, convert_dates=False):
        if name in ALFA_SHEETS:
            counts[ALFA_SHEETS[name]] = write_rows(rows, target / ALFA_SHEETS[name])
    counts["msolve_incident.csv"] = convert_any(find(source, "Msolve incident*"), target / "msolve_incident.csv")
    counts["msolve_sr.csv"] = convert_any(find(source, "Msolve service req*"), target / "msolve_sr.csv")

    for name, n in counts.items():
        print(f"{name}: {n:,} rows")
    print(f"Output: {target}")


if __name__ == "__main__":
    main()
