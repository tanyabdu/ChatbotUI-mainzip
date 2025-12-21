import pg from "pg";

const host = process.env.EXTERNAL_DB_HOST;
const port = process.env.EXTERNAL_DB_PORT;
const database = process.env.EXTERNAL_DB_NAME;
const user = process.env.EXTERNAL_DB_USER;
const password = process.env.EXTERNAL_DB_PASSWORD;

if (!host || !password) {
  console.error("External database configuration missing");
  process.exit(1);
}

const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

async function initDatabase() {
  const pool = new pg.Pool({ connectionString });
  
  try {
    console.log("Creating schema esoteric_planner if not exists...");
    await pool.query('CREATE SCHEMA IF NOT EXISTS esoteric_planner');
    
    console.log("Creating sessions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON esoteric_planner.sessions (expire)');
    
    console.log("Creating users table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        nickname VARCHAR,
        subscription_tier VARCHAR DEFAULT 'trial',
        subscription_expires_at TIMESTAMP,
        trial_ends_at TIMESTAMP,
        generations_used INTEGER DEFAULT 0,
        generations_limit INTEGER DEFAULT 50,
        daily_generations_used INTEGER DEFAULT 0,
        last_generation_date VARCHAR,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating content_strategies table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.content_strategies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR REFERENCES esoteric_planner.users(id),
        topic TEXT NOT NULL,
        goal TEXT NOT NULL,
        days INTEGER NOT NULL DEFAULT 7,
        posts JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating archetype_results table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.archetype_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR REFERENCES esoteric_planner.users(id),
        archetype_name TEXT NOT NULL,
        archetype_description TEXT NOT NULL,
        answers JSONB NOT NULL,
        recommendations JSONB NOT NULL,
        brand_colors JSONB,
        brand_fonts JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating voice_posts table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.voice_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR REFERENCES esoteric_planner.users(id),
        original_text TEXT NOT NULL,
        refined_text TEXT NOT NULL,
        tone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating case_studies table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.case_studies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR REFERENCES esoteric_planner.users(id),
        review_text TEXT NOT NULL,
        before TEXT,
        action TEXT,
        after TEXT,
        tags JSONB NOT NULL,
        generated_headlines JSONB,
        generated_quote TEXT,
        generated_body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating sales_trainer_samples table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.sales_trainer_samples (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_question TEXT NOT NULL,
        expert_draft TEXT,
        improved_answer TEXT NOT NULL,
        coach_feedback TEXT,
        pain_type VARCHAR,
        tags JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating sales_trainer_sessions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.sales_trainer_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR REFERENCES esoteric_planner.users(id),
        client_question TEXT NOT NULL,
        expert_draft TEXT NOT NULL,
        improved_answer TEXT NOT NULL,
        pain_type VARCHAR,
        offer_type VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Database schema and tables created successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase();
