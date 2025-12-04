// tests/smoke.test.js
const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.ACTION_API_KEY || 'testkey';

async function run() {
  try {
    const h = await axios.get(`${BASE}/health`);
    console.log('health =>', h.data);

    const validate = await axios.post(`${BASE}/api/blueprint/validate`, {
      name: 'smoke',
      content: { sample: true }
    }, {
      headers: { 'x-api-key': API_KEY }
    });
    console.log('validate =>', validate.data);

    console.log('SMOKE OK');
    process.exit(0);
  } catch (err) {
    console.error('SMOKE FAILED', err.response ? err.response.data : err.message);
    process.exit(2);
  }
}

run();
