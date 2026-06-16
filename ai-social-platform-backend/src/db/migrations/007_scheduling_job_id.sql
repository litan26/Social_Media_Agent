-- BullMQ job reference for cancel / reschedule
ALTER TABLE scheduled_posts ADD COLUMN job_id VARCHAR(255) NULL AFTER status;

-- Posts can be in scheduled state while waiting for publish
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_status;
ALTER TABLE posts ADD CONSTRAINT chk_posts_status
  CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));

CREATE INDEX idx_scheduled_posts_job_id ON scheduled_posts(job_id);
