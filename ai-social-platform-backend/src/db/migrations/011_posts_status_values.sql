-- Allow scheduled and approval statuses for posts
ALTER TABLE posts DROP CHECK chk_posts_status;
ALTER TABLE posts ADD CONSTRAINT chk_posts_status CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'published', 'failed'));
