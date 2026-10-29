CREATE TABLE IF NOT EXISTS raw_msolve_incidents (
  row_id bigserial PRIMARY KEY,
  source_file text NOT NULL,
  source_sheet text NOT NULL DEFAULT '',
  source_row_number integer NOT NULL,
  record_json jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_file, source_sheet, source_row_number)
);

CREATE TABLE IF NOT EXISTS raw_msolve_service_requests (
  row_id bigserial PRIMARY KEY,
  source_file text NOT NULL,
  source_sheet text NOT NULL DEFAULT '',
  source_row_number integer NOT NULL,
  record_json jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_file, source_sheet, source_row_number)
);

CREATE TABLE IF NOT EXISTS raw_alfa_tickets (
  row_id bigserial PRIMARY KEY,
  source_file text NOT NULL,
  source_sheet text NOT NULL DEFAULT '',
  source_row_number integer NOT NULL,
  record_json jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_file, source_sheet, source_row_number)
);
