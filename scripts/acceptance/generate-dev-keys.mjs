import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';

function generateKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  return {
    privateKey: privateKey.replaceAll('\n', '\\n'),
    publicKey: publicKey.replaceAll('\n', '\\n')
  };
}

function ensureEnvFile(examplePath, targetPath) {
  if (!existsSync(targetPath)) {
    writeFileSync(targetPath, readFileSync(examplePath, 'utf8'));
  }
}

function setEnvValue(text, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(text)) {
    return text.replace(pattern, line);
  }
  return `${text.trimEnd()}\n${line}\n`;
}

ensureEnvFile('apps/sams-api/.env.example', 'apps/sams-api/.env');
ensureEnvFile('apps/aps-api/.env.example', 'apps/aps-api/.env');

const sams = generateKeyPair();
const aps = generateKeyPair();

let samsEnv = readFileSync('apps/sams-api/.env', 'utf8');
samsEnv = setEnvValue(samsEnv, 'JWT_PRIVATE_KEY_PEM', sams.privateKey);
samsEnv = setEnvValue(samsEnv, 'JWT_PUBLIC_KEY_PEM', sams.publicKey);
samsEnv = setEnvValue(samsEnv, 'JWT_KEY_ID', 'sams-local-1');
samsEnv = setEnvValue(samsEnv, 'APS_JWT_PRIVATE_KEY_PEM', aps.privateKey);
samsEnv = setEnvValue(samsEnv, 'APS_JWT_PUBLIC_KEY_PEM', aps.publicKey);
samsEnv = setEnvValue(samsEnv, 'APS_JWT_KEY_ID', 'aps-local-1');
writeFileSync('apps/sams-api/.env', samsEnv);

let apsEnv = readFileSync('apps/aps-api/.env', 'utf8');
apsEnv = setEnvValue(apsEnv, 'JWT_PRIVATE_KEY_PEM', aps.privateKey);
apsEnv = setEnvValue(apsEnv, 'JWT_PUBLIC_KEY_PEM', aps.publicKey);
apsEnv = setEnvValue(apsEnv, 'JWT_KEY_ID', 'aps-local-1');
writeFileSync('apps/aps-api/.env', apsEnv);

console.log('PASS wrote local JWT key material to apps/sams-api/.env and apps/aps-api/.env');
console.log('No private keys were printed. These .env files must remain uncommitted.');
