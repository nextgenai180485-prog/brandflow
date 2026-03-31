

## Brandflow — Complete Pre-Build Planning Document

### What Brandflow Is

Brandflow is an **AI social media operating system** for small businesses, starting with medspas. It takes minimal input from a business owner (brand info, assets, a content request) and produces ready-to-approve social media content — images, videos, captions — across platforms. The owner reviews, approves, and publishes. Over time, the system learns from approvals/rejections to improve output quality automatically.

The core differentiator: **approval-first automation**. Unlike tools that require users to think like social media managers, Brandflow does the creative work and presents it for a quick yes/no.

---

### What We Want to Achieve (MVP)

A medspa owner can:
1. Sign up and create a brand in under 5 minutes
2. Submit a content request in plain language
3. Receive AI-enhanced, brand-aware content back
4. Approve/reject/revise in a fast review interface
5. Move approved content into a publish pipeline
6. See the system improve over time

---

### Architecture Overview

```text
┌─────────────────────────────────────────────────┐
│                EXPERIENCE LAYER                  │
│  Landing · Auth · Onboarding · Dashboard         │
│  Brands · Library · Requests · Approvals         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              ORCHESTRATION LAYER                 │
│  Edge Functions (TypeScript)                     │
│  Request intake → Plan → Stage execution         │
│  DB-driven state machine (jobs + job_stages)     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│               PROVIDER LAYER                     │
│  Gemini · OpenAI · Fal · ElevenLabs · others    │
│  Unified adapter interface with fallbacks        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                DATA LAYER                        │
│  Supabase: PostgreSQL + Auth + Storage           │
│  Tables: workspaces, brands, campaigns, assets,  │
│  create_requests, plans, jobs, job_stages,       │
│  artifacts, approvals, publish_jobs, audit_events│
└─────────────────────────────────────────────────┘
```

---

### 1. Page Structure & Navigation

**Public pages (no auth):**
| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, value prop, how-it-works, CTA |
| `/login` | Email/password + Google OAuth |
| `/signup` | Account creation |
| `/reset-password` | Password reset flow |

**App pages (authenticated, inside AppShell with sidebar):**
| Route | Purpose |
|-------|---------|
| `/dashboard` | Home — pending approvals, queue, campaign health |
| `/brands` | Brand list |
| `/brands/new` | Brand onboarding wizard |
| `/brands/:id` | Brand detail + settings |
| `/library` | Asset library (uploaded + generated) |
| `/requests` | Content request list |
| `/requests/new` | Create request wizard |
| `/requests/:id` | Request detail + generation status |
| `/approvals` | Approval queue |
| `/approvals/:id` | Review workspace (the core differentiator screen) |
| `/schedule` | Publishing queue + status |
| `/settings` | Workspace settings |

**AppShell sidebar navigation:**
- Dashboard
- Brands
- Library
- Requests
- Approvals
- Schedule
- Settings

---

### 2. Database Schema

All tables use UUID primary keys, `created_at`/`updated_at` timestamps, and RLS.

**Core entities:**

| Table | Key columns | Purpose |
|-------|-------------|---------|
| `workspaces` | name, slug, owner_id | Multi-tenant root |
| `user_roles` | user_id, role (enum: admin/editor/viewer) | RBAC — separate from profiles |
| `profiles` | user_id, display_name, avatar_url | User metadata |
| `brands` | workspace_id, name, logo_url, website, voice_tone, target_audience, colors | Brand identity |
| `assets` | brand_id, type (logo/product/lifestyle), storage_path, metadata | Uploaded brand assets |
| `campaigns` | brand_id, name, status, goal | Content grouping |
| `create_requests` | brand_id, campaign_id, family, goal, aspect_ratio, status (draft→submitted→queued→in_progress→awaiting_review→approved→completed→failed) | Content request intake |
| `request_assets` | request_id, asset_id | Links assets to requests |
| `plans` | request_id, family, variant, stage_plan (jsonb), provider_route (jsonb), approval_route | AI-generated execution plan |
| `jobs` | plan_id, request_id, status | Execution container |
| `job_stages` | job_id, stage_name, status (pending→running→retrying→done→error), provider_used, cost, latency_ms, output (jsonb) | Granular stage tracking |
| `artifacts` | job_id, stage_id, type (concept/script/image/video/voice/review_packet), storage_path, version, metadata | Generated outputs |
| `approvals` | request_id, artifact_id, status (pending→approved→rejected→revision_requested), reviewer_id | Approval decisions |
| `approval_decisions` | approval_id, decision, feedback, decided_by, decided_at | Audit trail for each decision |
| `publish_jobs` | artifact_id, platform, status (draft→scheduled→publishing→published→failed), scheduled_at, published_at | Publishing state |
| `audit_events` | entity_type, entity_id, action, actor_id, metadata | Full audit trail |

**RLS strategy:**
- All tables scoped to workspace via `has_workspace_access(auth.uid(), workspace_id)` security definer function
- Roles checked via `has_role()` security definer function (never client-side)
- Profiles: users read/update only their own

---

### 3. Generation Pipeline (Request → Output)

**Step-by-step flow:**

```text
1. USER submits create_request
   → status: submitted

2. EDGE FUNCTION: enhance-request
   → Reads brand context (voice, assets, audience)
   → Calls AI to enhance the brief (better prompt, concept ideas)
   → Writes enhanced data back to request
   → status: queued

3. EDGE FUNCTION: plan-request  
   → Reads enhanced request + brand context
   → Calls AI to generate Plan Object (family, stages, provider route)
   → Writes plan to plans table
   → Creates job + job_stages rows
   → status: in_progress

4. EDGE FUNCTION: execute-stage (called per stage)
   → Reads current stage from job_stages
   → Routes to appropriate provider adapter
   → Stores output artifact
   → Advances to next stage or marks awaiting_review
   → For heavy compute (video): writes to task_queue for Python worker

5. When all required stages complete:
   → Assembles review packet (artifact references)
   → status: awaiting_review

6. USER reviews in approval workspace
   → Approve → status: approved → ready for publish
   → Reject → status: revision_requested → reopens from appropriate stage
   → Edit → light modification, re-approve

7. PUBLISH
   → Creates publish_job per platform
   → Edge function or connector handles publishing
   → Status tracked: scheduled → publishing → published / failed
```

**Provider abstraction (in Edge Functions):**
```text
Each provider implements:
- generate(input) → output
- checkStatus(jobId) → status (for async providers)
- estimateCost(input) → cost estimate

Routing: Plan Object specifies provider per stage
Fallback: If primary fails, try next in route array
Tracking: Every call logged to job_stages with provider_used, cost, latency
```

---

### 4. Build Sequence

Matching the MVP Execution Roadmap phases, adapted for Lovable:

| Phase | What | Depends on |
|-------|------|-----------|
| **1. Foundation** | Landing page, app shell, design system (ElevenLabs palette already done) | Nothing |
| **2. Auth + Profiles** | Supabase Cloud, auth pages, profiles table, protected routes, user_roles table | Phase 1 |
| **3. Core Schema** | All DB tables via migrations, RLS policies, security definer functions | Phase 2 |
| **4. Brand Onboarding** | Brand creation wizard, asset upload to Supabase Storage, brand detail page | Phase 3 |
| **5. Request Flow** | Create request wizard, request list/detail, request status tracking | Phase 4 |
| **6. Generation Pipeline** | Edge functions (enhance, plan, execute), provider adapters, artifact storage | Phase 5 |
| **7. Approval Workspace** | Approval queue, review screen (left: content, right: preview), approve/reject/revise actions | Phase 6 |
| **8. Publishing** | Publish queue, status tracking, basic publish action | Phase 7 |
| **9. Analytics/Learning** | Approval rate tracking, dashboard metrics, feedback signals into prompt enhancement | Phase 8 |

---

### 5. Key Design Decisions (Locked for Build)

| Decision | Choice |
|----------|--------|
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (email + Google) |
| AI Gateway | Lovable AI (Gemini) for MVP, provider abstraction for future |
| Orchestration | Edge Functions (TypeScript) — no LangGraph for MVP |
| Heavy compute | Python workers (future, when video merge needed) |
| State machine | DB-driven via jobs + job_stages tables |
| Storage | Supabase Storage for assets + artifacts |
| Design | ElevenLabs-inspired warm palette (already configured) |
| Font | Inter |
| First family | Product Videography or Social Content Batch (simplest pipeline) |
| RBAC | Separate user_roles table, security definer functions |

---

### 6. Open Questions for You

Before building, I want to confirm:

- **First family to implement end-to-end**: Your docs say Product Videography. Still the right starting point, or would you prefer Social Content Batch (text + image, simpler pipeline)?
- **n8n workflows**: You mentioned having workflow JSONs. Want to share them before we build the pipeline so the Edge Functions mirror your proven logic exactly?
- **Publishing integrations**: For MVP, is "mark as published" sufficient, or do you need actual social platform posting from day one?

Once you confirm these, we start building Phase 1.

