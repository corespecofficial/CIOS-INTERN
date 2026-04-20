# CIOS Public Portals — Master Plan

> Strategic re-architecture to split admin/intern-bound features into **public-facing portals**, each with its own onboarding, role, UX, and monetisation strategy. Super admins retain oversight of all public portal activity.

**Owner:** Joshua Agbo (CEO, Cospronos Media)
**Drafted:** 2026-04-20
**Status:** Awaiting approval to begin Phase 0

---

## 1. Problem & Goal

**Problem today.** All of Institution, Company, Gov, Partner, Marketplace, Creative Spaces, Investors, Opportunities, Hackathons, Study Buddy, AI Hub, Documents, Corporate, Recruiter, Startup live inside `(app)` — the authenticated intern/admin portal. There is no way for a non-intern (an investor, a recruiter, a buyer, a student, a hackathon applicant, a course trainer) to use these features without being onboarded as an "intern". This:

- Blocks public discovery and growth loops (no SEO-indexable public portal pages)
- Confuses role expectations (recruiter sees intern sidebar)
- Forces one-size-fits-all UX instead of tailored experiences per role
- Ties monetisation to the intern-only funnel — can't charge a public buyer without making them an intern first

**Goal.** Each portal becomes a **standalone public-facing product** with its own:
1. Role (`investor`, `recruiter`, `instructor`, `student`, `public_user`, etc.)
2. Branded shell (logo, nav, colours — no intern sidebar)
3. Public-first browse experience (SEO-visible, no login wall)
4. Gated actions (apply, buy, book, post) that require the correct registered role
5. Super-admin oversight dashboard showing activity, counts, revenue, conversion
6. Monetisation hooks (paywalls, commissions, subscriptions)

---

## 2. Target Architecture

### 2.1 Route groups after refactor

```
src/app/
├── (marketing)          # unchanged: corporate/brand site
├── (auth)               # unchanged: Clerk sign-in/up
├── (app)                # intern + staff portal (trimmed)
├── (public-portal)      # NEW: shared shell for all public portals
│   ├── layout.tsx       # public chrome (CIOS logo, minimal top nav, footer)
│   ├── marketplace/
│   ├── creative-space/
│   ├── investors/
│   ├── opportunities/
│   ├── hackathons/
│   ├── startups/
│   ├── study-buddy/
│   ├── ai-hub/
│   ├── documents/
│   └── corporate/
├── (recruiter-portal)   # NEW: recruiter-only shell
├── (investor-portal)    # NEW: investor-only shell
├── (instructor-portal)  # NEW: instructor-only shell
├── (institution-portal) # NEW
├── (company-portal)     # NEW
├── (gov-portal)         # NEW
├── (partner-portal)     # NEW
```

Each portal has three "faces":
- **Public browse** — anyone can see, no login required (SEO-indexable)
- **Action gate** — prompts sign-up with the right role when they try to act
- **Authed portal** — their own dedicated experience after login

### 2.2 Roles added

Current roles: `intern`, `team_lead`, `admin`, `super_admin`, `instructor`, `moderator`, `finance`, `support`, `recruiter`, `mentor`, `alumni`

**NEW roles:**
- `public_user` — baseline registered public (can buy, apply, book, chat with Study Buddy, use AI Hub)
- `investor` — KYC-lite verified investor (sees startups, pitches, portfolio)
- `startup_founder` — public intern / alumni pitching a startup (can be combined with `public_user` or upgraded)
- `partner_org` — institution / company / government / partner org admin

Most of these can be **applied-for** via self-service onboarding → super-admin approves/rejects → role changes → user lands in their portal on next login.

### 2.3 Sign-in routing logic

One universal sign-in screen. After Clerk auth, the `/post-auth` route inspects role and redirects:

| Role | Landing |
|---|---|
| `intern`, `team_lead`, `alumni`, `mentor` | `/dashboard` (current intern portal) |
| `admin`, `super_admin`, `moderator`, `finance`, `support` | `/dashboard` (staff portal) |
| `recruiter` | `/recruiter` (recruiter portal) |
| `investor` | `/investor/dashboard` (investor portal) |
| `instructor` | `/instructor/dashboard` (instructor portal) |
| `public_user` | wherever they came from, or `/marketplace` default |
| `partner_org` | `/partner-portal` (or variant by org type) |

### 2.4 Cloudinary 24-hour TTL for public users

All assets uploaded by `public_user` / `investor` / `startup_founder` / `instructor` land in folders tagged `public-ephemeral/*` with a 24-hour TTL via Cloudinary's auto-delete API. A visible banner during upload warns: *"Your file will be auto-deleted after 24 hours unless you upgrade."*

**Implementation:** a single helper `uploadToCloudinaryEphemeral(file, meta)` tags the asset and schedules a server-side cron (`/api/cron/cloudinary-sweep`) to delete expired assets daily. Already have `cron/` pattern in codebase.

---

## 3. Competitor Analysis & Exploitable Weaknesses

For each portal, I've picked 2-3 competitors to study, pulled out **what they do well** (match that), and **their weaknesses** (exploit those). Africa-first positioning is a recurring advantage.

### 3.1 Marketplace → **Gumroad, Creative Market, Etsy (digital), Sellfy**

| Competitor | Strength | Weakness we exploit |
|---|---|---|
| Gumroad | Simple checkout, creator-friendly | Plain UI, no community, high fees (10%+) |
| Creative Market | Beautiful product cards | Walled garden, no creator story |
| Etsy digital | Massive reach | Generic, hostile to creators lately |

**CIOS edge:** Gorgeous product cards + creator story pulled from their CIOS profile (XP, badges, rank) as social proof. Africa-localised pricing (₦, NGN auto-conversion via Paystack which is already in deps). Buyer sees "This creator is top 5% of CIOS interns" — no one else can say that.

**Table-stakes features:** product listings, categories, search, creator profile, reviews, checkout, digital download delivery.

**Differentiators to add:**
- **Creator credibility badge** (pulled from CIOS gamification)
- **"Built during the CIOS internship" provenance** — story-mode product pages
- **Tip jar** (pay-what-you-want for free products)
- **Revenue share to the CIOS pool** (small cut funds the cohort)
- **Creator referral commission** (creator's referred buyer earns them extra %)

### 3.2 Creative Spaces → **Teachable, Podia, Thinkific, Udemy**

| Competitor | Strength | Weakness |
|---|---|---|
| Teachable | Great instructor tooling | Expensive ($39-299/mo), clunky student UX |
| Udemy | Huge catalog | Race-to-the-bottom pricing, low instructor earnings |
| Podia | Bundles memberships + courses | UI feels dated |

**CIOS edge:** Courses by **vetted Africa-based instructors** — instructors must be CIOS-approved, so quality is baseline-guaranteed. No Udemy-style junk. Price in ₦ natively. Live + recorded hybrid built-in.

**Differentiators:**
- **Instructor vetting badge** (mandatory quality gate)
- **Learner progress tracked to CIOS certificate** (if learner becomes a public_user they can collect transcript)
- **Cohort-based by default** (cohorts convert better than evergreen; Maven proved this)
- **Public instructor profile pages** with syllabus, reviews, video intro

### 3.3 Investors → **AngelList / Wellfound, Republic, Gust, SeedInvest, Crowdcube**

| Competitor | Strength | Weakness |
|---|---|---|
| AngelList | Network effects, syndicates | Complex, US-focused, intimidating |
| Republic | Beautiful UX, accredited + retail | US-only regulatory moat |
| Crowdcube (EU) | Good retail UX | Fees opaque |

**CIOS edge:** Africa-first startup discovery. Pitches are **from vetted CIOS alumni/interns** — again, quality baseline. Investor onboarding is a guided beautiful form (not a 40-field US-centric KYC nightmare).

**Differentiators:**
- **Gorgeous investor onboarding** (progress bar, 6 steps max: profile, accreditation, cheque size, thesis, portfolio, preferences)
- **Startup pitch pages with intern provenance** ("Founded by a CIOS top-10% intern in the Lagos 2026 cohort")
- **Live dashboard**: deals watched, deals passed, portfolio IRR, founder updates
- **Deal room** (NDA-gated) per startup
- **Syndicate lite** (group multiple retail investors into one cheque)

### 3.4 Opportunities + Recruiter → **LinkedIn Jobs, Wellfound, Hired, Seek, Indeed**

| Competitor | Strength | Weakness |
|---|---|---|
| LinkedIn | Everyone's there | Spammy, noisy, generic |
| Wellfound | Startup-focused | US-centric, weak outside tech |
| Hired | Reverse marketplace, great fit | Enterprise pricing, opaque |

**CIOS edge:** Every candidate has a verified CIOS performance profile (rank, XP, completed projects). Recruiters see this instead of a dead CV.

**Differentiators:**
- **"CIOS-verified" candidate badge** with live data
- **Application includes latest portfolio project auto-attached**
- **Recruiter paywall** for posting (free 1 job / paid unlimited)
- **Saved searches + alerts**
- **Diversity stats per posting** (auto-computed)

### 3.5 Hackathons → **Devpost, MLH, HackerEarth, Kaggle**

| Competitor | Strength | Weakness |
|---|---|---|
| Devpost | De-facto standard | Outdated UI, slow, confusing judging |
| MLH | Great student events | US/EU focused |
| HackerEarth | Corporate hackathons | Boring |

**CIOS edge:** Beautiful hackathon page, embedded in landing page, Africa-first themes, prize amounts transparent in ₦ and USD, live leaderboard.

**Differentiators:**
- **Hero hackathon card on the public landing page** (SEO + conversion)
- **Team matchmaking** — "looking for a designer" tags
- **Live submission gallery** (not just a list of links)
- **Judge inbox** with AI-assisted scoring suggestions
- **Winner story pages** (social proof feeder)

### 3.6 Study Buddy → **ChatGPT Study Mode, Khan Academy, Quizlet, Brainly**

| Competitor | Strength | Weakness |
|---|---|---|
| ChatGPT | Powerful AI | Not grade-aware, easy to cheat |
| Khan Academy | Curriculum depth | Not conversational, slow |
| Brainly | Q&A community | Low-quality answers |

**CIOS edge:** RAG against user-uploaded textbooks/notes + CIOS-curated curriculum. Grade-aware (secondary school / university / professional). Safe-mode for under-18.

**Differentiators:**
- **Curriculum picker** (JAMB, WAEC, A-Levels, IB, undergrad, AWS cert, etc.)
- **Upload textbook → quiz yourself** (RAG flow)
- **"Show your work" mode** (forces explanations, discourages cheating)
- **Parent dashboard** (for under-18 accounts, integrates with existing Guardian portal)
- **Streak-based gamification** (XP for Study Buddy use, proven retention boost)

### 3.7 AI Hub → **ChatGPT, Claude.ai, Poe, Anthropic Console**

| Competitor | Strength | Weakness |
|---|---|---|
| ChatGPT | Brand, model quality | Overcrowded UI, paywall everywhere |
| Claude.ai | Clean UX, artifacts | US-focused, no community |
| Poe | Multiple models | Confusing, laggy |

**CIOS edge:** Africa's AI workspace. Clean Claude-style UI with **CIOS-branded** empty state. Users can create Skills (prompt templates), Tools (connectors), and share them in a community gallery.

**Differentiators:**
- **Community Skills/Tools gallery** (shareable prompt assets)
- **Africa-local integrations** (Paystack, Flutterwave, Konga, Jumia)
- **Multi-model** (OpenAI, Anthropic, Gemini — user picks)
- **Connector marketplace** (basic MCP-style integrations)
- **Logo:** CIOS paper-plane in top-left (per your spec)

### 3.8 Documents → **Canva Docs, Rezi, Teal, Enhancv, Kickresume, Resume.io**

| Competitor | Strength | Weakness |
|---|---|---|
| Rezi | ATS-optimised | Paywall heavy, US-centric |
| Teal | Great AI copilot | Single-format focus |
| Canva Docs | Beautiful templates | Generic, not career-aware |

**CIOS edge:** CV is auto-populated from the user's CIOS profile (real work, real XP, real projects). CV generation is FREE. Other docs (cover letter, portfolio PDF, proposal, pitch deck, report) are paid.

**Differentiators:**
- **Free CV generator** (multiple templates: modern, executive, creative, academic)
- **Paid: cover letter, pitch deck, business plan, statement of purpose, LinkedIn optimizer, portfolio site**
- **AI-tailored to job posting** (paste JD → tailored CV)
- **One-click export** (PDF, DOCX, public link)

### 3.9 Institution/Company/Gov/Partner → **Salesforce Partner Community, HubSpot Partner Directory, AWS Partner Network**

All of these are enterprise-heavy, slow, gatekept.

**CIOS edge:** Lightweight **self-service application** → super admin reviews in <48h → inviting partner gets a branded portal with their logo, their team seats, their dashboard.

**Differentiators per portal:**

| Portal | Core workflow |
|---|---|
| **Institution** (schools, universities) | Bulk-enrol students, see cohort progress, issue certified transcripts |
| **Company** (employers) | Post jobs, browse talent, sponsor cohorts, commission projects |
| **Government** (agencies, ministries) | Fund programmes, view impact dashboards, compliance reports |
| **Partner Programme** (agencies, accelerators, NGOs) | Co-brand cohorts, revenue share, referral tracking |

---

## 4. Portal Feature Matrix (what each portal ships with)

Each portal targets parity with the top competitor on day 1 + 2 differentiators. Full matrix lives in `/docs/portal-features/` (one file per portal, created during each phase).

Standard portal structure:
```
Public Browse → Conversion Gate → Onboarding → Portal Home → Core Tabs → Super-Admin Overview
```

### 4.1 Shared UI patterns (MUST follow in every public-portal page)

To keep the public-portal surface visually coherent, every browse page adopts
the same hero pattern (established in Phase 1 Marketplace, Phase 2 Creative
Spaces, aligned in Phase 3 Opportunities):

- **Hero layout:** full-width `<div>` with a *radial-gradient* backdrop (two
  gradients, 1000×400 at 20%/0% and 900×400 at 90%/10%, colour-tinted per
  portal), centred content, `maxWidth: 1100` inner container, `textAlign: center`.
- **Title:** 44px (32px mobile), `fontWeight: 900`, `letterSpacing: -1.4`,
  `lineHeight: 1.05`, `fontFamily: 'Space Grotesk'`. One or two words
  highlighted via gradient span (`WebkitBackgroundClip: text`).
- **Subtitle:** `maxWidth: 620`, `fontSize: 16`, `color: #94A3B8`,
  `lineHeight: 1.55`.
- **CTAs:** exactly two, centred via `justifyContent: center`, with the
  primary CTA on a portal-specific gradient and the secondary on a ghost
  `rgba(255,255,255,0.04)` pill.
- **Eyebrow badge:** short UPPERCASE label (e.g. "COHORT-BASED LEARNING"),
  portal-tinted, above the H1.

**Header centring:** the PublicPortalHeader uses CSS Grid
`grid-template-columns: 1fr auto 1fr` so the nav sits dead-centre between
logo (left) and actions (right). On narrow widths the grid collapses to
`[logo actions] / [nav nav]` so the nav becomes a horizontally-scrollable
row under the top strip.

**Portal accent colours** (used for hero highlight gradient + CTA):
| Portal | Primary | Secondary |
|---|---|---|
| Marketplace | `#A855F7` purple | `#7C3AED` |
| Creative Spaces | `#26C6DA` teal | `#0EA5E9` |
| Opportunities | `#FB923C` orange | `#F97316` |
| Hackathons (Phase 4) | `#F59E0B` amber | `#D97706` (planned) |
| Investors (Phase 5) | `#10B981` emerald | `#059669` (planned) |
| Study Buddy (Phase 6) | `#60A5FA` blue | `#3B82F6` (planned) |
| AI Hub (Phase 6) | `#8B5CF6` violet | `#7C3AED` (planned) |
| Documents (Phase 6) | `#EC4899` pink | `#DB2777` (planned) |

All future phases MUST adopt this hero pattern and the grid-centred nav,
or provide a documented reason to deviate.

---

## 5. Phased Execution Plan

**Rule of engagement:** Each phase ends with a working, shipped, tested portal. No half-portals. Each phase is ~3–7 days of focused work. Work order is chosen to ship commercial value first.

### Phase 0 — FOUNDATION (1–2 days)

Pre-work that every portal depends on. Must ship first. **Zero user-facing changes yet.**

- [ ] Add `public_user`, `investor`, `startup_founder`, `partner_org` roles to Clerk metadata + Supabase `users.role` enum
- [ ] Update `ROLE_ACCESS` in [src/proxy.ts](src/proxy.ts)
- [ ] Create `(public-portal)` route group with shared shell (header with CIOS logo, simple nav, footer — no intern sidebar)
- [ ] Create `(recruiter-portal)`, `(investor-portal)`, `(instructor-portal)`, `(institution-portal)`, `(company-portal)`, `(gov-portal)`, `(partner-portal)` stub layouts
- [ ] Build `<ConversionGate>` component — renders `children` for signed-in users with role X; renders sign-up CTA otherwise
- [ ] Build `<PortalOnboarding>` primitive — progress bar, step container, validation, submit
- [ ] Build `<AutoDeleteBanner>` + `uploadToCloudinaryEphemeral()` helper
- [ ] Add `/api/cron/cloudinary-sweep` endpoint
- [ ] Update `/post-auth` routing for new roles
- [ ] Add super-admin "Public Portals Oversight" dashboard skeleton at `/super-admin/public-portals`
- [ ] Remove trimmed sidebar items (Institution/Company/Gov/Partner/Investor/Marketplace/Creative/Hackathon/AI Hub/Study Buddy/Docs/Opportunities/Corporate) from intern view — keep visible only in super-admin preview mode

### Phase 1 — MARKETPLACE (3 days)

Public-first, highest commercial leverage, simplest auth model.

- [ ] Move `/marketplace` routes to `(public-portal)/marketplace`
- [ ] Redesign product card (creator credibility badge, XP, rank)
- [ ] Public product detail page (SEO meta, OpenGraph, schema.org)
- [ ] Conversion gate on "Buy" / "Request" — prompts sign-up as `public_user`
- [ ] Creator public profile pages
- [ ] Tip jar + pay-what-you-want
- [ ] Revenue share hooks (commission wiring to wallet)
- [ ] Super-admin dashboard tile: # public users, # products, GMV, top creators
- [ ] SEO sitemap generation for products

### Phase 2 — CREATIVE SPACES (4 days)

- [ ] Move `/creative-space` to `(public-portal)/creative-space`
- [ ] Redesigned rich course detail page (syllabus, instructor intro video, outcomes, reviews, Q&A)
- [ ] Public instructor profile pages (outside portal)
- [ ] Apply-to-teach flow (upgrade public_user → instructor via super-admin approval)
- [ ] Conversion gate on "Book" / "Enrol" — sign-up as `public_user`
- [ ] Instructor dedicated portal at `(instructor-portal)/` — my spaces, students, earnings, messages
- [ ] Paywall via Paystack (already in deps)
- [ ] Super-admin dashboard: spaces live, bookings, revenue, top instructors

### Phase 3 — OPPORTUNITIES + RECRUITER PORTAL (5 days)

- [ ] Move `/opportunities` to `(public-portal)/opportunities` (public browse)
- [ ] Conversion gate on "Apply" — sign-up as `public_user` (CIOS interns auto-qualify, public users need basic profile)
- [ ] Separate `(recruiter-portal)` with its own shell, dashboard, talent search, saved searches, analytics
- [ ] Recruiter onboarding (company, logo, verification)
- [ ] Recruiter paywall (free tier: 1 active job / paid tier: unlimited + premium features)
- [ ] CIOS-verified candidate badges on applications
- [ ] Auto-attach latest portfolio project
- [ ] Super-admin dashboard: active recruiters, paid recruiters, applications, placements, revenue

### Phase 4 — HACKATHONS (3 days)

- [ ] Move `/hackathons` to `(public-portal)/hackathons`
- [ ] Redesign listing + detail pages (this is a visual-polish-heavy phase)
- [ ] Hero hackathon card on `(marketing)` landing page
- [ ] Team matchmaking UI
- [ ] Live submission gallery + judge inbox
- [ ] Conversion gate on "Register" — sign-up as `public_user`
- [ ] Super-admin dashboard: active hackathons, participants, submissions, sponsor pipeline

### Phase 5 — INVESTORS + STARTUPS (5 days)

These are coupled — investor portal exists to see startups.

- [ ] Beautiful investor public landing page redesign
- [ ] Investor onboarding (6-step: profile → accreditation → cheque size → thesis → portfolio → prefs)
- [ ] `(investor-portal)` with deal flow, watchlist, portfolio, deal rooms
- [ ] `/startup` becomes public-facing — any public_user or intern can pitch
- [ ] Startup detail pages (SEO)
- [ ] NDA-gated deal room
- [ ] Super-admin dashboard: investors registered, cheque sizes, deals posted, introductions, closed rounds

### Phase 6 — STUDY BUDDY + AI HUB + DOCUMENTS (6 days)

These are the "public tools" trilogy.

- [ ] Move `/study-buddy` to `(public-portal)/study-buddy`, redesign as Claude/ChatGPT-style chat with curriculum picker, RAG upload, "show your work" mode, streak gamification
- [ ] Move `/ai-hub` to `(public-portal)/ai-hub`, redesign as Claude-style general AI workspace (CIOS logo top-left, no tools sidebar by default, user creates Skills/Tools/Connectors)
- [ ] Move `/documents` to `(public-portal)/documents`, free CV generator with 5+ templates, paid cover letter / pitch deck / business plan / SOP / portfolio site
- [ ] Paystack paywall for paid documents
- [ ] Super-admin dashboard: active users, docs generated, CV downloads, paid conversion rate

### Phase 7 — INSTITUTION / COMPANY / GOVERNMENT / PARTNER (7 days)

The "partner org" family — lowest volume, highest contract value.

- [ ] Create `(partner-portal)` shared shell (variants per org type)
- [ ] Self-serve application form for each org type
- [ ] Super-admin approval queue (`/super-admin/partner-requests`)
- [ ] Invite-by-email flow (pre-assigned role, lands in portal on first login)
- [ ] Per-portal dashboards:
  - **Institution:** bulk enrol, cohort progress, transcripts
  - **Company:** job posting, talent browse, sponsor a cohort, commission projects
  - **Government:** fund programmes, impact dashboards, compliance reports
  - **Partner:** co-branding, revenue share, referral tracking
- [ ] Super-admin oversight per org type

### Phase 8 — CORPORATE TRAINING (2 days)

- [ ] Move `/corporate` to the appropriate new portal (Company Portal most likely)
- [ ] Public-facing corporate training request page
- [ ] Super-admin: training requests pipeline

### Phase 9 — POLISH & LAUNCH (3 days)

- [ ] Full portal crawl — every link, every CTA, every form
- [ ] SEO audit (sitemap, robots, OG, schema.org for each portal)
- [ ] Lighthouse performance pass
- [ ] Mobile pass (all portals on 375px, 390px, 414px)
- [ ] Analytics wiring (posthog already in deps — wire conversion events)
- [ ] Cloudinary sweep cron verified running in production
- [ ] Launch announcement draft

---

## 6. Success Metrics (set baselines on Phase 0, review at every phase end)

- **Activation:** sign-ups per portal per week, onboarding completion rate
- **Engagement:** DAU/WAU per portal, time-to-first-action
- **Monetisation:** GMV (Marketplace), bookings revenue (Creative Spaces), recruiter paid conversions, investor deals progressed, paid documents
- **SEO:** pages indexed, organic impressions, organic signups
- **Operational:** super-admin response time on approvals, sweep cron success rate

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Refactor breaks existing intern portal | Strict route-group isolation; intern portal only loses top-nav items it no longer owns |
| Role sprawl confuses users | Single onboarding funnel; `public_user` is the default; all other roles upgraded from there |
| Cloudinary quota explosion | 24h TTL strictly enforced via cron; warn-before-upload banner mandatory |
| Paystack integration gaps | Already in deps; reuse wallet wiring proven in Marketplace |
| SEO cannibalisation | Each portal owns its own slug namespace (`/marketplace/*`, `/creative-space/*` etc.); no overlap |
| Scope creep | Phases are hard-gated; no phase skips; each ships before the next begins |

---

## 8. Out of scope (for this plan)

- Native mobile apps
- White-label reselling
- Multi-tenancy at DB level (single DB, role-based isolation is enough for now)
- Multi-currency beyond NGN + USD (Paystack supports enough for launch)
- Any re-architecture of the current intern/admin portal internals

---

## 9. Approval needed before I start

Please confirm:
1. ✅ The phased order (start with Marketplace? Or a different portal?)
2. ✅ New roles list (`public_user`, `investor`, `startup_founder`, `partner_org`)
3. ✅ Cloudinary 24h TTL for public-uploaded content
4. ✅ Free CV / paid other docs split
5. ✅ Recruiter paywall model (free 1 job / paid unlimited)
6. ✅ Marketplace commission model (platform takes X%?)

Reply with "approved" + any overrides, and I'll start Phase 0.
