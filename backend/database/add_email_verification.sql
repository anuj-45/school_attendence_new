-- Add is_verified column to users and create email_verifications table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  last_sent_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
