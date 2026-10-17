import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, createConnection } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

test('frontend wrapper refuses attached and long hostname overrides before spawning Next', {
  skip: Number(process.versions.node.split('.')[0]) !== 24
}, () => {
  for (const arg of ['-H0.0.0.0', '--hostname=0.0.0.0']) {
    const result = spawnSync(process.execPath, ['scripts/dev-local.mjs', arg], { cwd: 'frontend_base', encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Do not override the hostname/);
  }
});

// Run explicitly after stopping the local frontend. This is a foreign TCP
// listener, not an API mock: the launcher must report it and leave it alive.
test('Windows launcher reports a foreign port owner without terminating it', {
  skip: process.platform !== 'win32', timeout: 60000
}, async () => {
  const sockets = new Set();
  const server = createServer((socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3000, '127.0.0.1', resolve); });
  try {
    const child = spawn(process.execPath, ['scripts/acceptance/dev-iskool.mjs', '--frontend', '--check'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    assert.equal(status, 1);
    assert.match(output, /Port 3000 conflict/);
    assert.match(output, new RegExp(`PID ${process.pid}:`));
    assert.match(output, /No process was terminated/);
    assert.equal(server.listening, true);
    await new Promise((resolve, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port: 3000 });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', reject);
    });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});
