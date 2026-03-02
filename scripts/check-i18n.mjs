import fs from 'fs';
import path from 'path';
import vm from 'vm';
import ts from 'typescript';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const srcRoot = path.join(repoRoot, 'src');
const localesFile = path.join(srcRoot, 'locales', 'index.ts');

const walk = (dir) => {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    const items = fs.readdirSync(cur, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else if (it.isFile()) out.push(full);
    }
  }
  return out;
};

const loadResources = () => {
  const source = fs.readFileSync(localesFile, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: localesFile,
  }).outputText;

  const silentConsole = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  const sandbox = {
    require,
    module: { exports: {} },
    exports: {},
    process,
    console: silentConsole,
    __dirname: path.dirname(localesFile),
    __filename: localesFile,
  };
  sandbox.exports = sandbox.module.exports;
  const orig = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
  try {
    vm.runInNewContext(js, sandbox, { filename: localesFile });
  } finally {
    console.log = orig.log;
    console.info = orig.info;
    console.warn = orig.warn;
    console.error = orig.error;
    console.debug = orig.debug;
  }
  const resources = sandbox.module.exports.resources || sandbox.exports.resources;
  if (!resources) throw new Error('Failed to load resources from src/locales/index.ts');
  return resources;
};

const getByPath = (obj, p) => {
  const parts = String(p || '').split('.').filter(Boolean);
  let cur = obj;
  for (const k of parts) {
    if (cur == null || typeof cur !== 'object' || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
};

const collectKeys = () => {
  const files = walk(srcRoot).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const counts = new Map();
  const re = /\bt\s*\(\s*(['"])([^'"]+)\1/g;

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(content)) !== null) {
      const key = m[2];
      if (!key || key.includes('${')) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
};

const main = () => {
  const resources = loadResources();
  const counts = collectKeys();

  const missingEn = [];
  const missingZh = [];

  for (const [key, count] of counts.entries()) {
    const en = getByPath(resources.en.translation, key);
    const zh = getByPath(resources.zh.translation, key);
    if (en === undefined) missingEn.push({ key, count });
    if (zh === undefined) missingZh.push({ key, count });
  }

  missingEn.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  missingZh.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const summary = {
    scannedFiles: counts.size,
    missingEn: missingEn.length,
    missingZh: missingZh.length,
  };

  process.stdout.write(JSON.stringify({ summary, missingEn, missingZh }, null, 2) + '\n');
};

main();
