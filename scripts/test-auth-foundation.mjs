import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const authUser = 'iskool_auth_runtime_ci';
const authPassword = `ci_${randomUUID().replaceAll('-', '')}`;
const runtimeUser = 'iskool_aps_runtime_auth_ci';
const runtimePassword = `ci_${randomUUID().replaceAll('-', '')}`;
const samsRuntimeUser = 'iskool_sams_runtime_audit_ci';
const samsRuntimePassword = `ci_${randomUUID().replaceAll('-', '')}`;

function redact(value) {
  return value
    .replaceAll(authPassword, '[redacted-auth-password]')
    .replaceAll(runtimePassword, '[redacted-runtime-password]')
    .replaceAll(samsRuntimePassword, '[redacted-sams-runtime-password]');
}

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

function databaseUrl({ asAuth = false, asRuntime = false, asSamsRuntime = false } = {}) {
  if (asAuth) {
    return `postgresql://${authUser}:${authPassword}@127.0.0.1:5432/postgres`;
  }
  if (asRuntime) {
    return `postgresql://${runtimeUser}:${runtimePassword}@127.0.0.1:5432/postgres`;
  }
  if (asSamsRuntime) {
    return `postgresql://${samsRuntimeUser}:${samsRuntimePassword}@127.0.0.1:5432/postgres`;
  }
  return 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
}

function psqlResult(sql, { asAuth = false, asRuntime = false, asSamsRuntime = false, tuplesOnly = false } = {}) {
  const url = databaseUrl({ asAuth, asRuntime, asSamsRuntime });
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

function psql(sql, options) {
  const result = psqlResult(sql, options);
  if (result.status !== 0) {
    throw new Error(redact([result.stdout, result.stderr].filter(Boolean).join('\n')));
  }
  return result.stdout.trim();
}

function scalar(sql, options) {
  return psql(sql, { ...options, tuplesOnly: true })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !['BEGIN', 'COMMIT', 'ROLLBACK', 'SET', 'DO'].includes(line) &&
        !/^(INSERT|UPDATE|DELETE) /.test(line)
    )
    .join('\n');
}

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, received ${actual}`);
  }
  console.log(`ok - ${name}`);
}

function assertFails(name, sql, options = {}) {
  const result = psqlResult(sql, options);

  if (result.status === 0) {
    throw new Error(`${name}: expected statement to fail, but it succeeded`);
  }

  console.log(`ok - ${name}`);
}

function runSqlAsync(sql, { asAuth = false, asRuntime = false, asSamsRuntime = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        databaseUrl({ asAuth, asRuntime, asSamsRuntime }),
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
        reject(new Error(redact(stderr || stdout || `SQL exited with ${code}`)));
        return;
      }
      resolve(
        stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !['BEGIN', 'COMMIT', 'SET'].includes(line) && !/^(INSERT|UPDATE|DELETE) /.test(line))
          .join('\n')
      );
    });
  });
}

const ids = {
  school: '40000000-0000-4000-8000-000000000001',
  schoolB: '40000000-0000-4000-8000-000000000002',
  user: '50000000-0000-4000-8000-000000000001',
  userB: '50000000-0000-4000-8000-000000000002',
  membership: '60000000-0000-4000-8000-000000000001',
  membershipB: '60000000-0000-4000-8000-000000000002',
  session: '70000000-0000-4000-8000-000000000001',
  activeSession: '70000000-0000-4000-8000-000000000002',
  raceSession: '70000000-0000-4000-8000-000000000003',
  refreshA: '80000000-0000-4000-8000-000000000001',
  refreshB: '80000000-0000-4000-8000-000000000002',
  refreshRace: '80000000-0000-4000-8000-000000000003',
  refreshRaceSuccessorA: '80000000-0000-4000-8000-000000000004',
  refreshRaceSuccessorB: '80000000-0000-4000-8000-000000000005',
  continuation: '90000000-0000-4000-8000-000000000001',
  auditEvent: 'a0000000-0000-4000-8000-000000000001',
  auditEventCrossSchool: 'a0000000-0000-4000-8000-000000000002'
};

psql(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${authUser}') THEN
    CREATE ROLE ${authUser} LOGIN PASSWORD '${authPassword}' IN ROLE iskool_auth_runtime;
  ELSE
    ALTER ROLE ${authUser} LOGIN PASSWORD '${authPassword}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${runtimeUser}') THEN
    CREATE ROLE ${runtimeUser} LOGIN PASSWORD '${runtimePassword}' IN ROLE iskool_aps_runtime;
  ELSE
    ALTER ROLE ${runtimeUser} LOGIN PASSWORD '${runtimePassword}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${samsRuntimeUser}') THEN
    CREATE ROLE ${samsRuntimeUser} LOGIN PASSWORD '${samsRuntimePassword}' IN ROLE iskool_sams_runtime;
  ELSE
    ALTER ROLE ${samsRuntimeUser} LOGIN PASSWORD '${samsRuntimePassword}';
  END IF;
END
$$;

TRUNCATE
  public.audit_events,
  public.auth_login_continuations,
  public.auth_refresh_tokens,
  public.auth_sessions,
  public.user_credentials,
  public.membership_roles,
  public.memberships,
  public.users,
  public.schools
RESTART IDENTITY CASCADE;

INSERT INTO public.schools (id, name, status)
VALUES
  ('${ids.school}', 'Auth School', 'active'),
  ('${ids.schoolB}', 'Other Auth School', 'active');

INSERT INTO public.users (id, email, display_name, status)
VALUES
  ('${ids.user}', ' Teacher@School.Example ', 'Teacher', 'active'),
  ('${ids.userB}', 'other@example.test', 'Other User', 'active');

INSERT INTO public.memberships (id, user_id, school_id, status)
VALUES
  ('${ids.membership}', '${ids.user}', '${ids.school}', 'active'),
  ('${ids.membershipB}', '${ids.userB}', '${ids.schoolB}', 'active');

INSERT INTO public.membership_roles (membership_id, role_id)
SELECT '${ids.membership}'::uuid, id FROM public.roles WHERE key = 'teacher'
UNION ALL
SELECT '${ids.membershipB}'::uuid, id FROM public.roles WHERE key = 'teacher';

INSERT INTO public.user_credentials (user_id, password_hash)
VALUES ('${ids.user}', '$argon2id$v=19$m=65536,t=3,p=1$fixture$fixturehash');
`);

assertEqual(
  'auth runtime role is not superuser and does not bypass RLS',
  scalar(`
    SELECT string_agg(rolname || ':' || rolsuper || ':' || rolbypassrls, ',' ORDER BY rolname)
    FROM pg_roles
    WHERE rolname IN ('iskool_auth_runtime', '${authUser}');
  `),
  `iskool_auth_runtime:false:false,${authUser}:false:false`
);

assertEqual(
  'ordinary runtime role is not superuser and does not bypass RLS',
  scalar(`
    SELECT string_agg(rolname || ':' || rolsuper || ':' || rolbypassrls, ',' ORDER BY rolname)
    FROM pg_roles
    WHERE rolname IN ('iskool_aps_runtime', 'iskool_sams_runtime', '${runtimeUser}', '${samsRuntimeUser}');
  `),
  `iskool_aps_runtime:false:false,${runtimeUser}:false:false,iskool_sams_runtime:false:false,${samsRuntimeUser}:false:false`
);

assertEqual(
  'email normalization is database-enforced',
  scalar(`SELECT email_normalized FROM public.users WHERE id = '${ids.user}';`),
  'teacher@school.example'
);

assertEqual(
  'auth runtime can locate login identity and credential',
  scalar(
    `
      SELECT users.id || ':' || (user_credentials.password_hash LIKE '$argon2id$%')::text
      FROM public.users
      JOIN public.user_credentials ON user_credentials.user_id = users.id
      WHERE users.email_normalized = 'teacher@school.example';
    `,
    { asAuth: true }
  ),
  `${ids.user}:true`
);

assertEqual(
  'auth runtime resolves active membership roles',
  scalar(
    `
      SELECT string_agg(roles.key, ',' ORDER BY roles.key)
      FROM public.memberships
      JOIN public.membership_roles ON membership_roles.membership_id = memberships.id
      JOIN public.roles ON roles.id = membership_roles.role_id
      WHERE memberships.user_id = '${ids.user}' AND memberships.status = 'active';
    `,
    { asAuth: true }
  ),
  'teacher'
);

assertFails(
  'auth runtime cannot mutate users',
  `UPDATE public.users SET status = 'inactive' WHERE id = '${ids.user}';`,
  { asAuth: true }
);

assertFails(
  'auth runtime cannot create password credentials',
  `
    INSERT INTO public.user_credentials (user_id, password_hash)
    VALUES ('${ids.user}', '$argon2id$v=19$m=65536,t=3,p=1$other$other');
  `,
  { asAuth: true }
);

assertFails(
  'ordinary runtime cannot read password hashes',
  `SELECT password_hash FROM public.user_credentials WHERE user_id = '${ids.user}';`,
  { asRuntime: true }
);

assertFails(
  'ordinary runtime cannot read refresh token digests',
  `SELECT token_digest FROM public.auth_refresh_tokens;`,
  { asRuntime: true }
);

psql(
  `
    INSERT INTO public.auth_sessions (
      id,
      user_id,
      school_id,
      membership_id,
      allowed_scopes,
      expires_at
    )
    VALUES (
      '${ids.session}',
      '${ids.user}',
      '${ids.school}',
      '${ids.membership}',
      ARRAY['aps']::text[],
      now() + interval '14 days'
    );

    INSERT INTO public.auth_sessions (
      id,
      user_id,
      school_id,
      membership_id,
      allowed_scopes,
      expires_at
    )
    VALUES (
      '${ids.activeSession}',
      '${ids.user}',
      '${ids.school}',
      '${ids.membership}',
      ARRAY['aps', 'sams']::text[],
      now() + interval '14 days'
    );

    INSERT INTO public.auth_sessions (
      id,
      user_id,
      school_id,
      membership_id,
      allowed_scopes,
      expires_at
    )
    VALUES (
      '${ids.raceSession}',
      '${ids.user}',
      '${ids.school}',
      '${ids.membership}',
      ARRAY['aps']::text[],
      now() + interval '14 days'
    );

    INSERT INTO public.auth_refresh_tokens (
      id,
      session_id,
      token_digest,
      expires_at
    )
    VALUES (
      '${ids.refreshA}',
      '${ids.session}',
      'digest-a',
      now() + interval '14 days'
    );

    INSERT INTO public.auth_refresh_tokens (
      id,
      session_id,
      token_digest,
      expires_at
    )
    VALUES (
      '${ids.refreshB}',
      '${ids.session}',
      'digest-b',
      now() + interval '14 days'
    );

    INSERT INTO public.auth_refresh_tokens (
      id,
      session_id,
      token_digest,
      expires_at
    )
    VALUES (
      '${ids.refreshRace}',
      '${ids.raceSession}',
      'digest-race',
      now() + interval '14 days'
    );

    UPDATE public.auth_refresh_tokens
    SET consumed_at = now(), replaced_by_id = '${ids.refreshB}'
    WHERE id = '${ids.refreshA}';

    UPDATE public.auth_sessions
    SET reuse_detected_at = now(), revoked_at = now(), revoke_reason = 'refresh_reuse'
    WHERE id = '${ids.session}';

    INSERT INTO public.auth_login_continuations (
      id,
      user_id,
      verifier_digest,
      expires_at
    )
    VALUES (
      '${ids.continuation}',
      '${ids.user}',
      'continuation-digest',
      now() + interval '5 minutes'
    );
  `,
  { asAuth: true }
);

assertEqual(
  'auth runtime manages refresh token history',
  scalar(
    `
      SELECT count(*)::text
      FROM public.auth_refresh_tokens
      WHERE session_id = '${ids.session}'
        AND token_digest IN ('digest-a', 'digest-b');
    `,
    { asAuth: true }
  ),
  '2'
);

assertFails(
  'refresh token digest uniqueness is enforced',
  `
    INSERT INTO public.auth_refresh_tokens (session_id, token_digest, expires_at)
    VALUES ('${ids.session}', 'digest-b', now() + interval '14 days');
  `,
  { asAuth: true }
);

assertEqual(
  'auth runtime can consume one-time login continuation',
  scalar(
    `
      UPDATE public.auth_login_continuations
      SET consumed_at = now()
      WHERE id = '${ids.continuation}' AND consumed_at IS NULL
      RETURNING (consumed_at IS NOT NULL)::text;
    `,
    { asAuth: true }
  ),
  'true'
);

const validatedPrincipal = scalar(
  `
    SELECT auth_sessions.user_id || ':' || auth_sessions.school_id || ':' || auth_sessions.membership_id || ':' || roles.key
    FROM public.auth_sessions
    JOIN public.memberships ON memberships.id = auth_sessions.membership_id
    JOIN public.membership_roles ON membership_roles.membership_id = memberships.id
    JOIN public.roles ON roles.id = membership_roles.role_id
    WHERE auth_sessions.id = '${ids.activeSession}'
      AND auth_sessions.revoked_at IS NULL
      AND auth_sessions.expires_at > now()
      AND memberships.status = 'active'
      AND auth_sessions.allowed_scopes @> ARRAY['aps']::text[];
  `,
  { asAuth: true }
);

assertEqual(
  'auth runtime validates session and active membership before principal use',
  validatedPrincipal,
  `${ids.user}:${ids.school}:${ids.membership}:teacher`
);

assertEqual(
  'validated AuthPrincipal drives runtime RLS context',
  scalar(
    `
      BEGIN;
        DO $$
        BEGIN
          PERFORM set_config('iskool.user_id', '${ids.user}', true);
          PERFORM set_config('iskool.school_id', '${ids.school}', true);
          PERFORM set_config('iskool.membership_id', '${ids.membership}', true);
          PERFORM set_config('iskool.request_id', 'auth-foundation-test', true);
        END
        $$;
        SELECT count(*) FROM public.schools WHERE schools.id = '${ids.school}';
      COMMIT;
    `,
    { asRuntime: true }
  ),
  '1'
);

assertEqual(
  'validated AuthPrincipal cannot be overridden to another school',
  scalar(
    `
      BEGIN;
        DO $$
        BEGIN
          PERFORM set_config('iskool.user_id', '${ids.user}', true);
          PERFORM set_config('iskool.school_id', '${ids.schoolB}', true);
          PERFORM set_config('iskool.membership_id', '${ids.membership}', true);
          PERFORM set_config('iskool.request_id', 'auth-foundation-test', true);
        END
        $$;
        SELECT count(*) FROM public.schools WHERE schools.id = '${ids.schoolB}';
      COMMIT;
    `,
    { asRuntime: true }
  ),
  '0'
);

psql(`UPDATE public.memberships SET status = 'inactive' WHERE id = '${ids.membership}';`);

assertEqual(
  'inactive membership invalidates existing auth session validation',
  scalar(
    `
      SELECT count(*)::text
      FROM public.auth_sessions
      JOIN public.memberships ON memberships.id = auth_sessions.membership_id
      WHERE auth_sessions.id = '${ids.activeSession}'
        AND auth_sessions.revoked_at IS NULL
        AND auth_sessions.expires_at > now()
        AND memberships.status = 'active';
    `,
    { asAuth: true }
  ),
  '0'
);

psql(`UPDATE public.memberships SET status = 'active' WHERE id = '${ids.membership}';`);

const raceSql = (successorId, successorDigest) => `
  BEGIN;
    DO $$
    DECLARE
      locked_token_id uuid;
      locked_session_id uuid;
    BEGIN
      SELECT id, session_id
      INTO locked_token_id, locked_session_id
      FROM public.auth_refresh_tokens
      WHERE token_digest = 'digest-race'
      FOR UPDATE;

      IF locked_token_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.auth_refresh_tokens
        WHERE id = locked_token_id
          AND consumed_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > now()
      ) THEN
        INSERT INTO public.auth_refresh_tokens (id, session_id, token_digest, expires_at)
        VALUES ('${successorId}'::uuid, locked_session_id, '${successorDigest}', now() + interval '14 days');

        UPDATE public.auth_refresh_tokens
        SET consumed_at = now(), replaced_by_id = '${successorId}'::uuid
        WHERE id = locked_token_id;
      END IF;
    END
    $$;
  COMMIT;
`;

await Promise.all([
  runSqlAsync(raceSql(ids.refreshRaceSuccessorA, 'digest-race-successor-a'), { asAuth: true }),
  runSqlAsync(raceSql(ids.refreshRaceSuccessorB, 'digest-race-successor-b'), { asAuth: true })
]);

assertEqual(
  'concurrent refresh consumes exactly one presented token',
  scalar(
    `
      SELECT ((consumed_at IS NOT NULL) AND (replaced_by_id IS NOT NULL))::text
      FROM public.auth_refresh_tokens
      WHERE id = '${ids.refreshRace}';
    `,
    { asAuth: true }
  ),
  'true'
);

assertEqual(
  'concurrent refresh records one replacement pointer',
  scalar(
    `
      SELECT count(*)::text
      FROM public.auth_refresh_tokens
      WHERE id IN ('${ids.refreshRaceSuccessorA}', '${ids.refreshRaceSuccessorB}')
        AND id = (SELECT replaced_by_id FROM public.auth_refresh_tokens WHERE id = '${ids.refreshRace}');
    `,
    { asAuth: true }
  ),
  '1'
);

assertEqual(
  'concurrent refresh mints exactly one successor',
  scalar(
    `
      SELECT count(*)::text
      FROM public.auth_refresh_tokens
      WHERE session_id = '${ids.raceSession}'
        AND token_digest IN ('digest-race-successor-a', 'digest-race-successor-b');
    `,
    { asAuth: true }
  ),
  '1'
);

psql(
  `
    UPDATE public.auth_sessions
    SET reuse_detected_at = now(), revoked_at = now(), revoke_reason = 'refresh_reuse'
    WHERE id = '${ids.raceSession}';

    UPDATE public.auth_refresh_tokens
    SET reuse_detected_at = now()
    WHERE id = '${ids.refreshRace}';
  `,
  { asAuth: true }
);

assertEqual(
  'refresh replay is recorded and revokes the token family session',
  scalar(
    `
      SELECT auth_sessions.revoke_reason || ':' || (auth_sessions.reuse_detected_at IS NOT NULL)::text || ':' ||
        (auth_refresh_tokens.reuse_detected_at IS NOT NULL)::text
      FROM public.auth_sessions
      JOIN public.auth_refresh_tokens ON auth_refresh_tokens.session_id = auth_sessions.id
      WHERE auth_sessions.id = '${ids.raceSession}' AND auth_refresh_tokens.id = '${ids.refreshRace}';
    `,
    { asAuth: true }
  ),
  'refresh_reuse:true:true'
);

assertEqual(
  'SAMS runtime writes audit event in principal transaction context',
  scalar(
    `
      BEGIN;
        DO $$
        BEGIN
          PERFORM set_config('iskool.user_id', '${ids.user}', true);
          PERFORM set_config('iskool.school_id', '${ids.school}', true);
          PERFORM set_config('iskool.membership_id', '${ids.membership}', true);
          PERFORM set_config('iskool.request_id', 'audit-foundation-test', true);
        END
        $$;
        INSERT INTO public.audit_events (
          id,
          actor_user_id,
          actor_membership_id,
          school_id,
          action,
          entity_type,
          entity_id,
          before_value,
          after_value,
          request_id,
          reason
        )
        VALUES (
          '${ids.auditEvent}',
          '${ids.user}',
          '${ids.membership}',
          '${ids.school}',
          'invoice.record-payment',
          'invoice',
          'invoice-1',
          '{"balance":100}'::jsonb,
          '{"balance":0}'::jsonb,
          'audit-foundation-test',
          'payment received'
        );
        SELECT count(*)::text FROM public.audit_events WHERE id = '${ids.auditEvent}';
      COMMIT;
    `,
    { asSamsRuntime: true }
  ),
  '1'
);

assertFails(
  'SAMS runtime cannot update audit events',
  `UPDATE public.audit_events SET reason = 'tampered' WHERE id = '${ids.auditEvent}';`,
  { asSamsRuntime: true }
);

assertFails(
  'SAMS runtime cannot delete audit events',
  `DELETE FROM public.audit_events WHERE id = '${ids.auditEvent}';`,
  { asSamsRuntime: true }
);

assertFails(
  'SAMS runtime cannot insert cross-school audit event',
  `
    BEGIN;
      DO $$
      BEGIN
        PERFORM set_config('iskool.user_id', '${ids.user}', true);
        PERFORM set_config('iskool.school_id', '${ids.school}', true);
        PERFORM set_config('iskool.membership_id', '${ids.membership}', true);
        PERFORM set_config('iskool.request_id', 'audit-foundation-test', true);
      END
      $$;
      INSERT INTO public.audit_events (
        id,
        actor_user_id,
        actor_membership_id,
        school_id,
        action,
        entity_type,
        entity_id,
        request_id
      )
      VALUES (
        '${ids.auditEventCrossSchool}',
        '${ids.user}',
        '${ids.membership}',
        '${ids.schoolB}',
        'invoice.record-payment',
        'invoice',
        'invoice-2',
        'audit-foundation-test'
      );
    COMMIT;
  `,
  { asSamsRuntime: true }
);

console.log('Auth foundation checks passed.');
