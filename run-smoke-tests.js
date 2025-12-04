// scripts/run-smoke-tests.js
const http = require('http');

const url = process.env.SMOKE_URL || 'http://localhost:8080/health';
const timeout = Number(process.env.SMOKE_TIMEOUT || 7000);

function check(){
  http.get(url, (res) => {
    let data='';
    res.on('data', c=>data+=c);
    res.on('end', ()=>{
      try {
        const j = JSON.parse(data);
        if (j && j.ok) {
          console.log('smoke: OK', j);
          process.exit(0);
        } else {
          console.error('smoke: unhealthy', j);
          process.exit(2);
        }
      } catch(e){
        console.error('smoke: invalid response', data);
        process.exit(3);
      }
    });
  }).on('error', (err)=>{
    console.error('smoke: error', err.message);
    process.exit(4);
  }).setTimeout(timeout, ()=> {
    console.error('smoke: timeout');
    process.exit(5);
  });
}

check();
// scripts/run-smoke-tests.js
const http = require('http');

const url = process.env.SMOKE_URL || 'http://localhost:8080/health';
const timeout = Number(process.env.SMOKE_TIMEOUT || 7000);

function check(){
  http.get(url, (res) => {
    let data='';
    res.on('data', c=>data+=c);
    res.on('end', ()=>{
      try {
        const j = JSON.parse(data);
        if (j && j.ok) {
          console.log('smoke: OK', j);
          process.exit(0);
        } else {
          console.error('smoke: unhealthy', j);
          process.exit(2);
        }
      } catch(e){
        console.error('smoke: invalid response', data);
        process.exit(3);
      }
    });
  }).on('error', (err)=>{
    console.error('smoke: error', err.message);
    process.exit(4);
  }).setTimeout(timeout, ()=> {
    console.error('smoke: timeout');
    process.exit(5);
  });
}

check();
