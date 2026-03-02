import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const apiRoot = path.join(repoRoot, 'src', 'app', 'api');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const DRY_RUN = (process.env.DRY_RUN || '').toLowerCase() === '1' || (process.env.DRY_RUN || '').toLowerCase() === 'true';
const INCLUDE_MUTATIONS = (process.env.INCLUDE_MUTATIONS || '').toLowerCase() === '1' || (process.env.INCLUDE_MUTATIONS || '').toLowerCase() === 'true';
const MAX_CONCURRENCY = Math.max(1, Math.min(20, Number(process.env.CONCURRENCY || 8)));
const OUT_FILE = process.env.OUT_FILE || path.join(repoRoot, 'reports', 'api_cli_smoke_next_report.json');

const isMutation = (method) => method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
const fillPathParams = (p) => {
  return (p || '').replace(/\/:([A-Za-z0-9_]+)/g, (_all, name) => {
    if (name.toLowerCase().includes('id')) return '/00000000-0000-0000-0000-000000000000';
    if (name.toLowerCase().includes('token')) return '/test-token';
    if (name.toLowerCase().includes('slug')) return '/test';
    return '/test';
  });
};

const makeCurl = (method, url, headers) => {
  const h = Object.entries(headers || {})
    .filter(([, v]) => v != null && String(v).length)
    .map(([k, v]) => `-H '${k}: ${String(v).replace(/'/g, "'\\''")}'`)
    .join(' ');
  const dataFlag = isMutation(method) ? `-H 'content-type: application/json' -d '{}'` : '';
  return `curl -i -X ${method} ${h} ${dataFlag} '${url}'`.replace(/\\s+/g, ' ').trim();
};

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
      else if (it.isFile() && it.name === 'route.ts') out.push(full);
    }
  }
  return out;
};

const toApiPath = (routeFile) => {
  const rel = path.relative(apiRoot, routeFile).replace(/\\\\/g, '/');
  const without = rel.replace(/\/route\.ts$/, '');
  const segs = without.split('/').filter(Boolean).map((s) => {
    if (s.startsWith('[') && s.endsWith(']')) return `:${s.slice(1, -1)}`;
    return s;
  });
  return '/api/' + segs.join('/');
};

const parseMethods = (content) => {
  const re = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\b/g;
  const methods = new Set();
  let m;
  while ((m = re.exec(content)) !== null) methods.add(m[1]);
  return Array.from(methods.values());
};

const collectEndpoints = () => {
  if (!fs.existsSync(apiRoot)) throw new Error(`Next API root not found: ${apiRoot}`);
  const files = walk(apiRoot);
  const endpoints = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const methods = parseMethods(content);
    for (const method of methods) {
      endpoints.push({ source: f, method, path: toApiPath(f) });
    }
  }
  return endpoints.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
};

const runPool = async (items, worker, concurrency) => {
  const results = new Array(items.length);
  let idx = 0;
  const runners = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await worker(items[cur], cur);
    }
  });
  await Promise.all(runners);
  return results;
};

const smokeTest = async (endpoints) => {
  const headers = {
    accept: 'application/json',
    ...(ACCESS_TOKEN ? { authorization: `Bearer ${ACCESS_TOKEN}` } : {}),
  };
  const toTest = endpoints.filter((e) => e.method === 'GET' || (INCLUDE_MUTATIONS && isMutation(e.method)));

  const worker = async (e) => {
    const filled = fillPathParams(e.path);
    const url = `${BASE_URL}${filled.startsWith('/') ? '' : '/'}${filled}`;
    const curl = makeCurl(e.method, url, headers);

    if (DRY_RUN) {
      return { ...e, url, curl, status: null, ok: null, contentType: null, bodySnippet: null, error: null };
    }

    try {
      const res = await fetch(url, { method: e.method, headers });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      return { ...e, url, curl, status: res.status, ok: res.ok, contentType: ct, bodySnippet: text.slice(0, 300), error: null };
    } catch (err) {
      return { ...e, url, curl, status: null, ok: false, contentType: null, bodySnippet: null, error: String(err?.message || err) };
    }
  };

  const results = await runPool(toTest, worker, MAX_CONCURRENCY);
  const summary = {
    baseUrl: BASE_URL,
    endpoints: endpoints.length,
    testedCount: results.length,
    ok2xx: results.filter((r) => r.status && r.status >= 200 && r.status < 300).length,
    unauthorized401: results.filter((r) => r.status === 401).length,
    forbidden403: results.filter((r) => r.status === 403).length,
    notFound404: results.filter((r) => r.status === 404).length,
    client4xx: results.filter((r) => r.status && r.status >= 400 && r.status < 500 && ![401, 403, 404].includes(r.status)).length,
    server5xx: results.filter((r) => r.status && r.status >= 500).length,
    networkErrors: results.filter((r) => r.status == null && r.error).length,
    htmlResponses: results.filter((r) => (r.contentType || '').includes('text/html')).length,
  };
  return { summary, results };
};

const main = async () => {
  const endpoints = collectEndpoints();
  const { summary, results } = await smokeTest(endpoints);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ summary, results }, null, 2), 'utf8');
  process.stdout.write(
    [
      `API Base: ${BASE_URL}`,
      `Endpoints (enumerated): ${summary.endpoints}`,
      `Tested: ${summary.testedCount}`,
      `2xx: ${summary.ok2xx}`,
      `401: ${summary.unauthorized401}`,
      `403: ${summary.forbidden403}`,
      `404: ${summary.notFound404}`,
      `4xx(other): ${summary.client4xx}`,
      `5xx: ${summary.server5xx}`,
      `Network errors: ${summary.networkErrors}`,
      `HTML responses: ${summary.htmlResponses}`,
      `Report: ${OUT_FILE}`,
    ].join('\n') + '\n'
  );
};

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + '\\n');
  process.exit(1);
});
