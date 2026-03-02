import fs from 'fs';
import path from 'path';
import { resources } from '../src/locales/index.ts';

type Dict = Record<string, any>;

function walk(dir: string, out: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function getByPath(obj: Dict, keyPath: string) {
  const parts = keyPath.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function scanKeys(fileContent: string) {
  const keys: string[] = [];
  const re = /\bt\(\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fileContent))) {
    const k = m[1]?.trim();
    if (!k) continue;
    keys.push(k);
  }
  return keys;
}

function main() {
  const root = path.resolve(process.cwd(), 'src');
  const files = walk(root).filter(f => /\.(ts|tsx)$/.test(f));

  const langs = Object.keys(resources);
  const missing: Record<string, Record<string, number>> = {};

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const keys = scanKeys(content);
    for (const key of keys) {
      for (const lang of langs) {
        const dict = (resources as any)[lang] as Dict;
        const exists = getByPath(dict, key) !== undefined;
        if (!exists) {
          missing[lang] ||= {};
          missing[lang][key] = (missing[lang][key] || 0) + 1;
        }
      }
    }
  }

  for (const lang of langs) {
    const entries = Object.entries(missing[lang] || {}).sort((a, b) => b[1] - a[1]);
    console.log(`\n=== Missing keys (${lang}) total: ${entries.length} ===`);
    for (const [k, c] of entries.slice(0, 200)) {
      console.log(`${c}\t${k}`);
    }
    if (entries.length > 200) console.log(`... ${entries.length - 200} more`);
  }
}

main();
