import {spawnSync} from "node:child_process"
import path from "node:path"
const connection=process.env.ISKOOL_RLS_TEST_DATABASE_URL
if(!connection){console.error("NOT RUN: set ISKOOL_RLS_TEST_DATABASE_URL for an isolated local Supabase test database. Production RLS is unverified.");process.exit(1)}
const url=new URL(connection)
if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname)){console.error("Refusing to seed RLS fixtures on a non-local database. Use an isolated local test instance.");process.exit(1)}
const result=spawnSync("psql",["-X","-v","ON_ERROR_STOP=1","-f",path.join("supabase","tests","rls-security.sql")],{stdio:"inherit",env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1)}})
if(result.error)console.error("NOT RUN: PostgreSQL psql is unavailable.")
process.exit(result.status??1)
