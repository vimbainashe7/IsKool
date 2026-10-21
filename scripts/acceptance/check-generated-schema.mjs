import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {samePrismaSchema} from './helpers/preflight.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const generated=resolve(root,'node_modules/.prisma/client/schema.prisma');
if(!existsSync(generated)||!samePrismaSchema(readFileSync(generated,'utf8'),readFileSync(resolve(root,'database/prisma/schema.prisma'),'utf8'))){
 console.error('FAIL generated Prisma schema differs from canonical source. Run npm run prisma:generate; keep fields before model constraints and unique constraints before indexes.');
 process.exitCode=1;
}else console.log('PASS generated Prisma schema matches canonical source; launcher compatibility verified.');
