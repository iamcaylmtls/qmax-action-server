// provision_db.js
require('dotenv').config();
const { Pool } = require('pg');

(async function provision() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blueprints (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    console.log('DB provision complete');
  } catch (err) {
    console.error('Provision failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
