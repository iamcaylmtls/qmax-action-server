# qmax-action-server

Minimal Node/Express server for NeurAI / Q-MAX action server.

## Quick start (local)
1. copy `.env.example` -> `.env` and set values
2. npm ci
3. npm start
4. open http://localhost:3000/health

## Endpoints
- GET `/health` — health check
- GET `/listBlueprints` — list saved blueprints (in-memory)
- GET `/getBlueprint?id=<id>` — get blueprint
- POST `/saveBlueprint` — save blueprint (payload must include `id` and match schema)
- POST `/validateBlueprint` — validate against blueprint schema
- POST `/sendToCA` — proxy to CreateAnything (CA) build endpoint
- POST `/logBuildEvent` — store/log build events

## Deploy to Render
1. Push to GitHub repo `iamcaylmtls/qmax-action-server`.
2. In Render new service:
   - Branch: `main`
   - Root Directory: `./` (or `.`)
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health check: `/health`
3. Add env vars in Render dashboard:
   - NODE_ENV=production
   - CA_BASE_URL=https://rfp-grant-intelligence-en-168.created.app
   - CA_API_KEY=*** (if needed)
   - GITHUB_TOKEN=*** (optional)
4. Deploy and watch logs.

## Next steps (recommended)
- Replace in-memory store with Postgres (Render Postgres) or S3/filestore.
- Harden schema and auth for endpoints (JWT or API key middleware).
- Add rate limiting and monitoring.
