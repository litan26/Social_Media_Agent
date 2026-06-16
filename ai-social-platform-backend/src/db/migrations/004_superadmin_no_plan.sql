-- Superadmins manage the platform and are not on a subscription plan.

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_plan;

ALTER TABLE users MODIFY plan VARCHAR(20) NULL DEFAULT 'free';

ALTER TABLE users ADD CONSTRAINT chk_users_plan CHECK (
  plan IS NULL OR plan IN ('free', 'pro', 'team')
);

UPDATE users SET plan = NULL WHERE role = 'superadmin';
