ALTER TABLE users
ADD COLUMN IF NOT EXISTS class_grade VARCHAR(50);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS division VARCHAR(20);

ALTER TABLE students
ADD COLUMN IF NOT EXISTS class_grade VARCHAR(50);

ALTER TABLE students
ADD COLUMN IF NOT EXISTS division VARCHAR(20);

UPDATE students
SET class_grade = COALESCE(NULLIF(class_grade, ''), split_part("class", '-', 1))
WHERE class_grade IS NULL OR class_grade = '';

UPDATE students
SET division = COALESCE(NULLIF(division, ''), upper(split_part("class", '-', 2)))
WHERE division IS NULL OR division = '';

CREATE INDEX IF NOT EXISTS idx_students_grade_division ON students(class_grade, division);
CREATE INDEX IF NOT EXISTS idx_users_grade_division ON users(class_grade, division);
