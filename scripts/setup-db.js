require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("🔧 [1/4] Creating users table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("🔧 [2/4] Ensuring clients.telegram_chat_id column...");
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR;
    `);

    console.log("🔧 [3/4] Ensuring alert_cases table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_cases (
        id SERIAL PRIMARY KEY,
        alert_hash VARCHAR(64),
        host_ip VARCHAR(50),
        titulo VARCHAR(255),
        categoria VARCHAR(100),
        justificativa TEXT,
        baseline_flag BOOLEAN DEFAULT FALSE,
        operador VARCHAR(100) DEFAULT 'dashboard',
        finalizado_em TIMESTAMPTZ,
        expira_em TIMESTAMPTZ,
        fonte VARCHAR(100),
        prioridade VARCHAR(50)
      );
    `);

    console.log("🔧 [4/4] Creating default admin user...");
    const res = await client.query("SELECT id FROM users WHERE email = 'admin@netrix.com'");
    if (res.rows.length === 0) {
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(8).toString('hex');
      const hashed = hashPassword(adminPassword);
      await client.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
        ['Administrador', 'admin@netrix.com', hashed]
      );
      console.log("\n   ╔══════════════════════════════════════════════════════════════╗");
      console.log("   ║                 🔑 ADMIN CREDENTIALS CREATED                 ║");
      console.log("   ╠══════════════════════════════════════════════════════════════╣");
      console.log("   ║  Email:    admin@netrix.com                                  ║");
      console.log(`   ║  Password: ${adminPassword.padEnd(46)}║`);
      console.log("   ╠══════════════════════════════════════════════════════════════╣");
      console.log("   ║  ⚠️  Save these credentials! Change after initial login.      ║");
      console.log("   ╚══════════════════════════════════════════════════════════════╝\n");
    } else {
      console.log("   ℹ️  Admin user already exists, skipping creation.");
    }

    console.log("\n🎉 Setup finished successfully!");
  } catch (e) {
    console.error("❌ Setup error:", e.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
