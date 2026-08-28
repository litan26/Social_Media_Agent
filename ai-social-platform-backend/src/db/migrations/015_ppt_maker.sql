-- AI PPT Maker Schema Migration

CREATE TABLE IF NOT EXISTS presentations (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  topic TEXT,
  industry VARCHAR(100) DEFAULT 'Business',
  style VARCHAR(100) DEFAULT 'Modern',
  color_theme JSONB DEFAULT '{"name": "Teal", "primary": "#0F766E", "secondary": "#14B8A6", "accent": "#F59E0B", "bg": "#F8FAFC", "text": "#0F172A"}'::jsonb,
  ratio VARCHAR(20) DEFAULT '16:9',
  audience VARCHAR(100) DEFAULT 'General Audience',
  tone VARCHAR(100) DEFAULT 'Professional',
  language VARCHAR(50) DEFAULT 'English',
  length_category VARCHAR(20) DEFAULT 'Informative',
  additional_instructions TEXT,
  source_type VARCHAR(50) DEFAULT 'topic',
  source_filename VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ready',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_presentations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presentation_slides (
  id SERIAL PRIMARY KEY,
  presentation_id INT NOT NULL,
  position INT NOT NULL,
  layout VARCHAR(50) NOT NULL DEFAULT 'title_content',
  title TEXT,
  subtitle TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  visuals JSONB DEFAULT '{}'::jsonb,
  speaker_notes TEXT DEFAULT '',
  styling JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_slides_presentation FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_presentations_user_created ON presentations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_position ON presentation_slides(presentation_id, position);

DROP TRIGGER IF EXISTS trg_presentations_updated_at ON presentations;
CREATE TRIGGER trg_presentations_updated_at BEFORE UPDATE ON presentations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_slides_updated_at ON presentation_slides;
CREATE TRIGGER trg_slides_updated_at BEFORE UPDATE ON presentation_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
