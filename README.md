# qmax-action-server

NeurAI / Q-MAX Action Server — Node/Express bridge between Cue (Custom GPT) and CreateAnything (CA).

## What this contains
- `server.js` — endpoints: /validateBlueprint, /saveBlueprint, /getBlueprint, /listBlueprints, /sendToCA, /logBuildEvent, /health
- `openapi.yaml` — minimal API spec for integration
- `component_library.json` & `neurai_design_language.json` — component tokens & design language
- `blueprint_template.json` — example UI blueprint
- `test_requests.sh` — curl tests

## Quick local run
1. Copy `.env.example` to `.env` and fill values.
2. Install:
   ```bash
   npm install
