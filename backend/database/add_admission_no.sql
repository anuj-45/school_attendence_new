ALTER TABLE students
ADD COLUMN IF NOT EXISTS admission_no VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_admission_no_unique
ON students(admission_no)
WHERE admission_no IS NOT NULL;
