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
        password_hash VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        nickname VARCHAR,
        email_verified_at TIMESTAMP,
        subscription_tier VARCHAR DEFAULT 'trial',
        subscription_expires_at TIMESTAMP,
        trial_ends_at TIMESTAMP,
        generations_used INTEGER DEFAULT 0,
        generations_limit INTEGER DEFAULT 50,
        daily_generations_used INTEGER DEFAULT 0,
        last_generation_date VARCHAR,
        last_login_at TIMESTAMP,
        is_admin BOOLEAN DEFAULT false,
        marketing_consent BOOLEAN DEFAULT false,
        marketing_consent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE esoteric_planner.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR`);
    await pool.query(`ALTER TABLE esoteric_planner.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`);
    await pool.query(`ALTER TABLE esoteric_planner.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`);
    await pool.query(`ALTER TABLE esoteric_planner.users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE esoteric_planner.users ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP`);
    
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
    
    console.log("Creating promocodes table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.promocodes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        code VARCHAR UNIQUE NOT NULL,
        bonus_days INTEGER NOT NULL DEFAULT 30,
        max_uses INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        promocode_type VARCHAR DEFAULT 'bonus',
        discount_percent INTEGER,
        discount_plan_type VARCHAR,
        bonus_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE esoteric_planner.promocodes ADD COLUMN IF NOT EXISTS promocode_type VARCHAR DEFAULT 'bonus'`);
    await pool.query(`ALTER TABLE esoteric_planner.promocodes ADD COLUMN IF NOT EXISTS discount_percent INTEGER`);
    await pool.query(`ALTER TABLE esoteric_planner.promocodes ADD COLUMN IF NOT EXISTS discount_plan_type VARCHAR`);
    await pool.query(`ALTER TABLE esoteric_planner.promocodes ADD COLUMN IF NOT EXISTS bonus_until TIMESTAMP`);
    
    console.log("Creating promocode_usages table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.promocode_usages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        promocode_id VARCHAR NOT NULL REFERENCES esoteric_planner.promocodes(id),
        user_id VARCHAR NOT NULL REFERENCES esoteric_planner.users(id),
        used_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating payments table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR NOT NULL REFERENCES esoteric_planner.users(id),
        order_id VARCHAR NOT NULL,
        amount VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'pending',
        plan_type VARCHAR NOT NULL,
        prodamus_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Creating newsletter_logs table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.newsletter_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        subject TEXT NOT NULL,
        segment VARCHAR NOT NULL,
        marketing_only BOOLEAN NOT NULL DEFAULT true,
        sent INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        opens INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("Creating newsletter_log_recipients table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.newsletter_log_recipients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        log_id VARCHAR NOT NULL REFERENCES esoteric_planner.newsletter_logs(id) ON DELETE CASCADE,
        email VARCHAR NOT NULL,
        first_name VARCHAR,
        status VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("Creating newsletter_events table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.newsletter_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        log_id VARCHAR NOT NULL REFERENCES esoteric_planner.newsletter_logs(id) ON DELETE CASCADE,
        email VARCHAR NOT NULL,
        event_type VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_newsletter_event UNIQUE (log_id, email, event_type)
      )
    `);

    console.log("Creating security_events table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esoteric_planner.security_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        event_type VARCHAR NOT NULL,
        email VARCHAR,
        ip_address VARCHAR,
        user_agent TEXT,
        reason VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON esoteric_planner.security_events (event_type, created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_security_events_email ON esoteric_planner.security_events (email)`);

    console.log("Database schema and tables created successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase();
