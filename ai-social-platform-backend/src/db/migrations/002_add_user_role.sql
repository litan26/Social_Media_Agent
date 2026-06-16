-- Add role column for existing databases

ALTER TABLE users
  ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER password_hash;

UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';
