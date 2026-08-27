-- Claude-generated insights for the generate prompt feedback loop
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'::jsonb;
