-- Add role column for existing databases

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';
