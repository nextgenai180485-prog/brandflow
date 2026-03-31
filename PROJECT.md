# Brandflow Project

## Purpose
Brandflow is being designed as an approval-first creative operating system.

The product should feel simple and premium to customers while maintaining enterprise-grade structure underneath.

Core principle:
- **Web = management + truth**
- **Telegram = operations + speed**
- customers should think in outcomes, not providers, prompts, or workflow plumbing

---

## Rolling engineering pointer (not locked charter)

Sections below that are explicitly **(Locked)** are **product charter**. They do not replace **as-built** readiness, CI gates, or env truth.

For **current** implementation status, operator commands, and Gate A/B/C sequencing, use (in order of operator utility):

| Doc | Role |
|-----|------|
| [`README.md`](README.md) | Monorepo map, env preflight entry points, links to all readiness docs |
| [`docs/operations/PLATFORM_READINESS_SUMMARY.md`](docs/operations/PLATFORM_READINESS_SUMMARY.md) | Single-page readiness snapshot |
| [`docs/operations/NEXT_STAGE_EXECUTION_PLAN.md`](docs/operations/NEXT_STAGE_EXECUTION_PLAN.md) | Must-do items, Phase 4–6 automation, gates |
| [`docs/operations/ENVIRONMENT_REQUIREMENTS.md`](docs/operations/ENVIRONMENT_REQUIREMENTS.md) | Canonical env matrix + runtime protocol |
| [`docs/testing/RUNTIME_SMOKE_TEST.md`](docs/testing/RUNTIME_SMOKE_TEST.md) | `smoke:runtime`, `verify:infra`, `phase6:gate:a`, Phase 4 media |
| [`docs/testing/CROSS_FAMILY_FIX_PRIORITIES.md`](docs/testing/CROSS_FAMILY_FIX_PRIORITIES.md) | Cross-cutting risks vs family-specific open items |
| `docs/testing/*_E2E_RESULTS.md` | Dated fixture evidence (tails = latest narrative per family) |

The **Implementation Order (Locked)** section near the end of this file names **early charter phases** (0–7). Actual delivery order in the monorepo has diverged (multiple families live in `apps/web`). Treat that block as **historical labeling**, not the day-to-day build checklist.

---

## Product Direction (Locked)
- Product name: **Brandflow**
- First wedge: **medspa**
- Second vertical: **e-commerce**
- Build strategy: **web-first**
- Native mobile: **not in first build**
- Operating principle: **approval-first**
- Product promise: creative outcomes / brand momentum, not tooling exposure
- Architecture principle: own the operating system, rent commodity generation utilities
- Performance principle: foreground fast, heavy work asynchronous/background

---

## Enterprise-Grade Principles
Brandflow must remain enterprise-grade from the beginning.

This means:
- typed contracts
- explicit state models
- provider abstraction
- **Product Videography (web MVP):** new plans align `providerRoute` / `providerKey` with live adapters (see ADR-004); `job_stages.provider_used` and artifact metadata remain the audit source for work already completed
- approval boundaries
- auditability
- artifact lineage/versioning
- request-to-output traceability
- structured retries/fallbacks
- clean separation between product UX and orchestration internals

At the same time, customer UX must remain easy:
- minimal required input
- progressive disclosure
- outcome-first language
- no Airtable/no-code feel
- no provider/model choices exposed to customers

---

## MVP Starting Families (Locked)
1. **UGC Video**
2. **AI Spokesperson Video**
3. **Product Videography**
4. **Commercial-Style Ad** *(scaffold + contract in repo; execution slices follow ADR-022)*
5. **Publish & Schedule** *(scaffold + contract in repo; execution slices follow ADR-023 / ADR-024)*

These are the first implementation families.

Later families:
- Storyboard-to-Video
- Social Content Batch
- Creative Transformation

---

## Top-Level Family Map
### User-facing families
- Social Content Batch
- UGC Video
- AI Spokesperson Video
- Commercial-Style Ad
- Product Videography
- Publish & Schedule *(scaffold in repo)*
- Storyboard-to-Video
- Creative Transformation

### Internal engines
- Prompt / concept engine
- Prompt enhancement engine
- Image analysis engine
- Video analysis engine
- Image generation adapter
- Video generation adapter
- Voice generation engine
- Music generation engine
- Scene engine
- Merge / composition engine
- Approval engine
- Publishing connector engine
- Creative transformation engine

---

## MVP Stack (Recommended)
- **GitHub**: repo hosting and collaboration
- **Monorepo**
- **Lovable**: build environment
- **Next.js + TypeScript**: frontend/product app
- **Supabase**: Postgres, auth, storage
- **Python open-source LangGraph**: orchestration runtime
- **SigNoz**: observability (open-source)
- **OpenAI / OpenRouter / Gemini / Kie / Byteplus / WaveSpeed / Fal / ElevenLabs / Resend / Sentry**: external services

### Important infrastructure decisions
- Use **open-source LangGraph**, not managed, for now
- Use **Supabase as system of record**
- Build **Brandflow’s own execution/approval UI** rather than depending on LangGraph visualization
- Use **SigNoz** for logs/metrics/traces

---

## Architecture Layers
### 1. Experience Layer
Customer-facing surfaces:
- Brand Setup
- Asset Library
- Create Request / Campaign entry
- Review / Approve
- Publish (later)

### 2. Family Layer
- UGC Video
- AI Spokesperson Video
- Product Videography
- Commercial-Style Ad (scaffold)
- Publish & Schedule (scaffold)
- and other families later

### 3. Engine Layer
Shared execution capabilities:
- planning
- analysis
- generation
- scenes
- approvals
- delivery

### 4. Provider Layer
Provider-specific integrations:
- OpenAI
- Gemini
- Kie
- Fal
- Byteplus
- WaveSpeed
- Fal
- ElevenLabs
- others later

---

## Canonical Entities (Locked)
- Workspace / Organization
- Brand
- Asset
- Character
- Voice
- Campaign
- Create Request
- Workflow Family
- Workflow Variant
- Job
- Job Stage
- Scene
- Generated Artifact
- Approval
- Publish Job

---

## Canonical Workflow States (Locked)
### Request-level
- draft
- submitted
- intake_validated
- queued
- in_progress
- awaiting_review
- awaiting_approval
- approved
- rejected
- completed
- failed
- cancelled

### Stage-level
- pending
- ready
- running
- retrying
- blocked
- awaiting_input
- awaiting_approval
- done
- error
- skipped

### Publish-level
- draft
- ready_to_publish
- scheduled
- publishing
- published
- publish_failed
- withheld

---

## Aspect Ratio Rule (Locked)
Aspect ratio is first-class across the system.

It must exist in:
- request schema
- planning
- generation stages
- output validation
- approval/review UI

MVP supported values:
- `9:16`
- `16:9`

---

## Approval-First MVP Policy (Locked)
Approval-first means:
- high-impact outputs do not auto-publish by default
- generation and publishing are separate decisions
- each family has a default approval route
- approval happens against a structured review packet
- approval decisions are auditable
- rejection must create a revision path

### Family defaults
- UGC Video: review after draft
- AI Spokesperson Video: mandatory approval after draft
- Product Videography: review after draft

---

## Planner Contract (Locked)
The Planning Agent receives normalized request context and returns a **Plan Object**.

The planner decides:
- family
- variant
- stage plan
- provider route
- approval route
- risk level
- rerun points
- expected outputs

The planner must consider:
- requested family (if explicit)
- goal / what_to_make
- assets
- aspect ratio
- brand context
- campaign context
- provider capabilities
- approval policy
- compliance/risk flags

---

## Plan Object (Locked)
The Plan Object includes:
- plan_id
- request_id
- brand_id
- campaign_id
- workspace_id
- family
- variant
- goal
- requested_outputs
- aspect_ratio
- target_platforms
- resolved_assets
- input_summary
- missing_inputs
- assumptions
- stage_plan
- provider_route
- expected_artifacts
- rerun_points
- finalization_rules
- risk_level
- compliance_flags
- approval_route
- requires_human_review
- priority
- latency_tier
- cost_tier
- fallback_policy
- created_at
- planned_by
- plan_version

---

## Typed LangGraph or TypeScript Execution State (Locked)
Shared runtime execution state sections:
- identity
- request
- plan
- assets
- execution
- artifacts
- approval
- audit
- errors

This state model is the execution contract for LangGraph nodes.

Rules:
- typed writes only
- explicit stage transitions
- versioned artifacts
- durable approval state
- provider attempts tracked
- aspect ratio preserved throughout

---

## MVP Family Execution Blueprints
### UGC Video
Stages:
1. intake
2. validate request
3. analyze assets
4. concept generation
5. scene planning
6. image/reference generation (if needed)
7. video generation
8. merge/finalize
9. review packet
10. approval
11. finalization

Execution contract note:
- Required artifacts: `concept`, `scene_plan`, `final_video`, `review_packet`
- Optional artifacts: `scene_clips`, `reference_frames`
- Revision should reopen from `concept_generation`, `scene_planning`, `video_generation`, or `merge_or_finalize` based on requested change scope (see ADR-018)
- UGC-specific stages: `scene_planning` and `merge_or_finalize`

### AI Spokesperson Video
Stages:
1. intake
2. validate request
3. resolve character + voice
4. script generation/cleanup
5. voice generation
6. optional avatar image lock
7. video generation
8. review packet
9. mandatory approval
10. finalization

Execution contract note:
- Required artifacts: `script`, `voice_track`, `final_video`, `review_packet`
- Optional artifact: `avatar_image`
- Revision should reopen from `script_generation`, `voice_generation`, or `video_generation` based on requested change scope (see ADR-009)

### Product Videography
Stages:
1. intake
2. validate request
3. analyze assets
4. generate start/end/transition prompts
5. generate start frame
6. generate end frame
7. generate motion video
8. review packet
9. approval
10. finalization

---

## Supabase Database Schema Status
### Migrations created
Under:
- `brandflow/infra/supabase/migrations/`

Created:
1. `001_init_workspaces_brands_campaigns.sql`
2. `002_init_assets_characters_voices.sql`
3. `003_init_create_requests.sql`
4. `004_init_plans_jobs_job_stages.sql`
5. `005_init_scenes_artifacts.sql`
6. `006_init_approvals_audit_errors.sql`
7. `007_init_publish_jobs.sql`
8. `008_add_indexes_and_uniques.sql`

### Tables included in MVP v1
- workspaces
- brands
- campaigns
- assets
- characters
- voices
- create_requests
- request_assets
- plans
- jobs
- job_stages
- scenes
- artifacts
- approvals
- approval_decisions
- audit_events
- job_errors
- publish_jobs

---

## Repo / Module Architecture (Recommended)
```bash
brandflow/
  apps/
    web/
  services/
    orchestrator/
  packages/
    types/
    ui/
    config/
    schemas/
    workflow-catalog/
  infra/
    supabase/
    scripts/
  docs/
    architecture/
    product/
    decisions/
  .github/
```

### Important module boundaries
- `apps/web`: product UI and API surface
- `services/orchestrator`: LangGraph runtime and provider routing; full Product Videography provider chain (**analysis/concept** **ADR-005**, **image** **ADR-006**, **video** **ADR-007**) can run via Python CLI + subprocess when feature flags are set; default remains in-app TS.
- `packages/*`: shared types, schemas, UI, config, workflow catalog
- `infra/supabase`: SQL migrations and infra definitions

---

## Product Screen Map (MVP)
Main navigation:
- Home
- Brands
- Library
- Requests
- Approvals

Key screens:
- Dashboard
- Brand Setup / Brand Detail
- Asset Library
- Create Request guided flow
- Request Detail page
- Approval Queue
- Review screens per family

UX rule:
- must feel modern, premium, and understandable in seconds
- must not feel like Airtable or a no-code builder

References considered:
- MagicBrief (creative briefing/research clarity)
- Cal.com (clean modern product/system shape)

---

## Data Boundaries (Locked)
### Durable business/system data goes to Supabase
Store:
- brands
- campaigns
- assets
- requests
- plans
- jobs
- stages
- scenes
- artifacts
- approvals
- audit events
- publish jobs

### Runtime observability goes to SigNoz
Store:
- traces
- logs
- metrics
- latency
- retry rates
- failure rates
- provider health

### Never persist as normal durable product data
- secrets
- unbounded raw provider payloads
- unvalidated outputs
- silent overwrites
- unstable vendor-only junk data

---

## Implementation Order (Locked)
### Phase 0
- repo scaffold
- environment setup
- Supabase project
- core DB schema
- typed contracts
- LangGraph service skeleton
- provider adapter interfaces
- app shell

### Phase 1
- auth
- brands
- asset library
- request flow
- request list/detail
- approval queue UI
- artifact preview support

### Phase 2
- planner service
- plan persistence
- job creation
- job stage tracking
- audit logging
- approval object creation
- retry/rerun primitives

### Phase 3
- Product Videography first

### Phase 4
- AI Spokesperson Video

### Phase 5
- UGC Video

### Phase 6
- hardening layer

### Phase 7
- next families

---

## Current best next steps (rolling)

Use **`docs/operations/NEXT_STAGE_EXECUTION_PLAN.md`** (especially **§ Phase 6 — Gate A** and **Gate A** under Stage gates): `phase6:gate:a`, runtime bundle with dev, **`docs/testing/STRUCTURED_FAMILY_E2E_CHECKLIST.md`**, and documented follow-ups (CSA UI parity, PV Start execution 500, PS §5).

For env and infra discipline: **`docs/operations/ENVIRONMENT_REQUIREMENTS.md`** and **`docs/testing/RUNTIME_SMOKE_TEST.md`**.

---

## Non-Negotiables
- enterprise-grade architecture from day one
- customer experience stays simple and premium
- approval-first remains real, not cosmetic
- aspect ratio remains first-class
- provider abstraction remains enforced
- artifacts are versioned
- audit trail is durable
- no spreadsheet/no-code product feel
