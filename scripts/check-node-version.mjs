const major = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);

if (major !== 22) {
  console.error(`FAIL Node version: expected Node 22.x, received ${process.version}.`);
  console.error('Use the repository-pinned version from .node-version/.nvmrc before installing or running IsKool.');
  process.exit(1);
}

console.log(`PASS Node version ${process.version}`);
