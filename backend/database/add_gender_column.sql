ALTER TABLE students
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students
ADD CONSTRAINT students_gender_check
CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'));
