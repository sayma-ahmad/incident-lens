# Raw Data Loading Guide

## Purpose

This guide documents the local raw-data loading process for the Incident Lens POC. Deployment and external-system integration are outside the current scope.

## Requirements

- Python
- PostgreSQL
- The source CSV and Excel files supplied for the POC

## Python setup

Run these commands from the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

## Source files

Place the supplied files in `data/raw/` with these exact names:

- `Msolve incident_Oct 26.csv`
- `Msolve service req_Oct 26.csv`
- `Alfa_Open_Resolved_Closed Tickets_Oct 26.xlsx`

Do not commit customer source data to Git.

## Database configuration

Create a local `.env.loader.local` file containing `DATABASE_URL` for the dedicated replay database.

The loader is restricted to the database named `mahindra_d114_test`. It must not be used to reload the populated `mahindra_poc` database.

Do not commit local environment files or database credentials.

## Load raw data

From the repository root, run:

```powershell
.\.venv\Scripts\python.exe .\src\load_raw_data.py
```

The loader creates the raw staging tables if necessary, reloads their data, and prints the row counts.

Expected counts:

| Raw table | Expected rows |
|---|---:|
| `raw_msolve_incidents` | 2,573 |
| `raw_msolve_service_requests` | 641 |
| `raw_alfa_tickets` | 56,713 |

The loader truncates these three staging tables before reloading them. Run it only against the dedicated replay database.
