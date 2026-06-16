-- OAuth CSRF state tokens (10-minute TTL, deleted after use)
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  code_verifier TEXT NULL,
  return_to VARCHAR(255) DEFAULT '/dashboard',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oauth_states_expires (expires_at),
  CONSTRAINT fk_oauth_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Extended profile fields for connected accounts (guide-aligned)
ALTER TABLE social_accounts ADD COLUMN platform_user_id VARCHAR(100) NULL;
ALTER TABLE social_accounts ADD COLUMN avatar_url VARCHAR(500) NULL;
ALTER TABLE social_accounts ADD COLUMN scopes VARCHAR(500) NULL;
