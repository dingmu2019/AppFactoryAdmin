import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(projectRoot, 'src');

function listFiles(dir, exts, ignoreDirs) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (ignoreDirs.has(e.name)) continue;
      out.push(...listFiles(path.join(dir, e.name), exts, ignoreDirs));
      continue;
    }
    const ext = path.extname(e.name);
    if (exts.has(ext)) out.push(path.join(dir, e.name));
  }
  return out;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getObjectLiteralForExportedConst(sourceFile, constName) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (decl.name.text !== constName) continue;
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) return null;
      return decl.initializer;
    }
  }
  return null;
}

function propNameToString(name) {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  return null;
}

function extractKeyPathsFromObjectLiteral(obj) {
  const keys = new Set();
  function walk(node, prefix) {
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = propNameToString(prop.name);
      if (!key) continue;
      const next = prefix ? `${prefix}.${key}` : key;
      const v = prop.initializer;
      if (ts.isObjectLiteralExpression(v)) {
        walk(v, next);
        continue;
      }
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) {
        keys.add(next);
      }
    }
  }
  walk(obj, '');
  return keys;
}

function loadLocaleKeys(localeFilePath, exportedConstName) {
  const code = readText(localeFilePath);
  const sf = ts.createSourceFile(localeFilePath, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const obj = getObjectLiteralForExportedConst(sf, exportedConstName);
  if (!obj) {
    throw new Error(`Cannot find exported const ${exportedConstName} object literal in ${localeFilePath}`);
  }
  return extractKeyPathsFromObjectLiteral(obj);
}

function extractUsedKeysFromSource() {
  const files = listFiles(srcRoot, new Set(['.ts', '.tsx']), new Set(['node_modules', 'dist', 'build', '.git']));
  const used = new Set();
  const re = /\bt\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  for (const f of files) {
    const text = readText(f);
    let m;
    while ((m = re.exec(text))) {
      if (m[2].includes('${')) continue;
      used.add(m[2]);
    }
  }
  return used;
}

function setDiff(a, b) {
  const out = [];
  for (const k of a) if (!b.has(k)) out.push(k);
  out.sort();
  return out;
}

const zhFile = path.join(srcRoot, 'locales', 'zh.ts');
const enFile = path.join(srcRoot, 'locales', 'en.ts');

const zhKeys = loadLocaleKeys(zhFile, 'zh');
const enKeys = loadLocaleKeys(enFile, 'en');
const usedKeys = extractUsedKeysFromSource();

const missingZh = setDiff(usedKeys, zhKeys);
const missingEn = setDiff(usedKeys, enKeys);

const unusedZh = setDiff(zhKeys, usedKeys);
const unusedEn = setDiff(enKeys, usedKeys);

const report = {
  used: usedKeys.size,
  zh: { defined: zhKeys.size, missing: missingZh, unused: unusedZh },
  en: { defined: enKeys.size, missing: missingEn, unused: unusedEn }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
