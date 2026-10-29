# Incident Lens POC: Demo and Execution Script

## Scope

Incident Lens is a local, read-only proof of concept for source-ticket inspection, cross-system mapping, data-quality reporting, and baseline analysis.

Deployment and external-system integration are outside the current scope. Fallback links must not be described as confirmed duplicates.

## 1. Application Setup

From the repository root, run these commands separately:

```powershell
npm ci
npm run typecheck
npm run build
```

Start the local application:

```powershell
npm run dev
```

Open `http://localhost:3000` in the browser.

The application requires a valid `DATABASE_URL` in `.env.local`. Never expose credentials, connection strings, customer source files, or database dumps.

## 2. Optional Fresh-Data Replay

Only run the replay against the dedicated local PostgreSQL database `mahindra_d114_test`.

Confirm these files exist in `data/raw/`:

- `Msolve incident_Oct 26.csv`
- `Msolve service req_Oct 26.csv`
- `Alfa_Open_Resolved_Closed Tickets_Oct 26.xlsx`

Confirm `.env.loader.local` targets `mahindra_d114_test`, then run:

```powershell
.\.venv\Scripts\python.exe .\src\load_raw_data.py
```

In pgAdmin, open Query Tool for `mahindra_d114_test` and verify the selected database before running SQL.

Execute the following scripts individually, in this order:

1. `src/normalize_data.sql`
2. `src/create_ticket_links.sql`
3. `src/insert_fallback_links.sql`
4. `src/insert_incident_number_links.sql`
5. `src/create_ticket_view.sql`
6. `src/validate_data_replay.sql`

**Safety:** `normalize_data.sql` drops and recreates derived objects. Never run it against the populated `mahindra_poc` database. Use `validate_data_replay.sql` for fresh replay validation.

The web application uses the database configured in `.env.local`. Loading data into the replay database does not automatically change the application's database target.

## 3. Browser Walkthrough

### Home

Open `/`. Introduce Incident Lens as a local proof of concept for exploring source tickets, mapping results, and baseline reports.

### Source Tickets

Open `/tickets`. Demonstrate the available filters, then open a ticket detail page to inspect its source record and any linked ticket.

Previously verified example:

- MSOLVE incident: `INC3598326`
- Alfa ticket: `IMSN9603183`
- Match method: `numeric_correlation_id`
- Confidence: high

### Data and Mapping Report

Open `/reports/data`. Show source counts, correlation-ID coverage, mapping results, unmatched incidents, and data-quality limitations.

Explain the difference between exact correlation-ID matches and low-confidence fallback matches.

### Baseline Report

Open `/reports/baseline`. Demonstrate daily ticket volumes, busiest 15-minute periods, repeated subjects, and department volumes.

## 4. Recorded Replay Results

| Check | Recorded result |
|---|---:|
| Raw MSOLVE incidents | 2,573 |
| Raw MSOLVE service requests | 641 |
| Normalized Alfa tickets | 56,713 |
| Combined ticket view | 59,927 |
| Numeric correlation-ID links | 936 |
| Prefixed correlation-ID links | 55 |
| Total exact correlation-ID links | 991 |
| Low-confidence subject/time fallback links | 1,391 |
| Incidents with at least one link | 2,382 |
| Unmatched incidents | 191 |

The recorded replay validation reported 19 checks: 18 PASS and one REVIEW for 31 Alfa ticket IDs with duplicate occurrences. No FAIL checks were reported in that run.

Known limitations:

- 62 MSOLVE incidents have missing `resolved_at` values.
- 277 MSOLVE incidents have missing `closed_at` values.
- All 641 service requests lack source `created_on` timestamps.
- Fallback reconciliation differs from the previous POC: 1,314 shared pairs, 17 previous-only pairs, and 77 new-only pairs.
- The Rule 3 audit found no additional eligible pairs to insert.

Do not delete repeated source rows or invent missing timestamps. Fallback matches remain candidates, not confirmed duplicates.

## 5. Closing Statement

The POC demonstrates local ticket inspection, cross-system mapping, data-quality reporting, and baseline analysis. Mapping limitations and unresolved fallback differences remain documented for review.

Deployment and external-system integration are not included.