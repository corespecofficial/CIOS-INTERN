# Cospronos Org Space — Operations and Recovery

## Production

- Application: `https://cios-intern.vercel.app`
- Founder portal: `/o/cospronos-video-editing-class-6kxds-d44249`
- Intern portal: `/s/cospronos-video-editing-class-6kxds-d44249`
- Reports: `/o/cospronos-video-editing-class-6kxds-d44249/reports`
- Timezone: `Africa/Lagos`
- Programme: 14 July–14 October 2026

## Roles

- Owner/org admin: members, learning, operations, reports, audit and configuration.
- Instructor: learning, attendance, reviews, performance and non-financial reports.
- Finance: financial workspace and finance reports.
- Intern/student: only their tenant workspace and their own operational, performance and disciplinary records.
- Super admin: platform governance and emergency investigation across tenants.

Authorization is enforced in server actions and route handlers. Hidden navigation is not treated as security.

## Founder workflow

1. Share the approved enrollment URL/code.
2. Confirm the intern in **Interns & staff** and assign the correct role/department.
3. Publish lessons and assignments.
4. Review attendance participation and submitted work hours.
5. Use **Growth Operations** for leads, outreach and content evidence.
6. Publish performance reviews; use disciplinary records only with documented evidence and human review.
7. Record clients, invoices, Flutterwave receipts and expenses in **Finance & Bookkeeping**.
8. Download dated evidence from **Programme Reports** and **Audit Logs**.

## Intern workflow

1. Create/sign into the CIOS account through the enrollment link.
2. Redeem the organization code and enter the `/s/<org-slug>` workspace.
3. Use **My Day**, attendance, assignments and work sessions for programme evidence.
4. Log assigned outreach/content activity in **Growth Workspace**.
5. Review scorecards/notices in **My Performance** and submit explanations where requested.

## Environment and deployment

Required production variables are documented in `.env.example`. Secrets must be set in Vercel, never committed. Pushes to `main` trigger a production build. Before release run:

```powershell
npm run test:org
npx eslint src/app/api/orgs src/app/actions src/components/org-operations
npm run build
```

## Backup

Supabase automatically provides platform backups according to the project plan. Before a high-risk migration:

1. Open Supabase Dashboard → Database → Backups and confirm the latest successful backup.
2. Export critical operational CSVs from Programme Reports and Audit Logs.
3. Store exports in a private, access-controlled company location.
4. Keep every schema change as a numbered migration under `src/db/migrations`.
5. Record the deployed Git commit and migration number.

Do not include service-role keys, access tokens or database passwords in exports or documentation.

## Recovery

1. Stop writes by placing the affected workflow behind its module flag or temporarily pausing deployment traffic.
2. Identify the last known-good Vercel deployment and Git commit.
3. Determine whether the incident is application-only or involves database data.
4. For application-only incidents, redeploy the last known-good commit without deleting production data.
5. For database incidents, use Supabase backup restoration/support appropriate to the plan. Restore into an isolated project first when possible.
6. Validate organization counts, memberships, programme records, audit append-only protection, RLS and Security Advisor results.
7. Rotate credentials if disclosure is suspected, update Vercel variables, redeploy, then revoke old credentials.
8. Document the incident and verification evidence.

Never use `git reset --hard`, destructive SQL, or production table truncation as a recovery shortcut.

## Security checklist

- Supabase Security Advisor: zero warnings/errors.
- RLS enabled and browser grants revoked for confidential operations tables.
- Service-role key used only on the server.
- Founder/finance and disciplinary exports have explicit role gates.
- CSV cells beginning with formula characters are neutralized.
- Flutterwave webhook signatures and transaction verification enforced.
- Audit records append-only.
- HTTPS required for submitted evidence/receipt links.
- Tenant ID included in every operational query and mutation.
- Previously shared Supabase and Flutterwave credentials must be rotated before live payments.

## Known limitations

- Vercel Hobby runs builds and cron work with platform limits; duplicate Git webhook builds may queue and the redundant build is normally canceled.
- PDF printing uses the browser’s print-to-PDF flow; evidence-grade CSV is the canonical export.
- Email/Ably/Cloudinary show `unknown` in health until their optional production variables are configured.
- Credential rotation requires coordinated Supabase/Flutterwave and Vercel updates to avoid downtime.
