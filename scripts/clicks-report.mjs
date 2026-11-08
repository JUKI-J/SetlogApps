#!/usr/bin/env node
// Click report from Workers Analytics Engine (dataset setlogapps_clicks).
// Usage: node scripts/clicks-report.mjs [days=14]
// Needs CF_ACCOUNT_ID and CF_API_TOKEN (Account Analytics:Read) in env or .env. Token is never printed.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?(CF_ACCOUNT_ID|CF_API_TOKEN)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { CF_ACCOUNT_ID: acct, CF_API_TOKEN: token } = process.env;
if (!acct || !token) {
  console.error('CF_ACCOUNT_ID / CF_API_TOKEN not set. Put them in SetlogApps/.env (git-ignored):\n  CF_ACCOUNT_ID=...\n  CF_API_TOKEN=...   # Account Analytics:Read');
  process.exit(1);
}
const days = Math.max(1, Math.min(90, parseInt(process.argv[2], 10) || 14));
const sql = `SELECT toDate(timestamp) AS day, blob1 AS slug, blob5 AS src, blob4 AS pos, SUM(_sample_interval) AS clicks
FROM setlogapps_clicks WHERE timestamp > NOW() - INTERVAL '${days}' DAY
GROUP BY day, slug, src, pos ORDER BY day DESC, slug, src, pos FORMAT JSON`;

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/analytics_engine/sql`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: sql,
});
const text = await res.text();
if (!res.ok) { console.error(`HTTP ${res.status}: ${text.slice(0, 500)}`); process.exit(1); }
const rows = JSON.parse(text).data || [];
if (!rows.length) { console.log(`No clicks in the last ${days} days.`); process.exit(0); }
const cols = ['day', 'slug', 'src', 'pos', 'clicks'];
const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
const fmt = (r) => cols.map((c, i) => String(r[c]).padEnd(w[i])).join('  ');
console.log(fmt(Object.fromEntries(cols.map((c) => [c, c]))));
console.log(w.map((n) => '-'.repeat(n)).join('  '));
rows.forEach((r) => console.log(fmt(r)));
console.log(`\ntotal: ${rows.reduce((s, r) => s + Number(r.clicks), 0)} clicks / ${days} days`);
