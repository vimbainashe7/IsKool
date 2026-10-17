// Preserve the existing backend entry point while sharing guarded startup.
process.argv.push('--backend');
await import('./dev-iskool.mjs');
