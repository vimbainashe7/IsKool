import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {readLocalEnv} from './helpers/local-env.mjs';
import {assertHealthyApis} from './helpers/preflight.mjs';
async function main(){
 const env=readLocalEnv(['.env','apps/sams-api/.env'],process.env);
 if(process.env.CI||env.NODE_ENV!=='development'||env.ISKOOL_ENVIRONMENT!=='development'||!env.DEV_SEED_PASSWORD||env.SAMS_INTERNAL_ENABLED!=='true')throw Error('Approved configured development services required.');
 await assertHealthyApis();
 const response=await fetch('http://127.0.0.1:3000/sign-in',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Start the connected launcher.');
 const child=spawn(process.execPath,[resolve('frontend_base/node_modules/@playwright/test/cli.js'),'test','tests/e2e/authoritative-dashboards.spec.ts','--workers=1'],{cwd:resolve('frontend_base'),env:{...process.env,ISKOOL_LIVE_AUTH:'true',ISKOOL_E2E_PORT:'3000',ISKOOL_TEST_PASSWORD:env.DEV_SEED_PASSWORD},stdio:'inherit'});
 process.exitCode=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',code=>done(code??1));});
}
main().catch(()=>{console.error('Dashboard live smoke failed. Check approved development services and docs/acceptance/VIM-62-DASHBOARDS.md. Private diagnostics withheld.');process.exitCode=1;});
