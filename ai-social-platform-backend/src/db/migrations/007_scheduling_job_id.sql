-- Background-job reference for cancel / reschedule.
-- Retained for schema compatibility; currently always NULL (no job queue).
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS job_id VARCHAR(255) NULL;

-- Posts can be in scheduled state while waiting for publish
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_status;
ALTER TABLE posts ADD CONSTRAINT chk_posts_status
  CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_job_id ON scheduled_posts(job_id);
