import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readLocalEnv, updateLocalEnv } from './helpers/local-env.mjs';
import { parseEnv } from 'node:util';
import { samePrismaSchema } from './helpers/preflight.mjs';

test('managed settings preserve adjacent secrets and database URLs with Windows or Unix line endings', () => {
  for (const newline of ['\r\n', '\n', '\r']) {
    const source = ['DEV_SEED_PASSWORD="local-only-$&-fixture"', 'AUTH_DATABASE_URL=postgresql://local@127.0.0.1/test?connect_timeout=10', 'SAMS_INTERNAL_BASE_URL=http://localhost:3002/old', 'SAMS_INTERNAL_ENABLED=false'].join(newline);
    const settings = { SAMS_INTERNAL_BASE_URL: 'http://127.0.0.1:3003/internal/v1', SAMS_INTERNAL_ENABLED: 'true', SAMS_INTERNAL_TIMEOUT_MS: '8000' };
    const updated = updateLocalEnv(source, settings);
    const original = parseEnv(source.replace(/\r\n?/g, '\n'));
    assert.equal(parseEnv(updated).AUTH_DATABASE_URL, original.AUTH_DATABASE_URL);
    assert.equal(parseEnv(updated).DEV_SEED_PASSWORD, original.DEV_SEED_PASSWORD);
    assert.deepEqual(parseEnv(updated), {...original, ...settings});
    assert.equal(updateLocalEnv(updated, settings), updated);
  }
});

test('generated Prisma formatting is accepted but model and quoted-default changes are stale', () => {
  assert.equal(samePrismaSchema('model A {\n id  String\n}', 'model A {\r\n  id String\r\n}'), true);
  assert.equal(samePrismaSchema('model A { id String }', 'model A { id Int }'), false);
  assert.equal(samePrismaSchema('x @default("a  b")', 'x @default("a b")'), false);
});

test('separate service environments cannot leak ports or credentials into one another', () => {
  const directory = mkdtempSync(join(tmpdir(), 'iskool-env-test-'));
  try {
    const aps = join(directory, 'aps.env');
    const sams = join(directory, 'sams.env');
    writeFileSync(aps, '\uFEFFPORT=3001\nSERVICE_NAME=aps-api\n');
    writeFileSync(sams, 'PORT=3002\nSERVICE_NAME=sams-api\n');
    const before = process.env.PORT;
    assert.equal(readLocalEnv([sams], {}).PORT, '3002');
    assert.equal(readLocalEnv([aps], {}).PORT, '3001');
    assert.equal(process.env.PORT, before);
    assert.equal(readLocalEnv([aps], { PORT: '3999' }).PORT, '3999');
  } finally { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); rmSync(directory, { recursive: true }); }
});

test('ambiguous duplicate configuration fails without exposing values', () => {
  const directory = mkdtempSync(join(tmpdir(), 'iskool-env-test-'));
  try {
    const file = join(directory, 'local.env');
    writeFileSync(file, 'ISKOOL_ENABLE_DEMO=false\nISKOOL_ENABLE_DEMO=true\n');
    assert.throws(() => readLocalEnv([file], {}), /Duplicate ISKOOL_ENABLE_DEMO/);
  } finally { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); rmSync(directory, { recursive: true }); }
});

test('generated Prisma punctuation spacing is accepted without merging field tokens', () => {
  assert.equal(samePrismaSchema('model Student { id String @id @@unique([id,schoolId]) }', 'model Student { id String @id @@unique([id, schoolId]) }'), true);
  assert.equal(samePrismaSchema('field String', 'fieldString'), false);
});
