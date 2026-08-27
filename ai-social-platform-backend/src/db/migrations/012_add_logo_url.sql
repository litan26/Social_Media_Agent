-- Reusable brand logo asset per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) NULL;
