-- p392a: backfill missing user_role enum values
--
-- The TypeScript Role union (src/lib/db.ts) lists values that the SQL
-- enum never received. Updating users.role to any of these would fail
-- with `invalid input value for enum user_role: '<value>'`.
--
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction as a
-- query that references the new value — Postgres requires the addition
-- to commit first. So this lives in its own migration file. RUN THIS
-- BEFORE re-running p392_visitor_portal.sql.
--
-- All clauses use IF NOT EXISTS, so re-running is a no-op.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'mentor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'alumni';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'public_user';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'startup_founder';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner_org';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'creative_host';
