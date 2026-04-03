# Post-Upgrade Execution Plan

## Step 1 — Sync BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md
Update the architecture export to reflect the full 27-module + 4-layer system with the canonical 15-step pre-generation flow, all new engines, and the enterprise positioning.

## Step 2 — Create Implementation Priority Document
New file: `docs/BRANDFLOW_IMPLEMENTATION_PRIORITIES.md`
- **Tier 1 (Trust-Critical):** Brand Memory Engine, Strategy Object Builder, Decision Engine, Trust & Explainability Engine, updated Review Packet behavior
- **Tier 2 (Learning-Critical):** Performance Feedback expansion, approval/rejection loops, preference learning, variant winner tracking, Category Intelligence Cache
- **Tier 3 (Scale-Critical):** Social Publishing Engine, campaign orchestration, operational automation

## Step 3 — Design Brand Memory Auto-Detection Logic
New file: `docs/engines/BRAND_MEMORY_AUTO_DETECTION.md`
- Brand/project association logic
- Asset ownership inference
- Approved style detection from review history
- Performance history loading
- Prior campaign context retrieval
- Pattern detection (5+ rejections → do-not-use auto-flag)

## Step 4 — Formalize Strategy Object as System Spine
Update `docs/PLAN_OBJECT_SCHEMA.md` to position `strategy_object.json` as the canonical internal contract:
- Every request produces: strategy object, rationale, confidence signal, alternative paths, traceable source inputs
- All families consume strategy_object, not raw prompts
- Cross-reference from Decision Engine → Strategy Object Builder → Family Orchestrators

## User Experience Compression
Document the external-facing flow compression:
- Understand → Decide → Create → Finish → Publish → Learn
- Map internal 27+4 complexity to this 6-step user mental model

## Files Changed
| File | Action |
|------|--------|
| `docs/BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md` | **Update** — Full sync with enterprise upgrade |
| `docs/BRANDFLOW_IMPLEMENTATION_PRIORITIES.md` | **Create** — Tiered implementation roadmap |
| `docs/engines/BRAND_MEMORY_AUTO_DETECTION.md` | **Create** — Auto-detection logic design |
| `docs/PLAN_OBJECT_SCHEMA.md` | **Update** — Strategy Object as system spine |
| `.lovable/plan.md` | **Update** — Reflect new phase |