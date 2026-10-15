import { spawn } from 'node:child_process';
import { defaultApsBaseUrl, defaultSamsBaseUrl, healthCheck } from './helpers/preflight.mjs';

const commands = [
  ['SAMS', 'npm', ['run', 'dev:sams']],
  ['APS', 'npm', ['run', 'dev:aps']]
];

const children = commands.map(([label, command, args]) => {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[${label}] exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
      shutdown(code ?? 1);
    }
  });

  return child;
});

let shuttingDown = false;

void waitForReadiness();

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function waitForReadiness() {
  const deadline = Date.now() + 120_000;
  let announced = false;
  while (!shuttingDown && Date.now() < deadline) {
    const [sams, aps] = await Promise.all([
      healthCheck('SAMS', defaultSamsBaseUrl, 1000),
      healthCheck('APS', defaultApsBaseUrl, 1000)
    ]);
    if (sams.ok && aps.ok) {
      console.log(`SAMS ready at ${defaultSamsBaseUrl}/health/live`);
      console.log(`APS ready at ${defaultApsBaseUrl}/health/live`);
      return;
    }
    if (!announced) {
      console.log('Waiting for APS and SAMS health checks...');
      announced = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!shuttingDown) {
    console.error('APS/SAMS did not become healthy within 120 seconds. Check the logs above and run npm run acceptance:doctor.');
  }
}
