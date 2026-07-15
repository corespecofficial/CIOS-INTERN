#!/usr/bin/env node
import assert from "node:assert/strict";

const baseUrl = (process.env.ASSURANCE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let accounts;
try { accounts = JSON.parse(process.env.ASSURANCE_ACCOUNTS || "[]"); } catch { throw new Error("ASSURANCE_ACCOUNTS must be valid JSON"); }
if (!Array.isArray(accounts) || accounts.length < 2) throw new Error("Provide at least two dedicated assurance accounts");
for (const account of accounts) {
  if (!account.cookie || !account.ownSlug || !account.deniedSlug) throw new Error("Each account needs cookie, ownSlug and deniedSlug");
  assert.notEqual(account.ownSlug, account.deniedSlug);
  const own = await fetch(`${baseUrl}/s/${encodeURIComponent(account.ownSlug)}/classroom`, { headers: { cookie: account.cookie }, redirect: "manual" });
  const denied = await fetch(`${baseUrl}/s/${encodeURIComponent(account.deniedSlug)}/classroom`, { headers: { cookie: account.cookie }, redirect: "manual" });
  assert.equal(own.status, 200, `${account.name || account.ownSlug} cannot enter own tenant (${own.status})`);
  assert.equal(denied.status, 404, `${account.name || account.ownSlug} crossed into ${account.deniedSlug} (${denied.status})`);
  await own.body?.cancel(); await denied.body?.cancel();
}
console.log(`PASS: ${accounts.length} identities remained isolated across ${accounts.length * 2} authenticated tenant checks.`);
