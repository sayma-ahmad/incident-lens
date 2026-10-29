import os
from pathlib import Path

import pandas as pd
import psycopg
from dotenv import load_dotenv
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

load_dotenv(ROOT / ".env.loader.local", override=True)

SOURCES = {
    "raw_msolve_incidents": RAW_DIR / "Msolve incident_Oct 26.csv",
    "raw_msolve_service_requests": RAW_DIR / "Msolve service req_Oct 26.csv",
    "raw_alfa_tickets": RAW_DIR / "Alfa_Open_Resolved_Closed Tickets_Oct 26.xlsx",
}

BATCH_SIZE = 1000


def clean_value(value):
    """Keep original values as text and blanks as JSON nulls."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat(sep=" ")

    return str(value)


def clean_record(record):
    return {str(key): clean_value(value) for key, value in record.items()}


def create_tables(cur):
    for table in SOURCES:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                row_id BIGSERIAL PRIMARY KEY,
                source_file TEXT NOT NULL,
                source_sheet TEXT NOT NULL DEFAULT '',
                source_row_number INTEGER NOT NULL,
                record_json JSONB NOT NULL,
                ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (source_file, source_sheet, source_row_number)
            )
        """)


def insert_frame(cur, table, filename, sheet, df):
    sql = f"""
        INSERT INTO {table}
            (source_file, source_sheet, source_row_number, record_json)
        VALUES (%s, %s, %s, %s)
    """

    batch = []
    inserted = 0

    for row_number, record in enumerate(
        df.to_dict(orient="records"), start=2
    ):
        batch.append((
            filename,
            sheet,
            row_number,
            Jsonb(clean_record(record)),
        ))

        if len(batch) >= BATCH_SIZE:
            cur.executemany(sql, batch)
            inserted += len(batch)
            batch.clear()

    if batch:
        cur.executemany(sql, batch)
        inserted += len(batch)

    print(f"  {sheet or 'CSV'}: {inserted:,} rows loaded")
    return inserted


def main():
    for path in SOURCES.values():
        if not path.is_file():
            raise FileNotFoundError(f"Source file not found: {path}")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is required in .env.loader.local"
        )

    with psycopg.connect(database_url, connect_timeout=10) as conn:
        actual_database = conn.execute(
            "SELECT current_database()"
        ).fetchone()[0]

        if actual_database != "mahindra_d114_test":
            raise RuntimeError(
                f"Refusing to load into {actual_database!r}; "
                "expected 'mahindra_d114_test'."
            )
        with conn.cursor() as cur:
            create_tables(cur)

            # These are dedicated staging tables. Reload them from source.
            cur.execute("""
                TRUNCATE TABLE
                    raw_msolve_incidents,
                    raw_msolve_service_requests,
                    raw_alfa_tickets
                RESTART IDENTITY
            """)

            print("Loading MSOLVE incidents...")
            incidents = pd.read_csv(
                SOURCES["raw_msolve_incidents"],
                encoding="cp1252",
                dtype=object,
                keep_default_na=False,
            )
            insert_frame(
                cur, "raw_msolve_incidents",
                SOURCES["raw_msolve_incidents"].name, "", incidents
            )

            print("\nLoading MSOLVE service requests...")
            requests = pd.read_csv(
                SOURCES["raw_msolve_service_requests"],
                encoding="cp1252",
                dtype=object,
                keep_default_na=False,
            )
            insert_frame(
                cur, "raw_msolve_service_requests",
                SOURCES["raw_msolve_service_requests"].name, "", requests
            )

            print("\nLoading Alfa tickets...")
            alfa_path = SOURCES["raw_alfa_tickets"]
            with pd.ExcelFile(alfa_path) as workbook:
                for sheet in workbook.sheet_names:
                    df = pd.read_excel(
                        workbook, sheet_name=sheet, dtype=object
                    )
                    insert_frame(
                        cur, "raw_alfa_tickets",
                        alfa_path.name, sheet, df
                    )

            print("\nVerifying database row counts...")
            for table in SOURCES:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"  {table}: {count:,} rows")

    print("\nRaw data loading completed successfully.")


if __name__ == "__main__":
    main()
