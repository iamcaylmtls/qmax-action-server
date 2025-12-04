/**
 * qmax-action-server (minimal)
 * - Health: GET /health
 * - List blueprints: GET /listBlueprints
 * - Get blueprint: GET /getBlueprint?id=<id>
 * - Save blueprint: POST /saveBlueprint
 * - Validate blueprint: POST /validateBlueprint  (uses simple JSON-schema)
 * - sendToCA: POST /sendToCA  (proxy to CreateAnything / CA API)
 *
 * Environment variables:
 *   PORT (Render provides)
 *   NODE_ENV
 *   CA_BASE_URL
 *   CA_API_KEY
 *   GITHUB_TOKEN (optional)
 *   STORAGE_BACKEND (optional)
 *
 * Commit and push this file to repo root.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const Ajv = require('ajv').default;
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 3000;
const CA_BASE_URL = process.env.CA_BASE_URL || 'https://rfp-grant-intelligence-en-168.created.app';
const CA_API_KEY = process.env.CA_API_KEY || '';
const ajv = new Ajv();

// --- simple in-memory store (swap for DB in prod) ---
const store = {
  blueprints: {} // id -> blueprint
};

// --- example JSON schema for a blueprint (adjust to your spec) ---
const blueprintSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    screens: {
      type: "array",
      items: { type: "object" }
    },
    meta: { type: "object" }
  },
  required: ["id", "name"],
  additionalProperties: false
};

const validateBlueprintSchema = ajv.compile(blueprintSchema);

// --- endpoints ---

// health
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// list blueprints
app.get('/listBlueprints', (req, res) => {
  const list = Object.values(store.blueprints);
  res.json({ count: list.length, blueprints: list });
});

// get blueprint
app.get('/getBlueprint', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'missing id' });
  const bp = store.blueprints[id];
  if (!bp) return res.status(404).json({ error: 'not found' });
  return res.json({ blueprint: bp });
});

// save blueprint
app.post('/saveBlueprint', (req, res) => {
  const body = req.body;
  if (!body || !body.id) return res.status(400).json({ error: 'missing blueprint or id' });

  // basic validation
  const valid = validateBlueprintSchema(body);
  if (!valid) {
    return res.status(400).json({ error: 'validation_failed', details: validateBlueprintSchema.errors });
  }

  store.blueprints[body.id] = body;
  return res.json({ ok: true, id: body.id });
});

// validate blueprint only
app.post('/validateBlueprint', (req, res) => {
  const payload = req.body;
  const valid = validateBlueprintSchema(payload);
  if (!valid) {
    return res.status(400).json({ valid: false, errors: validateBlueprintSchema.errors });
  }
  return res.json({ valid: true });
});

// proxy/send to CreateAnything (CA) build endpoint
app.post('/sendToCA', async (req, res) => {
  const payload = req.body;
  try {
    const headers = {};
    if (CA_API_KEY) headers['Authorization'] = `Bearer ${CA_API_KEY}`;
    const endpoint = `${CA_BASE_URL.replace(/\/$/, '')}/api/ai/build-screen`; // adjust path if needed
    const resp = await axios.post(endpoint, payload, { headers, timeout: 30000 });
    return res.json({ ok: true, caResponse: resp.data });
  } catch (err) {
    console.error('sendToCA error', err?.response?.data || err.message || err);
    return res.status(502).json({ ok: false, error: 'CA_request_failed', detail: err?.response?.data || err.message });
  }
});

// simple event logger (persist to logs for now; later send to monitoring)
app.post('/logBuildEvent', (req, res) => {
  const event = req.body;
  console.log('BUILD_EVENT', JSON.stringify(event));
  return res.json({ ok: true });
});

// fallback
app.get('/', (req, res) => res.json({ name: 'qmax-action-server', uptime: process.uptime() }));

// start
app.listen(PORT, () => {
  console.log(`qmax-action-server listening on port ${PORT} (env=${process.env.NODE_ENV || 'dev'})`);
});


