-- Composite indexes for user_id-scoped queries (avoid full table scans at scale)
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created ON posts(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_updated ON post_analytics(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
