require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

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
    // List all tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log("\n📋 Tables in database:\n");
    for (const row of tables.rows) {
      const cols = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
        [row.table_name]
      );
      console.log(`  📁 ${row.table_name}`);
      for (const col of cols.rows) {
        console.log(`     ├── ${col.column_name} (${col.data_type})`);
      }
      console.log();
    }
  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
