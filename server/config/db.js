const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const query = (text, params) => pool.query(text, params);

async function initDB() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      overall_score FLOAT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      question_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
      relevance FLOAT DEFAULT 0,
      clarity FLOAT DEFAULT 0,
      depth FLOAT DEFAULT 0,
      structure FLOAT DEFAULT 0,
      confidence FLOAT DEFAULT 0,
      feedback TEXT,
      star_situation FLOAT DEFAULT 0,
      star_task FLOAT DEFAULT 0,
      star_action FLOAT DEFAULT 0,
      star_result FLOAT DEFAULT 0,
      star_tips TEXT,
      confidence_score FLOAT DEFAULT 0,
      confidence_issues JSONB DEFAULT '[]',
      confidence_suggestions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    console.log('✅ Database tables ready');
}

module.exports = { query, initDB, pool };
