CREATE TABLE IF NOT EXISTS incident_feedback (
  id serial PRIMARY KEY,
  incident_id text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('correct', 'wrong', 'split')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_feedback_incident_idx ON incident_feedback (incident_id);

SELECT count(*) AS feedback_rows,
       count(*) FILTER (WHERE incident_id NOT IN (SELECT id FROM incident)) AS orphan_rows
FROM incident_feedback;
