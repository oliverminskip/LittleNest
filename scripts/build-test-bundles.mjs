/**
 * Compiles the pure business-logic modules to plain ESM so `node --test` can
 * exercise the same code the app ships, without a test-runner dependency.
 */
import { build } from 'esbuild';
import { fileURLToPath, URL } from 'node:url';

const src = fileURLToPath(new URL('../src', import.meta.url));

await build({
  entryPoints: [`${src}/lib/funding.ts`, `${src}/lib/ratios.ts`, `${src}/lib/invoice.ts`, `${src}/lib/messages.ts`],
  outdir: fileURLToPath(new URL('../dist-test', import.meta.url)),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  alias: { '@': src },
  logLevel: 'warning',
});
