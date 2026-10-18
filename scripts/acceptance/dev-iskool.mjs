import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { readLocalEnv } from './helpers/local-env.mjs';
import { samePrismaSchema } from './helpers/preflight.mjs';
import { backendIsLive } from './helpers/readiness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Prisma may load the env path recorded by the last generated client. Keep each
// service independent from that side effect and from the other service's PORT.
const inheritedEnv = { ...process.env };
const backendOnly = process.argv.includes('--backend');
const frontendOnly = process.argv.includes('--frontend');
const checkOnly = process.argv.includes('--check');
const children = [];
let stopping = false;
const cache = join(root, 'tmp/local-dev');
const hash = (value) => createHash('sha256').update(value).digest('hex');
function fail(message) { throw new Error(message); }
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) fail(`Command failed: ${args[0]}. See the output above and README troubleshooting.`);
  return result.stdout?.trim();
}
function runtime(major, variable) {
  const candidates = [process.env[variable], process.execPath];
  if (process.env.NVM_HOME) {
    // Resolve independent executables; never switch the shared nvm symlink.
    const { stdout } = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Get-ChildItem -LiteralPath $env:NVM_HOME -Directory | Select-Object -ExpandProperty FullName'], { encoding: 'utf8' });
    for (const directory of (stdout ?? '').trim().split(/\r?\n/).reverse()) candidates.push(join(directory, 'node.exe'));
  }
  for (const candidate of candidates.filter(Boolean)) {
    if (!existsSync(candidate)) continue;
    const result = spawnSync(candidate, ['-p', 'process.versions.node'], { encoding: 'utf8' });
    if (result.status === 0 && Number(result.stdout.trim().split('.')[0]) === major) {
      const executable = realpathSync(candidate);
      console.log(`Node ${major}: ${executable} (${result.stdout.trim()})`);
      return executable;
    }
  }
  fail(`Node ${major} is missing. Install it with nvm install ${major}, or set ${variable} to its node.exe. Do not change nvm use while servers are running.`);
}
function environment(service) {
  return readLocalEnv([join(root, '.env'), join(root, `apps/${service}/.env`)], inheritedEnv);
}
function backendBuildFingerprint() {
  const digest = createHash('sha256');
  function visit(relative) {
    const path = join(root, relative);
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(relative, entry.name);
      if (entry.isDirectory() && !['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)) visit(file);
      else if (entry.isFile() && /\.(ts|json|prisma)$/.test(entry.name)) digest.update(file).update(readFileSync(join(root, file)));
    }
  }
  for (const directory of ['apps', 'packages/auth', 'database/prisma']) visit(directory);
  digest.update(readFileSync(join(root, 'package-lock.json')));
  return digest.digest('hex');
}
async function validateDatabase(env, service) {
  if (env.NODE_ENV !== 'development' || !['development', 'staging', 'testing'].includes(env.ISKOOL_ENVIRONMENT)) fail(`${service}: configure NODE_ENV=development and an explicitly non-production ISKOOL_ENVIRONMENT.`);
  const required = ['DATABASE_URL', 'AUTH_DATABASE_URL', 'JWT_PRIVATE_KEY_PEM', 'JWT_PUBLIC_KEY_PEM', 'JWT_KEY_ID'];
  if (service === 'sams-api') required.push('APS_JWT_PRIVATE_KEY_PEM', 'APS_JWT_PUBLIC_KEY_PEM', 'APS_JWT_KEY_ID');
  for (const key of required) if (!env[key]) fail(`${service}: ${key} missing. Configure ignored apps/${service}/.env; no secrets are printed.`);
  if (String(env.PORT) !== (service === 'aps-api' ? '3001' : '3002')) fail(`${service}: this launcher requires its documented port, 3001/3002.`);
  const expected = service === 'aps-api' ? 'iskool_aps_dev_login' : 'iskool_sams_dev_login';
  const { PrismaClient } = await import('@prisma/client');
  for (const [key, login] of [['DATABASE_URL', expected], ['AUTH_DATABASE_URL', 'iskool_auth_dev_login']]) {
    let url;
    try { url = new URL(env[key]); } catch { fail(`${service}: invalid ${key}.`); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || /prod/i.test(`${url.hostname}${url.pathname}`)) fail(`${service}: refusing unexpected or production database configuration.`);
    if (decodeURIComponent(url.username).split('.')[0] !== login) fail(`${service}: ${key} must use least-privilege ${login}, not an administrator login.`);
    const prisma = new PrismaClient({ datasources: { db: { url: env[key] } }, log: [] });
    try {
      const roles = await prisma.$queryRaw`SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
      if (roles.length !== 1 || roles[0].name !== login || roles[0].rolsuper || roles[0].rolbypassrls) fail(`${service}: unsafe database role for ${key}.`);
    } catch { fail(`${service}: database connection/least-privilege check failed for ${key}. Check network, pooler credentials and grants; no migration or seed was run.`); }
    finally { await prisma.$disconnect(); }
  }
  console.log(`${service}: non-production configuration and runtime/auth database roles verified.`);
}
async function occupied(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(true); });
  });
}
function owner(port) {
  const script = `$ids = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) { for ($i=0; $i -lt 4 -and $id -gt 0; $i++) { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$id"; $p | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress; $id = $p.ParentProcessId } }`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
  return result.stdout?.trim() || 'Owner unavailable; inspect Get-NetTCPConnection manually.';
}
function describeOwner(details) {
  return details.split(/\r?\n/).map((line) => {
    try {
      const process = JSON.parse(line);
      const command = process.CommandLine ?? '';
      const checkout = command.toLowerCase().includes(root.toLowerCase()) ? 'canonical checkout' : 'another checkout/application';
      return `PID ${process.ProcessId}: ${process.ExecutablePath ?? 'unknown executable'}; ${checkout} (arguments withheld).`;
    } catch { return 'Process details unavailable; inspect Get-NetTCPConnection in the owning terminal.'; }
  }).join('\n');
}
async function healthy(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(service.kind === 'frontend' ? 30000 : 10000), redirect: 'manual' });
    if (!response.ok) return false;
    if (service.kind === 'frontend') return (await response.text()).includes('Welcome back');
    const body = await response.json();
    return body.status === 'ok' && body.dependencies?.database === 'ok' && ['ok', 'disabled'].includes(body.dependencies?.redis);
  } catch { return false; }
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    // Only process trees created by this invocation are eligible for cleanup.
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0));

try {
  if (resolve(process.cwd()) !== root || !existsSync(join(root, 'package.json')) || !existsSync(join(root, 'apps/aps-api'))) fail(`Run from the canonical repository root: ${root}`);
  if (process.platform !== 'win32') fail('This launcher currently supports Windows. Use the documented separate backend/frontend terminals elsewhere.');
  console.log(`IsKool canonical checkout: ${root}\nBackend: Node 22. Frontend: Node 24. No Docker, migration or seeding at startup.`);
  const node22 = frontendOnly ? null : runtime(22, 'ISKOOL_NODE22');
  const node24 = backendOnly ? null : runtime(24, 'ISKOOL_NODE24');
  const head = run('git', ['rev-parse', 'HEAD']);
  if (node22) run(node22, [join(dirname(node22), 'node_modules/npm/bin/npm-cli.js'), '--version']);
  if (node24) console.log(`pnpm ${run('cmd.exe', ['/d', '/s', '/c', 'pnpm --version'], { env: { ...inheritedEnv, PATH: `${dirname(node24)};${inheritedEnv.PATH}` } })}`);
  const services = [];
  if (!frontendOnly) {
    if (!existsSync(join(root, 'node_modules/.prisma/client/index.js'))) fail('Prisma client missing. With Node 22 run npm ci, then npm run prisma:generate.');
    const generatedSchema = join(root, 'node_modules/.prisma/client/schema.prisma');
    if (!existsSync(generatedSchema) || !samePrismaSchema(readFileSync(generatedSchema, 'utf8'), readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8'))) fail('Prisma client schema is stale. With Node 22 run npm run prisma:generate before starting services.');
    for (const [kind, port] of [['sams', 3002], ['aps', 3001]]) {
      const env = environment(`${kind}-api`);
      await validateDatabase(env, `${kind}-api`);
      services.push({ kind, port, node: node22, env, cwd: root, args: [join(root, `apps/${kind}-api/dist/main.js`)], url: `http://127.0.0.1:${port}/api/v1/health/ready` });
    }
  }
  if (!backendOnly) {
    if (!existsSync(join(root, 'frontend_base/.env.local'))) fail('Missing frontend_base/.env.local. Follow the root README live API configuration.');
    const env = { ...readLocalEnv([join(root, 'frontend_base/.env.local')], inheritedEnv), ISKOOL_DEV_LOOPBACK: '127.0.0.1' };
    if (env.ISKOOL_ENABLE_DEMO !== 'false' || env.NEXT_PUBLIC_ISKOOL_DEMO !== 'false' ||
      env.ISKOOL_APS_API_URL !== 'http://127.0.0.1:3001/api/v1' || env.ISKOOL_SAMS_API_URL !== 'http://127.0.0.1:3002/api/v1') fail('Frontend must explicitly disable both demo flags and point to the local APS/SAMS APIs. See README.');
    if (!existsSync(join(root, 'frontend_base/node_modules/next/dist/bin/next'))) fail('Frontend dependencies missing. Run pnpm install --frozen-lockfile in frontend_base with Node 24.');
    services.push({ kind: 'frontend', port: 3000, node: node24, env, cwd: join(root, 'frontend_base'), args: [join(root, 'frontend_base/node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000'], url: 'http://127.0.0.1:3000/sign-in' });
  }
  mkdirSync(cache, { recursive: true });
  for (const service of services) {
    service.manifest = join(cache, `${service.kind}.json`);
    const config = Object.fromEntries(Object.entries(service.env).filter(([key]) => /^(DATABASE_|AUTH_|JWT_|APS_|SAMS_|REDIS_|ISKOOL_|NEXT_PUBLIC_)/.test(key)).sort(([a], [b]) => a.localeCompare(b)));
    service.fingerprint = hash(JSON.stringify({ root, head, node: service.node, config, args: service.args }));
    if (await occupied(service.port)) {
      let lease;
      try { lease = JSON.parse(readFileSync(service.manifest, 'utf8')); } catch { /* unmanaged listener */ }
      const details = owner(service.port);
      let verifiedFrontend = false;
      if (service.kind === 'frontend') {
        try {
          const response = await fetch('http://127.0.0.1:3000/api/dev/local-status', { signal: AbortSignal.timeout(5000) });
          const status = await response.json();
          verifiedFrontend = service.env.ISKOOL_DEV_ACCOUNTS === 'true' && response.ok && status.service === 'iskool-frontend' && status.checkout === hash(realpathSync(join(root, 'frontend_base'))) && status.head === head && status.mode === 'live' && status.node.startsWith('24.');
        } catch { /* fail closed */ }
      }
      const verifiedLease = lease?.fingerprint === service.fingerprint && details.includes(String(lease.pid)) && details.toLowerCase().includes(JSON.stringify(root).slice(1, -1).toLowerCase());
      if ((!verifiedLease && !verifiedFrontend) || !await healthy(service)) {
        fail(`Port ${service.port} conflict: expected healthy ${service.kind} from this checkout and configuration.\n${describeOwner(details)}\nStop the identified old terminal with Ctrl+C, or investigate that PID. No process was terminated. Then rerun npm run dev:iskool.`);
      }
      service.reuse = true;
      console.log(`Reuse healthy ${service.kind}: ${service.url}`);
    }
  }
  if (checkOnly) { console.log('PASS local startup preflight. No services started.'); }
  else {
    if (node22 && services.some((service) => service.kind !== 'frontend' && !service.reuse)) {
      const fingerprint = backendBuildFingerprint();
      const stamp = join(cache, 'backend-build.txt');
      const current = existsSync(stamp) && readFileSync(stamp, 'utf8') === fingerprint && ['aps', 'sams'].every((name) => existsSync(join(root, `apps/${name}-api/dist/main.js`)));
      if (current) console.log('Reuse backend build: sources and lockfile unchanged.');
      else {
        run(node22, [join(dirname(node22), 'node_modules/npm/bin/npm-cli.js'), 'run', 'build'], { stdio: 'inherit', env: { ...inheritedEnv, PATH: `${dirname(node22)};${inheritedEnv.PATH}` } });
        writeFileSync(stamp, fingerprint);
      }
    }
    for (const service of services.filter((entry) => !entry.reuse)) {
      const child = spawn(service.node, service.args, { cwd: service.cwd, env: { ...service.env, PATH: `${dirname(service.node)};${service.env.PATH}`, NODE_ENV: 'development' }, stdio: 'inherit' });
      children.push(child);
      child.on('error', () => { console.error(`${service.kind} could not start.`); stop(1); });
      child.on('exit', (code) => { if (!stopping) { console.error(`${service.kind} exited (${code}).`); stop(code || 1); } });
      console.log(`Starting ${service.kind}; waiting for readiness (first Windows frontend compilation can take several minutes).`);
      const deadline = Date.now() + 300000;
      while (!stopping && Date.now() < deadline && !await healthy(service)) await new Promise((resolve) => setTimeout(resolve, 1500));
      if (stopping || !await healthy(service)) fail(`${service.kind} failed readiness. Run npm run acceptance:doctor and inspect service logs.`);
      writeFileSync(service.manifest, JSON.stringify({ pid: child.pid, fingerprint: service.fingerprint }));
      console.log(`READY ${service.kind}: ${service.url}`);
    }
    if (frontendOnly) console.log('PASS frontend only ready. APS/SAMS were not started or verified; use npm run dev:iskool for the fully connected session.');
    else if (backendOnly) console.log('PASS APS and SAMS ready. Frontend was not started or verified.');
    else console.log('PASS LIVE IsKool ready: frontend, APS and SAMS verified.');
    if (!frontendOnly) console.log('Backend Swagger: http://127.0.0.1:3001/api/v1/docs and http://127.0.0.1:3002/api/v1/docs');
    if (!backendOnly) console.log('Live sign-in: http://127.0.0.1:3000/sign-in (academic projections remain future work).');
    console.log('Ctrl+C stops only services started by this invocation. Reused services remain running.');
    let probing = false;
    const monitor = setInterval(async () => {
      if (probing || stopping) return;
      probing = true;
      try {
        for (const service of services) {
          const previousFailures = service.failures ?? 0;
          service.failures = await healthy(service) ? 0 : previousFailures + 1;
          if (!service.failures && previousFailures) console.log(`RECOVERED ${service.kind}: readiness verified again.`);
          if (service.failures) console.error(`${service.kind}: readiness failed (${service.failures} consecutive probes); checking again.`);
          if (service.failures >= 3) {
            if (await backendIsLive(service)) {
              console.error(`DEGRADED ${service.kind}: API is live but dependencies are not ready. Requests may fail; services remain running while readiness is retried.`);
            } else {
              console.error(`${service.kind} lost readiness and liveness.`); clearInterval(monitor); stop(1); break;
            }
          }
        }
      } finally { probing = false; }
    }, 15000);
    monitor.unref();
  }
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  stop(1);
}
