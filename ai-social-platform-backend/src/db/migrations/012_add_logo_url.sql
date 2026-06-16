-- Reusable brand logo asset per user
ALTER TABLE users ADD COLUMN logo_url VARCHAR(500) NULL;
