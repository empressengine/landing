import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsBuild = join(root, 'docs-site', 'build');
const dist = join(root, 'dist');
const target = join(dist, 'docs');

if (!existsSync(docsBuild)) {
  console.error('docs-site/build missing — run build:docs first');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(docsBuild, target, { recursive: true });
console.log('Merged docs-site/build → dist/docs');
