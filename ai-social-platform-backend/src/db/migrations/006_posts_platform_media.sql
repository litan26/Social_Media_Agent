-- Platform target + media attachments for posts
ALTER TABLE posts ADD COLUMN platform VARCHAR(50) NULL AFTER user_id;
ALTER TABLE posts ADD COLUMN media_urls JSON DEFAULT (JSON_ARRAY());
