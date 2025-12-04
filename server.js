// server.js
// NeurAI Action Suite - Node/Express backend
// Copy-to-repo: qmax-action-server/server.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Environment / defaults
const PORT = process.env.PORT || 4000;
const CA_BASE_URL =
  process.env.CA_BASE_URL || "https://rfp-grant-intelligence-en-168.created.app";
const CA_BUILD_PATH = process.env.CA_BUILD_PATH || "/api/ai/build-screen"; // <<-- replace if CA uses different path
const APP_API_KEY = process.env.APP_API_KEY || null; // optional auth header to CA

// In-memory stores (reset on restart)
const blueprints = new Map();
const events = [];

// helpers
const nowISO = () => new Date().toISOString();
function makeResponseError(res, err, code = 500) {
  console.error(err && err.stack ? err.stack : err);
  return res.status(code).json({ error: String(err) });
}

/* ---------- Health & root ---------- */
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "NeurAI Action Suite",
    time: nowISO(),
    caBaseUrl: CA_BASE_URL,
    caBuildPath: CA_BUILD_PATH
  });
});
app.get("/health", (_req, res) => res.json({ status: "ok", ts: nowISO() }));

/* ---------- Validate Blueprint ---------- */
app.post("/validateBlueprint", (req, res) => {
  try {
    const { blueprint } = req.body || {};
    const issues = [];

    if (!blueprint || typeof blueprint !== "object")
      return res
        .status(400)
        .json({ valid: false, issues: ["Missing or invalid 'blueprint' object."] });

    if (!blueprint.screen_id && !blueprint.screenId) issues.push("Missing screen_id/screenId.");
    if (!blueprint.screen_name && !blueprint.name) issues.push("Missing screen_name or name.");
    if (!blueprint.layout) issues.push("Missing layout.");

    const optimized = Object.assign({ app: "NeurAI Intelligence Engine" }, blueprint);

    res.json({ valid: issues.length === 0, issues, optimizedBlueprint: optimized });
  } catch (err) {
    return makeResponseError(res, err);
  }
});

/* ---------- Save Blueprint ---------- */
app.post("/saveBlueprint", (req, res) => {
  try {
    const { screenId, blueprint, label = "", tags = [] } = req.body || {};
    if (!screenId || !blueprint) {
      return res.status(400).json({ error: "screenId and blueprint are required." });
    }
    const blueprintId = uuid();
    const record = {
      blueprintId,
      screenId,
      version: `v-${Date.now()}`,
      label,
      tags,
      blueprint,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    blueprints.set(blueprintId, record);
    return res.json({ ok: true, blueprintId, version: record.version, createdAt: record.createdAt });
  } catch (err) {
    return makeResponseError(res, err);
  }
});

/* ---------- Get Blueprint ---------- */
app.get("/getBlueprint", (req, res) => {
  try {
    const { screenId, blueprintId, version } = req.query;
    if (blueprintId) {
      const item = blueprints.get(blueprintId);
      if (!item) return res.status(404).json({ error: "Blueprint not found" });
      return res.json(item);
    }
    if (!screenId) return res.status(400).json({ error: "Provide screenId or blueprintId." });
    const list = Array.from(blueprints.values()).filter((b) => b.screenId === screenId);
    if (!list.length) return res.status(404).json({ error: "No blueprints for this screenId." });
    let chosen = list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    if (version) chosen = list.find((b) => b.version === version) || chosen;
    return res.json(chosen);
  } catch (err) {
    return makeResponseError(res, err);
  }
});

/* ---------- List Blueprints ---------- */
app.get("/listBlueprints", (req, res) => {
  try {
    const { screenId, tag, limit = 20 } = req.query;
    let items = Array.from(blueprints.values());
    if (screenId) items = items.filter((b) => b.screenId === screenId);
    if (tag) items = items.filter((b) => (b.tags || []).includes(tag));
    items = items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, Number(limit));
    return res.json({ items });
  } catch (err) {
    return makeResponseError(res, err);
  }
});

/* ---------- Send to CreateAnything (CA) ---------- */
app.post("/sendToCA", async (req, res) => {
  try {
    const { screenId, blueprint, buildPrompt } = req.body || {};
    if (!screenId || !blueprint || !buildPrompt) {
      return res.status(400).json({ error: "screenId, blueprint, and buildPrompt are required." });
    }

    const targetUrl = `${CA_BASE_URL.replace(/\/$/, "")}${CA_BUILD_PATH}`;
    const headers = { "Content-Type": "application/json" };
    if (APP_API_KEY) headers["x-api-key"] = APP_API_KEY;

    const resp = await axios.post(
      targetUrl,
      { screenId, blueprint, buildPrompt },
      { headers, timeout: 60_000 }
    ).catch((err) => {
      throw err.response ? err.response.data || err.response.statusText : err;
    });

    const data = resp && resp.data ? resp.data : {};
    const caJobId = data.jobId || data.id || uuid();
    const eventRecord = {
      eventId: uuid(),
      eventType: "CA_DISPATCH",
      screenId,
      metadata: { caJobId, caStatus: data.status || "unknown", buildPromptLen: buildPrompt.length },
      timestamp: nowISO()
    };
    events.push(eventRecord);

    return res.json({ status: data.status || "queued", caJobId, rawResponse: data });
  } catch (err) {
    return makeResponseError(res, err, err.status || 502);
  }
});

/* ---------- Log event ---------- */
app.post("/logBuildEvent", (req, res) => {
  try {
    const { eventType, screenId = null, metadata = {} } = req.body || {};
    if (!eventType) return res.status(400).json({ error: "eventType required." });
    const record = { eventId: uuid(), eventType, screenId, metadata, timestamp: nowISO() };
    events.push(record);
    return res.json({ ok: true, eventId: record.eventId, timestamp: record.timestamp });
  } catch (err) {
    return makeResponseError(res, err);
  }
});

/* ---------- Expose events for diagnostics (read-only) ---------- */
app.get("/events", (req, res) => res.json({ count: events.length, events }));

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`NeurAI Action Suite running on port ${PORT}`);
});
