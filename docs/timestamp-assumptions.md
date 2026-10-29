# Data Normalization: Timestamp Assumptions

## Confirmed timezone rule

Confirmed by Sayma: interpret all timezone-naive timestamps as IST (Asia/Kolkata).

## Source-specific handling

- Alfa Closed - Created On: values with the explicit Z suffix are UTC.
- Alfa Open - Created On: interpret as IST.
- Alfa Resolved - Created On: interpret as IST.
- Alfa Closed - Closed On: interpret as IST.
- MSOLVE incident timestamps, including sys_created_on, resolved_at and closed_at: interpret as IST.
- MSOLVE service request due_date: interpret as IST.

## Missing values

Missing timestamps must remain NULL. Do not invent replacement dates or times.

## Data integrity

Keep original source exports unchanged. Preserve source sheet and original ticket identifiers during normalization.

## Reporting

Use consistent timezone-aware timestamps for comparisons and reporting. Keep this assumption documented because timezone-naive source values do not independently identify their timezone.
