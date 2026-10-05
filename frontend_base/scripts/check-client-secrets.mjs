import {readdir,readFile} from "node:fs/promises"
import path from "node:path"
const root=path.join(process.cwd(),".next","static")
const names=["SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SERVICE_ROLE","AI_API_KEY","NEXT_PUBLIC_OPENAI_KEY","NEXT_PUBLIC_ANTHROPIC_KEY","DATABASE_PASSWORD"]
const privateValues=[process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.AI_API_KEY,process.env.DATABASE_PASSWORD].filter(v=>v&&v.length>8)
let count=0;const failed=[]
async function scan(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await scan(file);else if(/\.(js|map)$/.test(file)){count++;const content=await readFile(file,"utf8");if(names.some(name=>content.includes(name))||privateValues.some(value=>content.includes(value)))failed.push(path.relative(root,file))}}}
try{await scan(root);if(failed.length){console.error(`FAIL: potential private secret reference in ${failed.length} client files (values withheld).`);process.exitCode=1}else console.log(`PASS: ${count} browser JS/map files scanned; no private secret names or configured private values found.`)}catch{console.error("Build the app before scanning client bundles.");process.exitCode=1}
