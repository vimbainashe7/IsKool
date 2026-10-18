import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Run this frontend check with Node 24.');
const occupied = await new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port: 3000 });
  socket.setTimeout(1000);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => { socket.destroy(); resolve(false); });
  socket.once('timeout', () => { socket.destroy(); resolve(true); });
});
if (occupied) throw new Error('Stop the local frontend before production verification. The existing port owner was not terminated.');
const env = {
  ...process.env, NODE_ENV: 'production', CI: '',
  ISKOOL_DEV_ACCOUNTS: 'true', ISKOOL_DEV_LOOPBACK: '127.0.0.1',
  ISKOOL_ENABLE_DEMO: 'false', NEXT_PUBLIC_ISKOOL_DEMO: 'false',
  ISKOOL_SAMS_API_URL: 'http://127.0.0.1:3002/api/v1',
  ISKOOL_APS_API_URL: 'http://127.0.0.1:3001/api/v1',
};
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], { env, stdio: 'inherit' });
let failedToSpawn = false;
child.on('error', () => { failedToSpawn = true; });
try {
  const deadline = Date.now() + 60000;
  let html;
  while (Date.now() < deadline && !failedToSpawn && child.exitCode === null) {
    try {
      const response = await fetch('http://127.0.0.1:3000/sign-in', { signal: AbortSignal.timeout(5000) });
      if (response.ok) { html = await response.text(); break; }
    } catch { /* production process is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(html?.includes('Welcome back'), 'Production sign-in must render successfully.');
  assert.equal(html.includes('Development accounts'), false, 'Production must hide development quick-fill even with local flags enabled.');
  const status = await fetch('http://127.0.0.1:3000/api/dev/local-status', { signal: AbortSignal.timeout(5000) });
  assert.equal(status.status, 404);
  console.log('PASS real production server: quick-fill absent and local-status route disabled, despite explicit local developer flags.');
} finally {
  if (child.pid && child.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}
