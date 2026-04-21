ALTER TABLE students ADD COLUMN IF NOT EXISTS school_udise VARCHAR(64);

-- Optionally backfill existing students to a default value if needed.
