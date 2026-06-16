-- Claude-generated insights for the generate prompt feedback loop
ALTER TABLE user_preferences ADD COLUMN ai_insights JSON DEFAULT (JSON_OBJECT());
