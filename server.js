// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null
});

// API key middleware - checks x-api-key OR Authorization: Bearer <key>
function apiKeyMiddleware(req, res, next) {
  const headerKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  const expected = process.env.ACTION_API_KEY;
  if (!expected) {
    console.warn('ACTION_API_KEY not set; rejecting requests by default.');
    return res.status(500).json({ error: 'Server configuration error: ACTION_API_KEY missing' });
  }
  if (!headerKey || headerKey !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Validate blueprint (lightweight validation)
app.post('/api/blueprint/validate', apiKeyMiddleware, (req, res) => {
  const blueprint = req.body;
  if (!blueprint || !blueprint.name || !blueprint.content) {
    return res.status(400).json({ valid: false, reason: 'Missing name or content' });
  }
  // add simple checks here
  const valid = typeof blueprint.name === 'string' && typeof blueprint.content === 'object';
  return res.json({ valid, checks: { hasName: !!blueprint.name, contentType: typeof blueprint.content } });
});

// Save blueprint -> inserts into Postgres blueprints table
app.post('/api/blueprint/save', apiKeyMiddleware, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Missing name or content' });
  try {
    const result = await pool.query(
      `INSERT INTO blueprints (name, content, created_at) VALUES ($1, $2, now()) RETURNING id, created_at`,
      [name, content]
    );
    res.json({ ok: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err) {
    console.error('save error', err);
    res.status(500).json({ error: 'db_error', details: err.message });
  }
});

// lightweight endpoint to trigger DB provisioning (optional, guarded)
app.post('/api/admin/provision-db', apiKeyMiddleware, async (req, res) => {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS blueprints (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `;
    await pool.query(sql);
    res.json({ ok: true, msg: 'provisioned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('qmax action server listening on', PORT));
