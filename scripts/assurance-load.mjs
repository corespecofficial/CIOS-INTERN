#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const baseUrl = (process.env.ASSURANCE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Math.max(1, Math.min(100, Number(process.env.ASSURANCE_CONCURRENCY || 20)));
const iterations = Math.max(1, Math.min(10000, Number(process.env.ASSURANCE_ITERATIONS || 500)));
const maxP95 = Number(process.env.ASSURANCE_MAX_P95_MS || 1800);
const maxErrorRate = Number(process.env.ASSURANCE_MAX_ERROR_RATE || 0.01);
let accounts = [];
try { accounts = JSON.parse(process.env.ASSURANCE_ACCOUNTS || "[]"); } catch { throw new Error("ASSURANCE_ACCOUNTS must be valid JSON"); }

const publicScenarios = [
  { name: "health", path: "/api/health", expected: [200] },
  { name: "landing", path: "/", expected: [200] },
];

function scenariosFor(account) {
  const own = encodeURIComponent(account.ownSlug);
  return [
    { name: "classroom", path: `/s/${own}/classroom`, expected: [200], cookie: account.cookie },
    { name: "chat", path: `/s/${own}/chat`, expected: [200], cookie: account.cookie },
    { name: "reports", path: `/o/${own}/reports`, expected: account.host ? [200] : [404], cookie: account.cookie },
    ...(account.deniedSlug ? [{ name: "tenant-denial", path: `/s/${encodeURIComponent(account.deniedSlug)}/classroom`, expected: [404], cookie: account.cookie }] : []),
  ];
}

const scenarios = [...publicScenarios, ...accounts.flatMap(scenariosFor)];
if (scenarios.length === publicScenarios.length) console.warn("No authenticated accounts supplied; running public capacity smoke only.");
const results = [];
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= iterations) return;
    const scenario = scenarios[index % scenarios.length];
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${scenario.path}`, {
        headers: scenario.cookie ? { cookie: scenario.cookie } : {},
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      results.push({ name: scenario.name, ms: performance.now() - started, ok: scenario.expected.includes(response.status), status: response.status });
      await response.body?.cancel();
    } catch { results.push({ name: scenario.name, ms: performance.now() - started, ok: false, status: 0 }); }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
const sorted = results.map(r => r.ms).sort((a,b) => a-b);
const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
const failed = results.filter(r => !r.ok);
const summary = {
  baseUrl, requests: results.length, concurrency, failures: failed.length,
  errorRate: failed.length / Math.max(1, results.length),
  p50Ms: Math.round(percentile(.5)), p95Ms: Math.round(percentile(.95)), p99Ms: Math.round(percentile(.99)),
  byScenario: Object.fromEntries(scenarios.map(s => {
    const rows = results.filter(r => r.name === s.name);
    const times = rows.map(r => r.ms).sort((a,b) => a-b);
    const at = (p) => Math.round(times[Math.min(times.length - 1, Math.floor(times.length * p))] || 0);
    return [s.name, { requests: rows.length, failures: rows.filter(r => !r.ok).length, p50Ms: at(.5), p95Ms: at(.95), statuses: [...new Set(rows.map(r => r.status))] }];
  })),
};
console.log(JSON.stringify(summary, null, 2));
if (summary.errorRate > maxErrorRate || summary.p95Ms > maxP95) process.exitCode = 1;
