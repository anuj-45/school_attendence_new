-- Combined database schema and migrations for PostgreSQL
-- Apply this in Railway once your DATABASE_URL is configured.

-- 1. Base schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
  class_grade VARCHAR(50) NULL,
  division VARCHAR(20) NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  roll_number VARCHAR(50) NOT NULL,
  "class" VARCHAR(50) NOT NULL,
  class_grade VARCHAR(50) NOT NULL,
  division VARCHAR(20) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  teacher_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT students_roll_class_unique UNIQUE (roll_number, "class")
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
  date DATE NOT NULL,
  marked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_student_date_unique UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_class ON students("class");
CREATE INDEX IF NOT EXISTS idx_students_grade_division ON students(class_grade, division);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_users_grade_division ON users(class_grade, division);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);

-- 2. Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Add admission number field
ALTER TABLE students
ADD COLUMN IF NOT EXISTS admission_no VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_admission_no_unique
ON students(admission_no)
WHERE admission_no IS NOT NULL;

-- 4. Email settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_pass VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NULL,
  sender_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Add gender column to students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students
ADD CONSTRAINT students_gender_check
CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'));

-- 6. Add class_grade and division columns to users and students
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

-- 7. Messaging tables
CREATE TABLE IF NOT EXISTS messaging_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  subject VARCHAR(255) NULL,
  body TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messaging_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NULL REFERENCES students(id) ON DELETE SET NULL,
  parent_email VARCHAR(255) NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMP WITHOUT TIME ZONE NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Optional Supabase-only row-level security policies
-- Uncomment only if you are using Supabase auth and/or RLS.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- 
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'allow_all_users_service_role'
--   ) THEN
--     CREATE POLICY allow_all_users_service_role ON users
--       FOR ALL
--       USING (auth.role() = 'service_role')
--       WITH CHECK (auth.role() = 'service_role');
--   END IF;
-- END $$;
-- 
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'allow_all_students_service_role'
--   ) THEN
--     CREATE POLICY allow_all_students_service_role ON students
--       FOR ALL
--       USING (auth.role() = 'service_role')
--       WITH CHECK (auth.role() = 'service_role');
--   END IF;
-- END $$;
-- 
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'allow_all_attendance_service_role'
--   ) THEN
--     CREATE POLICY allow_all_attendance_service_role ON attendance
--       FOR ALL
--       USING (auth.role() = 'service_role')
--       WITH CHECK (auth.role() = 'service_role');
--   END IF;
-- END $$;
