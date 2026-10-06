-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ai_config JSONB
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  prd_doc_id TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  interview JSONB
);

-- PRDs
CREATE TABLE IF NOT EXISTS prds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT,
  version TEXT,
  status TEXT,
  owner_name TEXT,
  target_release_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  stitch_prompt_spec TEXT,
  sections JSONB NOT NULL,
  user_stories JSONB NOT NULL,
  revisions JSONB,
  comments JSONB,
  integration_logs JSONB
);
