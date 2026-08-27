-- Platform target + media attachments for posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform VARCHAR(50) NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;
