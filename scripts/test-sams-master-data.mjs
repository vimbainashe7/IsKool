import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const runtimePassword = randomBytes(24).toString('hex');

// The default target is the disposable Supabase container used by CI. Windows
// native replay passes an explicit loopback URL; hosted URLs are always refused.
const url = process.env.MASTER_DATA_TEST_URL;
let connection;
if (url) {
  connection = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname) || !connection.pathname.startsWith('/iskool_master_test_')) throw new Error('Only explicitly named disposable local databases are permitted.');
}
const container = connection ? null : execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' }).trim().split(/\r?\n/).find(name => name.startsWith('supabase_db_'));
if (!connection && !container) throw new Error('Disposable Supabase test container required.');
function sql(text, role = 'postgres', allowFailure = false) {
  const args = ['-X', '-q', '--set', 'ON_ERROR_STOP=1', '--username', role, '--dbname', connection?.pathname.slice(1) ?? 'postgres'];
  const result = connection
    ? spawnSync(process.env.PSQL_PATH ?? 'psql', ['-h', connection.hostname, '-p', connection.port || '5432', ...args], { input: text, encoding: 'utf8', env: { ...process.env, PGPASSWORD: role === 'postgres' ? connection.password : runtimePassword } })
    : spawnSync('docker', ['exec', '-i', ...(role === 'postgres' ? [] : ['-e', `PGPASSWORD=${runtimePassword}`]), container, 'psql', ...(role === 'postgres' ? [] : ['-h', '127.0.0.1']), ...args], { input: text, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) throw new Error(`Disposable SQL failed: ${result.error?.message ?? result.stderr.replaceAll(runtimePassword, '[REDACTED]')}`);
  return result;
}
sql(readFileSync('scripts/sql/sams-master-data-fixtures.sql', 'utf8'));
sql(`ALTER ROLE iskool_master_data_test PASSWORD '${runtimePassword}';`);
const checks = sql(readFileSync('scripts/sql/sams-master-data-rls.sql', 'utf8'), 'iskool_master_data_test').stdout;
console.log(checks.split(/\r?\n/).filter(line => line.includes('PASS ')).join('\n').trim());
const settings = sql(readFileSync('scripts/sql/school-settings-rls.sql', 'utf8'), 'iskool_master_data_test');
console.log((settings.stdout + settings.stderr).split(/\r?\n/).filter(line=>line.includes('PASS ')).join('\n').trim());
sql("UPDATE public.memberships SET status='inactive' WHERE id='a3000000-0000-4000-8000-000000000002';");
sql(`BEGIN; SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000002',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000002',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true); DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.students) OR iskool.can_manage_student_records('a1000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Disabled membership still has access'; END IF; END; $$; ROLLBACK;`, 'iskool_master_data_test');
console.log('PASS disabled membership denied through restricted runtime connection');
sql("UPDATE public.memberships SET status='inactive' WHERE id='a3000000-0000-4000-8000-000000000001';");
sql(`BEGIN; SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true); DO $$ DECLARE changed integer; BEGIN IF iskool.can_manage_school_settings('a1000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Disabled Admin retains settings authority'; END IF; UPDATE public.schools SET name='Denied',branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001'; GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Disabled Admin changed settings'; END IF; END; $$; ROLLBACK;`, 'iskool_master_data_test');
sql("UPDATE public.memberships SET status='active' WHERE id='a3000000-0000-4000-8000-000000000001';");
console.log('PASS disabled Admin cannot mutate school settings');
sql("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='iskool_master_aps_test') THEN CREATE ROLE iskool_master_aps_test LOGIN INHERIT NOSUPERUSER NOBYPASSRLS; END IF; END; $$; GRANT iskool_aps_runtime TO iskool_master_aps_test;");
sql(`ALTER ROLE iskool_master_aps_test PASSWORD '${runtimePassword}';`);
const aps = sql('SELECT id FROM public.students;', 'iskool_master_aps_test', true);
if (aps.status === 0 || !aps.stderr.includes('permission denied')) throw new Error('APS must not have direct master-data access');
console.log('PASS APS direct student-table access denied');
const apsBranding=sql('UPDATE public.schools SET name=\'Denied\',branding_version=branding_version+1;', 'iskool_master_aps_test', true);
if (apsBranding.status===0 || !apsBranding.stderr.includes('permission denied')) throw new Error('APS must not mutate school branding');
console.log('PASS APS school branding writes denied');
