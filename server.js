// server.js — Q-MAX Action Server (Express)
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const BLUEPRINTS = new Map(); // in-memory store (replace with real DB for production)

function apiKeyMiddleware(req, res, next){
  const expected = process.env.API_KEY || process.env.RENDER_API_KEY;
  const header = (req.get('x-api-key') || req.query.api_key || '').toString();
  if (!expected) return res.status(500).json({error:'server misconfigured: missing API key'});
  if (header !== expected) return res.status(401).json({error:'invalid api key'});
  next();
}

app.get('/health', (req, res) => {
  res.json({ok:true, uptime: process.uptime(), timestamp: Date.now()});
});

// Save blueprint — returns id
app.post('/saveBlueprint', apiKeyMiddleware, (req, res) => {
  const blueprint = req.body.blueprint || req.body;
  if (!blueprint || Object.keys(blueprint).length === 0) {
    return res.status(400).json({ok:false, error:'missing blueprint'});
  }
  const id = (Date.now() + Math.floor(Math.random()*999)).toString();
  BLUEPRINTS.set(id, {id, created: Date.now(), blueprint});
  res.json({ok:true, id});
});

// Validate blueprint — basic sanity check (expand as needed)
app.post('/validateBlueprint', apiKeyMiddleware, (req, res) => {
  const bp = req.body.blueprint || req.body;
  if (!bp) return res.status(400).json({ok:false, error:'missing blueprint'});
  // minimal validation examples
  const hasScreens = Array.isArray(bp.screens) && bp.screens.length>0;
  const hasMeta = !!bp.meta;
  res.json({ok:true, valid: hasScreens && hasMeta, issues: hasScreens && hasMeta ? [] : ['missing screens or meta']});
});

// List blueprint IDs
app.get('/listBlueprints', apiKeyMiddleware, (req, res) => {
  const list = Array.from(BLUEPRINTS.values()).map(b=>({id:b.id, created:b.created}));
  res.json({ok:true, count:list.length, list});
});

// Forward to CreateAnything/Core AI (optional) — stub
app.post('/sendToCA', apiKeyMiddleware, async (req, res) => {
  const caUrl = process.env.CA_ENDPOINT;
  if (!caUrl) return res.status(400).json({ok:false, error:'missing CA_ENDPOINT'});
  try {
    const r = await axios.post(caUrl, req.body, {timeout:15000});
    res.json({ok:true, caResponse: r.data});
  } catch(err){
    res.status(502).json({ok:false,error:'CA forward failed', detail: err.message});
  }
});

// Build event logger
app.post('/logBuildEvent', apiKeyMiddleware, (req, res) => {
  const event = req.body || {};
  console.log('BUILD EVENT', JSON.stringify(event).slice(0,2000));
  res.json({ok:true});
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Q-MAX action server listening on ${PORT}`));
