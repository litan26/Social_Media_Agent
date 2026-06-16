-- Phone number for user accounts (registration & profile).

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL AFTER email;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
