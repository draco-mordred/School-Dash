const http = require('http');

function httpRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        resolve({ statusCode: res.statusCode, headers: res.headers, body: raw });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const ts = Date.now();
  const email = `sse-node-${ts}@example.com`;
  console.log('Registering user:', email);
  const regBody = JSON.stringify({ name: `SSE Node ${ts}`, email, password: 'Pass1234!', role: 'student' });
  const reg = await httpRequest({ hostname: 'localhost', port: 5000, path: '/api/users/public/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) } }, regBody);
  console.log('Register status:', reg.statusCode);
  try { console.log('Register body:', JSON.parse(reg.body)); } catch (e) { console.log('Register body (raw):', reg.body); }

  // Login and capture cookie
  console.log('Logging in...');
  const loginBody = JSON.stringify({ email, password: 'Pass1234!' });
  const login = await httpRequest({ hostname: 'localhost', port: 5000, path: '/api/users/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
  console.log('Login status:', login.statusCode);
  // extract set-cookie
  const setCookie = login.headers['set-cookie'];
  let cookie = '';
  if (setCookie && setCookie.length) {
    cookie = setCookie.map(s => s.split(';')[0]).join('; ');
  }
  console.log('Cookie:', cookie);

  // parse created id from register response
  let userId = null;
  try { userId = JSON.parse(reg.body)._id; } catch {}
  if (!userId) {
    // try login body
    try { const jb = JSON.parse(login.body); userId = jb.user?._id || jb._id; } catch {}
  }
  console.log('User ID:', userId);

  // Open SSE stream
  console.log('Opening SSE stream...');
  const sseOpts = { hostname: 'localhost', port: 5000, path: '/api/notifications/stream', method: 'GET', headers: { Accept: 'text/event-stream', Cookie: cookie } };

  // attempt to keep connection open and reconnect once if it closes
  let reconnects = 0;
  function connectSSE() {
    const sseReq = http.request(sseOpts, (res) => {
      console.log('SSE connected, status', res.statusCode);
      res.setEncoding('utf8');
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        while (parts.length > 1) {
          const block = parts.shift();
          handleSSEBlock(block);
        }
        buffer = parts.join('\n\n');
      });
      res.on('end', () => {
        console.log('SSE connection ended');
        if (reconnects < 2) {
          reconnects += 1;
          console.log('Reconnecting SSE, attempt', reconnects);
          setTimeout(connectSSE, 1000);
        }
      });
    });
    sseReq.on('error', (e) => {
      console.error('SSE error', e);
      if (reconnects < 2) {
        reconnects += 1;
        setTimeout(connectSSE, 1000);
      }
    });
    sseReq.end();
  }

  connectSSE();

  function handleSSEBlock(block) {
    const lines = block.split('\n');
    let event = 'message';
    let data = '';
    for (const l of lines) {
      if (l.startsWith('event:')) event = l.slice(6).trim();
      if (l.startsWith('data:')) data += l.slice(5).trim();
    }
    console.log('SSE event=', event, 'data=', data);
    try { console.log('parsed data:', JSON.parse(data)); } catch {}
  }

  // Trigger profile update to assign class
  await new Promise((r) => setTimeout(r, 1000));
  console.log('Triggering profile update (assign class)');
  const patchBody = JSON.stringify({ studentClasses: '60c72b2f9b1e8e3f8c8b4567' });
  const patch = await httpRequest({ hostname: 'localhost', port: 5000, path: `/api/users/update/${userId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(patchBody), Cookie: cookie } }, patchBody);
  console.log('Patch status:', patch.statusCode);
  try { console.log('Patch body:', JSON.parse(patch.body)); } catch (e) { console.log('Patch body (raw):', patch.body); }

  // wait a few seconds to receive SSE
  await new Promise((r) => setTimeout(r, 3000));
  console.log('Done, exiting.');
  process.exit(0);
}

run().catch((err) => { console.error('E2E script error', err); process.exit(2); });
