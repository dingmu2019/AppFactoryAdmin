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

function getClassNameString(attr) {
  if (!attr.initializer) return null;
  if (ts.isStringLiteral(attr.initializer) || ts.isNoSubstitutionTemplateLiteral(attr.initializer)) {
    return attr.initializer.text;
  }
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    const e = attr.initializer.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  }
  return null;
}

function analyzeClassNames(className) {
  const tokens = new Set(className.split(/\s+/).filter(Boolean));
  const has = (t) => tokens.has(t);
  const anyPrefix = (prefix) => {
    for (const t of tokens) if (t.startsWith(prefix)) return true;
    return false;
  };
  const issues = [];

  if (has('bg-white') && !anyPrefix('dark:bg-')) issues.push('bg-white missing dark:bg-*');
  if (has('bg-slate-50') && !anyPrefix('dark:bg-')) issues.push('bg-slate-50 missing dark:bg-*');
  if (has('text-slate-900') && !anyPrefix('dark:text-')) issues.push('text-slate-900 missing dark:text-*');
  if (has('border-slate-200') && !anyPrefix('dark:border-')) issues.push('border-slate-200 missing dark:border-*');
  if (has('shadow-sm') && !anyPrefix('dark:shadow-') && !className.includes('dark:shadow')) {
    issues.push('shadow-sm may look strong in dark mode');
  }

  return issues;
}

const files = listFiles(srcRoot, new Set(['.tsx', '.ts']), new Set(['node_modules', 'dist', 'build', '.git']));
const results = [];

for (const filePath of files) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.ESNext, true, filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'className') {
      const className = getClassNameString(node);
      if (className) {
        const issues = analyzeClassNames(className);
        if (issues.length) {
          const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          results.push({
            file: path.relative(projectRoot, filePath),
            line: line + 1,
            column: character + 1,
            issues,
            className
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

results.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
process.stdout.write(`${JSON.stringify({ count: results.length, results }, null, 2)}\n`);

