-- Platform-specific identifiers that do not fit the generic token columns.
-- Facebook stores the selected Page id plus its non-expiring Page access token;
-- Instagram stores the IG Business/Creator user id used for publishing.
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
