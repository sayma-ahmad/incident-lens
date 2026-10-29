# Incident Lens POC â€” Developer 1 Handover

## 1. Project Scope

Developer 1 owns data preparation, ticket mapping, source ticket screens,
data-quality reports, baseline reports, validation and handover.

Deployment and external-system integration are outside the current scope.

## 2. Task Status

- D1.1: Source CSV preparation completed.
- D1.2: Existing raw tables reused; the five-table design in the task plan
  differs from the current three-table JSONB-based implementation.
- D1.3: Clean ticket tables created.
- D1.4: Exact correlation-ID mapping implemented and reconciled.
- D1.5: Fallback mapping implemented; differences from the previous POC
  remain documented for review.
- D1.6: Combined ticket_view created.
- D1.7: Ticket and report APIs implemented and tested.
- D1.8: Ticket list screen tested in the browser.
- D1.9: Ticket detail screen tested in the browser.
- D1.10: Data and mapping report screen tested.
- D1.11: Baseline report screen tested.
- D1.12: Home page and navigation tested.
- D1.13: Validation SQL executed successfully.
- D1.14: Blocked pending an agreed integration decision. Fresh-database replay completed, but cross-branch Incidents and Scorecard integration remains unresolved.

## 3. Verified Source Counts

| Source | Records |
|---|---:|
| MSOLVE incidents | 2,573 |
| MSOLVE service requests | 641 |
| Alfa Open | 183 |
| Alfa Resolved | 892 |
| Alfa Closed | 55,638 |
| Total | 59,927 |

Prepared CSV files are in data/processed/.
Original exports are retained in data/raw/.

## 4. Database Objects

Raw tables reused from the previous POC:
- raw_msolve_incidents
- raw_msolve_service_requests
- raw_alfa_tickets

Clean tables:
- msolve_incident
- msolve_sr
- alfa_ticket

Mapping and reporting objects:
- ticket_link
- ticket_view

## 5. Ticket Mapping Results

Exact correlation-ID mapping:
- Numeric ID links: 936
- Full prefixed-ID links: 55
- Total exact links: 991
- All 991 exact pairs match the previous POC results.

Fallback mapping:
- Previous POC candidate pairs: 1,331
- Current fallback links: 1,391
- Shared pairs: 1,314
- Previous-only pairs: 17
- New-only pairs: 77

The 17 previous-only pairs were replaced by closer timestamp candidates.
The 77 new-only pairs came from Alfa Resolved records.

Fallback links remain low-confidence candidates, not confirmed duplicates.
The differences must be reviewed before claiming mapping accuracy.

Current summary:
- Total MSOLVE incidents: 2,573
- Incidents with at least one link: 2,382
- Unmatched incidents: 191
- Duplicate link pairs: 0

## 6. Timestamp Rules

Sayma confirmed that timezone-naive timestamps should be interpreted as
IST (Asia/Kolkata).

Alfa Closed Created On values with an explicit Z suffix are interpreted as UTC.
Missing source timestamps remain NULL.
MSOLVE service requests do not have a source creation timestamp; due_date
must not be substituted for created_on.

Detailed rules are in docs/timestamp-assumptions.md.

## 7. Known Data-Quality Items

- 31 Alfa ticket IDs have duplicate occurrences across source rows.
- 62 MSOLVE incidents have missing resolved_at values.
- 277 MSOLVE incidents have missing closed_at values.
- All 641 service requests have unavailable created_on values in ticket_view.
- Fallback mapping differences remain under review.

Do not delete duplicate source rows or invent missing timestamps without
an approved rule and supporting evidence.

## 8. Important Project Files

- src/prepare_data.py
- src/normalize_data.sql
- src/create_ticket_links.sql
- src/insert_fallback_links.sql
- src/create_ticket_view.sql
- src/validate_data_replay.sql
- src/app/api/[[...slugs]]/elysia.ts
- src/app/tickets/page.tsx
- src/app/tickets/[id]/page.tsx
- src/app/reports/data/page.tsx
- src/app/reports/baseline/page.tsx
- src/app/page.tsx
- docs/timestamp-assumptions.md

## 9. Local Commands

From the project root, run npm ci to install dependencies.

Use npm run typecheck to check TypeScript.
Use npm run build to create a production build.
Use npm run start to run the production build locally.

The application requires a valid DATABASE_URL in .env.local.
Never commit credentials, company source data or database dumps.

The principal pages and APIs have been tested locally.
The known ticket pair INC3598326 and IMSN9603183 was verified.
- Production smoke tests: Health, Tickets, Data Report, Baseline Report, and Known Ticket APIs all returned HTTP 200 after the final production build.
- Data Report correlation-ID metrics corrected and verified: 991 matched and 87 unmatched incidents with non-empty correlation IDs; low-confidence fallback links are excluded.

## 10. Fresh Replay Verification and Remaining Work

Fresh replay completed successfully in the separate local PostgreSQL database
`mahindra_d114_test` on 27 October 2026. The existing `mahindra_poc` database
was not used as the replay target.

The current repository includes the loader at src/load_raw_data.py. It reads .env.loader.local and checks that the target database is mahindra_d114_test. It reloads three raw staging tables. Setup instructions are in docs/data-loading.md, and the replay sequence and walkthrough are in docs/demo-script.md.

Verified replay results:
- Raw MSOLVE incidents: 2,573
- Raw MSOLVE service requests: 641
- Raw Alfa tickets: 56,713
- Normalized rows: 2,573 incidents, 641 service requests, 56,713 Alfa tickets
- Combined ticket_view: 59,927 rows
- Exact mapping: 991 links; pair-by-pair comparison with previous POC passed
- Fallback mapping: 1,391 low-confidence links
- Incidents with any link: 2,382
- Unmatched incidents: 191
- Duplicate link pairs: 0

Fresh replay validation returned 19 checks: 18 PASS and one REVIEW for the
31 known Alfa ticket IDs with duplicate occurrences. No FAIL checks were
reported. Missing resolved_at (62), closed_at (277), and service-request
created_on values (641) were preserved as source-data limitations.

Fallback reconciliation:
- Previous POC candidate pairs: 1,331
- Fresh replay fallback links: 1,391
- Shared pairs: 1,314
- Previous-only pairs: 17
- New-only pairs: 77

Fallback links remain low-confidence candidates and must not be described as
confirmed duplicates. Review the 17 previous-only and 77 new-only pairs, and
confirm with the PM whether the raw-table structure deviation is acceptable.

The normalization SQL drops and recreates derived objects before rebuilding them. This is destructive. Run it only against the dedicated mahindra_d114_test database after verifying the selected database. Never run it against mahindra_poc.
The previous validation script was removed because it depended on comparison tables from the old POC. Use `src/validate_data_replay.sql` for fresh-database checks; it does not depend on those historical tables.

### Review Point D1-14: Navigation & Cross-Branch Page Integration
- Shared navigation (`src/components/site-navigation.tsx`) currently contains only verified, working `dev1` routes (`/`, `/tickets`, `/reports/data`, `/reports/baseline`).
- The Incidents (`/incidents`, `/incidents/[id]`) and Scorecard (`/scorecard`) pages exist on `origin/dev2`, but depend on a separate alert-grouping schema, `sql/dev2/` migrations, components (`src/components/incidents/`), OpenRouter AI services, and tables (`incident_group`, `incident_alert`, `incident_feedback`, `alert_event`).
- In accordance with review rules, links to routes that do not exist on `dev1` must not be added to the navigation.
- D1-14 is marked as blocked pending an agreed integration decision regarding how to reconcile the D1 and D2 schemas and pipelines, rather than being marked complete.
## 11. Deployment

Deployment and external-system integration are not included in the current
scope. Keep the POC local unless the PM changes the scope.
