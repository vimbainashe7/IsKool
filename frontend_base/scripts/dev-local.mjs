import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

if (Number(process.versions.node.split('.')[0]) !== 24) {
  console.error('IsKool frontend development requires Node 24. Backend commands require Node 22. See the root README.');
  process.exit(1);
}
const args = process.argv.slice(2);
if (args.some((arg) => /^(--hostname(?:=|$)|-H)/.test(arg))) {
  throw new Error('Local development binds to 127.0.0.1. Do not override the hostname.');
}
const defaultPort = args.length === 0 || (args.length === 2 && ['--port', '-p'].includes(args[0]) && args[1] === '3000');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const child = spawn(process.execPath, defaultPort
  ? [resolve(root, 'scripts/acceptance/dev-iskool.mjs'), '--frontend']
  : ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', ...args], {
  cwd: defaultPort ? root : process.cwd(),
  stdio: 'inherit', env: { ...process.env, ISKOOL_DEV_LOOPBACK: '127.0.0.1' },
});
child.on('error', () => { console.error('Could not start Next.js. Run pnpm install --frozen-lockfile.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
