import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readLocalEnv } from './helpers/local-env.mjs';
import { samePrismaSchema } from './helpers/preflight.mjs';

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
