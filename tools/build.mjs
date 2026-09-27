// Copies only the public site into dist/, which is what Vercel serves.
// Notes, tooling and secrets (PLAN.md, tools/, .env, originals) never ship.
//   node tools/build.mjs
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const PUBLIC = ['index.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'assets'];

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const path of PUBLIC) cpSync(path, `dist/${path}`, { recursive: true });
console.log(`dist/ <- ${PUBLIC.join(', ')}`);
