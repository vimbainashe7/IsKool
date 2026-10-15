import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const runtimeUser = 'iskool_aps_runtime_ci';
const runtimePassword = `ci_${randomUUID().replaceAll('-', '')}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options
  });

  if (result.status !== 0) {
    throw new Error(
      redact(
        [
          `${command} ${args.join(' ')} failed with exit ${result.status}`,
          result.stdout,
          result.stderr
        ]
          .filter(Boolean)
          .join('\n')
      )
    );
  }

  return result.stdout.trim();
}

function redact(value) {
  return value.replaceAll(runtimePassword, '[redacted-runtime-password]');
}

function docker(args, options) {
  return run('docker', args, options);
}

function dbContainer() {
  const names = docker(['ps', '--format', '{{.Names}}'])
    .split(/\r?\n/)
    .filter(Boolean);
  const container = names.find((name) => name.startsWith('supabase_db_'));

  if (!container) {
    throw new Error('Supabase PostgreSQL container was not found.');
  }

  return container;
}

const container = dbContainer();

function psql(sql, { asRuntime = false, tuplesOnly = false } = {}) {
  const url = asRuntime
    ? `postgresql://${runtimeUser}:${runtimePassword}@127.0.0.1:5432/postgres`
    : 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
  const args = ['exec', '-i', container, 'psql', url, '--set', 'ON_ERROR_STOP=1'];

  if (tuplesOnly) {
    args.push('--tuples-only', '--no-align');
  }

  args.push('--command', sql);

  return docker(args);
}

function psqlResult(sql, { asRuntime = false, tuplesOnly = false } = {}) {
  const url = asRuntime
    ? `postgresql://${runtimeUser}:${runtimePassword}@127.0.0.1:5432/postgres`
    : 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
  const args = ['exec', '-i', container, 'psql', url, '--set', 'ON_ERROR_STOP=1'];

  if (tuplesOnly) {
    args.push('--tuples-only', '--no-align');
  }

  args.push('--command', sql);

  return spawnSync('docker', args, {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
}

function scalar(sql, options) {
  return psql(sql, { ...options, tuplesOnly: true })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !['BEGIN', 'COMMIT', 'ROLLBACK', 'SET'].includes(line))
    .join('\n');
}

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, received ${actual}`);
  }
  console.log(`ok - ${name}`);
}

function assertFails(name, sql) {
  const result = psqlResult(sql, { asRuntime: true });

  if (result.status === 0) {
    throw new Error(`${name}: expected statement to fail, but it succeeded`);
  }

  console.log(`ok - ${name}`);
}

function runRuntimeSqlAsync(sql) {
  return new Promise((resolve, reject) => {
    const url = `postgresql://${runtimeUser}:${runtimePassword}@127.0.0.1:5432/postgres`;
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        url,
        '--tuples-only',
        '--no-align',
        '--set',
        'ON_ERROR_STOP=1',
        '--command',
        sql
      ],
      {
        shell: process.platform === 'win32'
      }
    );
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `runtime SQL exited with ${code}`));
        return;
      }
      resolve(
        stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !['BEGIN', 'COMMIT', 'SET'].includes(line))
          .join('\n')
      );
    });
  });
}

const ids = {
  schoolA: '10000000-0000-4000-8000-000000000001',
  schoolB: '10000000-0000-4000-8000-000000000002',
  userA: '20000000-0000-4000-8000-000000000001',
  userB: '20000000-0000-4000-8000-000000000002',
  userC: '20000000-0000-4000-8000-000000000003',
  membershipA: '30000000-0000-4000-8000-000000000001',
  membershipB: '30000000-0000-4000-8000-000000000002',
  membershipCAtA: '30000000-0000-4000-8000-000000000003',
  membershipCAtB: '30000000-0000-4000-8000-000000000004'
};

psql(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${runtimeUser}') THEN
    CREATE ROLE ${runtimeUser} LOGIN PASSWORD '${runtimePassword}' IN ROLE iskool_aps_runtime;
  ELSE
    ALTER ROLE ${runtimeUser} LOGIN PASSWORD '${runtimePassword}';
  END IF;
END
$$;

TRUNCATE public.membership_roles, public.memberships, public.users, public.schools RESTART IDENTITY CASCADE;

INSERT INTO public.schools (id, name, status) VALUES
  ('${ids.schoolA}', 'School A', 'active'),
  ('${ids.schoolB}', 'School B', 'active');

INSERT INTO public.users (id, email, display_name, status) VALUES
  ('${ids.userA}', 'user.a@example.test', 'User A', 'active'),
  ('${ids.userB}', 'user.b@example.test', 'User B', 'active'),
  ('${ids.userC}', 'user.c@example.test', 'User C', 'active');

INSERT INTO public.memberships (id, user_id, school_id, status) VALUES
  ('${ids.membershipA}', '${ids.userA}', '${ids.schoolA}', 'active'),
  ('${ids.membershipB}', '${ids.userB}', '${ids.schoolB}', 'active'),
  ('${ids.membershipCAtA}', '${ids.userC}', '${ids.schoolA}', 'active'),
  ('${ids.membershipCAtB}', '${ids.userC}', '${ids.schoolB}', 'active');

INSERT INTO public.membership_roles (membership_id, role_id)
SELECT '${ids.membershipA}'::uuid, id FROM public.roles WHERE key = 'teacher'
UNION ALL
SELECT '${ids.membershipB}'::uuid, id FROM public.roles WHERE key = 'registrar'
UNION ALL
SELECT '${ids.membershipCAtA}'::uuid, id FROM public.roles WHERE key = 'teacher'
UNION ALL
SELECT '${ids.membershipCAtB}'::uuid, id FROM public.roles WHERE key = 'registrar';
`);

const roleFlags = scalar(`
SELECT string_agg(rolname || ':' || rolsuper || ':' || rolbypassrls, ',' ORDER BY rolname)
FROM pg_roles
WHERE rolname IN ('iskool_aps_runtime', 'iskool_sams_runtime', '${runtimeUser}');
`);
assertEqual(
  'runtime roles are not superuser and do not bypass RLS',
  roleFlags,
  'iskool_aps_runtime:false:false,iskool_aps_runtime_ci:false:false,iskool_sams_runtime:false:false'
);

const principalA = `
SET LOCAL iskool.user_id = '${ids.userA}';
SET LOCAL iskool.school_id = '${ids.schoolA}';
SET LOCAL iskool.membership_id = '${ids.membershipA}';
`;

const principalB = `
SET LOCAL iskool.user_id = '${ids.userB}';
SET LOCAL iskool.school_id = '${ids.schoolB}';
SET LOCAL iskool.membership_id = '${ids.membershipB}';
`;

const principalCAtA = `
SET LOCAL iskool.user_id = '${ids.userC}';
SET LOCAL iskool.school_id = '${ids.schoolA}';
SET LOCAL iskool.membership_id = '${ids.membershipCAtA}';
`;

assertEqual(
  'principal A can read own school',
  scalar(`BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;`, {
    asRuntime: true
  }),
  '1'
);

assertEqual(
  'principal A cannot read school B',
  scalar(`BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolB}'; COMMIT;`, {
    asRuntime: true
  }),
  '0'
);

assertEqual(
  'principal B cannot read school A',
  scalar(`BEGIN; ${principalB} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;`, {
    asRuntime: true
  }),
  '0'
);

assertEqual(
  'missing principal sees no schools',
  scalar('SELECT count(*) FROM public.schools;', { asRuntime: true }),
  '0'
);

assertFails(
  'cross-school update is denied',
  `BEGIN; ${principalA} UPDATE public.memberships SET status = 'inactive' WHERE id = '${ids.membershipB}'; COMMIT;`
);

psql(`UPDATE public.memberships SET status = 'inactive' WHERE id = '${ids.membershipA}';`);
assertEqual(
  'inactive principal membership is denied',
  scalar(`BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;`, {
    asRuntime: true
  }),
  '0'
);
psql(`UPDATE public.memberships SET status = 'active' WHERE id = '${ids.membershipA}';`);

assertEqual(
  'forged school context is denied',
  scalar(
    `BEGIN;
       SET LOCAL iskool.user_id = '${ids.userA}';
       SET LOCAL iskool.school_id = '${ids.schoolB}';
       SET LOCAL iskool.membership_id = '${ids.membershipA}';
       SELECT count(*) FROM public.schools WHERE id = '${ids.schoolB}';
     COMMIT;`,
    { asRuntime: true }
  ),
  '0'
);

assertEqual(
  'malformed principal context fails closed',
  scalar(
    `BEGIN;
       SET LOCAL iskool.user_id = 'not-a-uuid';
       SET LOCAL iskool.school_id = '${ids.schoolA}';
       SET LOCAL iskool.membership_id = '${ids.membershipA}';
       SELECT count(*) FROM public.schools;
     COMMIT;`,
    { asRuntime: true }
  ),
  '0'
);

assertEqual(
  'membership-scoped role does not leak across schools',
  scalar(
    `BEGIN;
       ${principalCAtA}
       SELECT string_agg(roles.key, ',' ORDER BY roles.key)
       FROM public.membership_roles
       JOIN public.roles ON roles.id = membership_roles.role_id;
     COMMIT;`,
    { asRuntime: true }
  ),
  'teacher'
);

const pooledSequence = scalar(
  `BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;
   BEGIN; ${principalB} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolB}'; COMMIT;
   SELECT count(*) FROM public.schools;`,
  { asRuntime: true }
);
assertEqual('transaction-local context clears after connection reuse', pooledSequence, '1\n1\n0');

const rollbackSequence = scalar(
  `BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; ROLLBACK;
   SELECT count(*) FROM public.schools;`,
  { asRuntime: true }
);
assertEqual('rollback clears transaction-local context', rollbackSequence, '1\n0');

for (let attempt = 0; attempt < 100; attempt += 1) {
  assertEqual(
    `sequential pooled request A ${attempt + 1}`,
    scalar(`BEGIN; ${principalA} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;`, {
      asRuntime: true
    }),
    '1'
  );
  assertEqual(
    `sequential pooled request B ${attempt + 1}`,
    scalar(`BEGIN; ${principalB} SELECT count(*) FROM public.schools WHERE id = '${ids.schoolB}'; COMMIT;`, {
      asRuntime: true
    }),
    '1'
  );
}

const [concurrentA, concurrentB] = await Promise.all([
  runRuntimeSqlAsync(`BEGIN; ${principalA} SELECT pg_sleep(1); SELECT count(*) FROM public.schools WHERE id = '${ids.schoolA}'; COMMIT;`),
  runRuntimeSqlAsync(`BEGIN; ${principalB} SELECT pg_sleep(1); SELECT count(*) FROM public.schools WHERE id = '${ids.schoolB}'; COMMIT;`)
]);

assertEqual('concurrent principal A remains isolated', concurrentA, '1');
assertEqual('concurrent principal B remains isolated', concurrentB, '1');

console.log('RLS foundation checks passed.');
