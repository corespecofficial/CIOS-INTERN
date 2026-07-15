import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tenant student pages never execute global wallet, rewards, or notes pages", async () => {
  const paths = [
    "src/app/(org-student-portal)/s/[orgSlug]/wallet/page.tsx",
    "src/app/(org-student-portal)/s/[orgSlug]/rewards-hub/page.tsx",
    "src/app/(org-student-portal)/s/[orgSlug]/notes/page.tsx",
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.doesNotMatch(source, /@\/app\/\(app\)\//, path);
    assert.match(source, /getActiveOrg\(orgSlug\)/, path);
  }
});

test("tenant edge guard checks live account status before trusting membership cache", async () => {
  const source = await read("src/proxy.ts");
  const statusLookup = source.indexOf('.select("id, status")');
  const membershipHit = source.indexOf("const hit = await cacheGet", statusLookup);
  assert.ok(statusLookup >= 0 && membershipHit > statusLookup);
  assert.match(source, /appUser\?\.status !== "active"/);
});

test("finance foreign references are constrained to the active organization", async () => {
  const source = await read("src/app/actions/org-finance.ts");
  assert.match(source, /org_finance_clients[\s\S]*?\.eq\("org_id",c\.org\.id\)/);
  assert.match(source, /ownedInvoice[\s\S]*?\.eq\("org_id",c\.org\.id\)/);
});
