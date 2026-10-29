# Incident Lens POC: Demo and Execution Script

## Scope

Incident Lens is a local, read-only proof of concept for source-ticket inspection, cross-system mapping, data-quality reporting, and baseline analysis.

Deployment and external-system integration are outside the current scope. Fallback links must not be described as confirmed duplicates.

## 1. Application Setup

From the repository root, run:

```powershell
npm ci
npm run typecheck
npm run build
npm run dev