# CMO Tactical HUD — Upgrade Roadmap

> **Status**: Planned  
> **Last updated**: 2026-04-07  
> **Owner**: CMO Agent / Tactical UX Layer  
> **Current State**: Reactive Strategy Mirror (card-based, Campaign Wizard only)

---

## Purpose

Upgrade the CMO from a single-context reactive panel into a **persistent tactical co-pilot** that provides push intelligence across every workspace surface — not just the Campaign Wizard.

---

## Current Capabilities

| Capability | Status |
|------------|--------|
| Brand DNA display (palette, voice, themes) | ✅ Active |
| Reactive strategy generation on platform/content selection | ✅ Active |
| Competitive landscape cards | ✅ Active |
| Generation Protocol (Safe Mode rules) | ✅ Active |
| Typewriter animation for strategy reveals | ✅ Active |
| Status bar (System/Format/Intent) | ✅ Active |

### Where It Lives Today

- `CMOStrategyPanel.tsx` — Right rail inside `NewCampaign.tsx` (Campaign Wizard only)
- Powered by `cmo-agent` edge function

### What's Missing

- **No presence on Dashboard** — user loses tactical guidance after leaving the wizard
- **No alerts/warnings** — doesn't proactively flag issues (e.g., "You haven't posted in 5 days")
- **No asset scoring** — can't evaluate generated content quality
- **No learning feedback** — doesn't tell users what worked vs what didn't
- **No cross-page awareness** — only knows about the current campaign form state

---

## Upgrade 1 — Dashboard Tactical Strip

**Priority**: High  
**Dependencies**: None

### What It Does

A persistent, collapsible CMO strip on the Dashboard that surfaces 2-3 high-priority tactical cards without requiring the user to enter a campaign.

### Cards

| Card Type | Trigger | Example |
|-----------|---------|---------|
| **Next Move** | Always shown | "Your last campaign was 4 days ago. Your vertical averages 3 posts/week. **The Move:** Create a TOF awareness reel." |
| **Brand Health** | Profile data exists | "Brand completeness: 72%. Missing: target audience, brand voice keywords." |
| **Momentum Alert** | Campaigns exist | "2 campaigns in draft — none published. Momentum stalls after 48h." |

### Implementation

- New component: `CMODashboardStrip.tsx`
- Pulls from `profiles`, `campaigns`, `brand_strategy` to compute alerts
- Lightweight — no AI call needed, pure logic-based cards
- Collapsible via a "CMO" toggle pill in the Dashboard header

---

## Upgrade 2 — Asset Quality Auditor (Pre-Publish Scoring)

**Priority**: High  
**Dependencies**: None (extends existing `cmo-agent` edge function)

### What It Does

When reviewing generated assets in `CampaignReview.tsx`, the CMO scores each asset against brand alignment, platform best practices, and hook effectiveness — surfacing a **Resonance Score** (0-100).

### Scoring Criteria

| Dimension | Weight | Source |
|-----------|--------|--------|
| Hook Strength | 25% | Hook Library patterns + brand memory |
| Brand Alignment | 25% | Brand DNA (voice, palette, themes) |
| Platform Fit | 20% | Platform-specific best practices |
| Visual Composition | 15% | Safe Mode generation rules |
| Audience Match | 15% | Persona card + target audience |

### Implementation

1. New edge function: `cmo-audit` or extend `cmo-agent` with `action: "audit"`
2. Input: generated asset metadata (content_text, platform, format, asset_type)
3. Output:
   ```json
   {
     "resonance_score": 87,
     "status": "STRONG",
     "feedback": [
       { "type": "good", "text": "Hook is under 8 words (high retention)" },
       { "type": "warn", "text": "Caption exceeds LinkedIn optimal length by 20%" },
       { "type": "good", "text": "Color palette matches brand DNA" }
     ],
     "projected_result": "Estimated 12-15 leads within 48h based on audience size"
   }
   ```

4. UI: Right-rail audit panel in `CampaignReview.tsx` with color-coded score

### Color Coding

| Score Range | Status | Color |
|-------------|--------|-------|
| 85-100 | EXCEPTIONAL | Emerald |
| 70-84 | STRONG | Blue |
| 50-69 | AVERAGE | Amber |
| 0-49 | WEAK | Red |

---

## Upgrade 3 — Proactive Warning System

**Priority**: Medium  
**Dependencies**: Upgrade 1 (Dashboard Strip)

### What It Does

The CMO actively monitors the user's workspace state and pushes warnings/opportunities as toast-style cards — not waiting for the user to ask.

### Warning Types

| Warning | Trigger Condition | Severity |
|---------|------------------|----------|
| **Content Gap** | No campaigns created in 5+ days | ⚠️ Warning |
| **Format Mismatch** | Selected platform doesn't support chosen content type | 🔴 Critical |
| **Audience Drift** | Campaign targets a different audience than brand_strategy persona | ⚠️ Warning |
| **Budget Alert** | Estimated generation cost exceeds remaining budget | 🔴 Critical |
| **Stale Brand Data** | Brand research is older than 30 days | 💡 Info |
| **Untested Hook** | Using a hook pattern with 0 historical usage | 💡 Info |

### Implementation

1. CMO warning engine: `computeCMOWarnings(profile, campaigns, strategy)` — pure function
2. Warnings rendered as floating cards in the Dashboard Strip and Campaign Wizard
3. Critical warnings block the "Generate" button with explanation
4. Info warnings are dismissible

---

## Upgrade 4 — Learning Feedback Cards

**Priority**: Medium  
**Dependencies**: `brand_memory` + `asset_memory` tables (already exist)

### What It Does

After campaigns are generated and reviewed, the CMO surfaces "What Worked" and "What Didn't" cards based on approval/rejection patterns stored in `brand_memory`.

### Cards

| Card | Data Source | Example |
|------|------------|---------|
| **Winning Pattern** | `brand_memory` (type: approval, freq > 3) | "UGC-style hooks outperform authority hooks 3:1 for your brand." |
| **Avoid Pattern** | `brand_memory` (type: rejection, freq > 2) | "Dark backgrounds consistently rejected. Your brand prefers light/airy." |
| **Style Evolution** | `asset_memory` (confidence trending) | "Your visual style is shifting toward minimalist — 80% approval rate." |

### Implementation

1. Query `brand_memory` and `asset_memory` on Dashboard load
2. Compute top 3 patterns (highest frequency + confidence)
3. Render as "CMO Insights" section in Dashboard Strip
4. Refreshed on each campaign review completion

---

## Upgrade 5 — Cross-Page Context Awareness

**Priority**: Medium  
**Dependencies**: Upgrade 1 + Upgrade 3

### What It Does

The CMO adapts its cards based on which page the user is on — not just the Campaign Wizard.

### Context Map

| Route | CMO Mode | Cards Shown |
|-------|----------|-------------|
| `/dashboard` | Overview | Next Move, Brand Health, Momentum Alert, Learning Insights |
| `/dashboard/campaigns/new` | Builder | Strategy Mirror (current), Format Warnings, Blueprint |
| `/dashboard/campaign/:id` | Review | Asset Auditor Score, Approval/Rejection guidance |
| `/dashboard/strategy/new` | Strategy | Funnel recommendations, Research freshness |
| `/calendar` | Planning | Content cadence gaps, optimal posting times |
| `/dashboard/admin/libraries` | Admin | Library coverage (e.g., "No video templates for TikTok yet") |

### Implementation

1. `CMOContextProvider` — wraps the app, tracks current route via `useLocation()`
2. Computes relevant card set based on route pattern
3. Injects cards into either the right rail (wizard pages) or dashboard strip (overview pages)

---

## Upgrade 6 — Variant Comparison Engine

**Priority**: Low  
**Dependencies**: Upgrade 2 (Asset Auditor), multiple asset generation

### What It Does

When multiple variants are generated for the same campaign (Variant A, B, C), the CMO compares them and recommends the winner with an evidence-backed rationale.

### Implementation

1. Score each variant using the Auditor (Upgrade 2)
2. Comparative analysis card:
   ```
   ┌────────────────────────────────────┐
   │ 🏆 CMO Recommendation: Variant A  │
   │                                    │
   │ A: 92 (Exceptional)               │
   │ B: 74 (Average) — weak hook       │
   │ C: 81 (Strong) — off-brand color  │
   │                                    │
   │ "Variant A's question hook has 3x │
   │  the retention rate in your        │
   │  vertical."                        │
   └────────────────────────────────────┘
   ```
3. Store comparison in `decision_traces` for future learning

---

## Build Order

| Phase | Upgrades | Effort |
|-------|----------|--------|
| **Phase 1** | Upgrade 1 (Dashboard Strip) + Upgrade 2 (Asset Auditor) | ~2 days |
| **Phase 2** | Upgrade 3 (Warning System) + Upgrade 4 (Learning Feedback) | ~2 days |
| **Phase 3** | Upgrade 5 (Cross-Page Context) | ~1 day |
| **Phase 4** | Upgrade 6 (Variant Comparison) | ~1 day |

---

## CSO vs CMO — Role Boundary

| Dimension | CSO (War Room) | CMO (Tactical HUD) |
|-----------|---------------|---------------------|
| **When** | User-initiated (Pull) | Always-on (Push) |
| **Where** | Global overlay (left) | Right rail + Dashboard strip |
| **What** | Strategic reasoning, funnel design, campaign planning | Tactical alerts, asset scoring, pattern detection |
| **How** | Conversational chat | Card-based, no chat interface |
| **Data** | Full history, research, decision traces | Current context, brand memory, warnings |
| **Actions** | Can create campaigns, modify strategy | Can block generation, flag issues, score assets |

---

## Cross-References

| Component | Interaction |
|-----------|------------|
| `CMOStrategyPanel.tsx` | Current implementation — extended by all upgrades |
| `cmo-agent/index.ts` | Edge function — extended with `audit` action |
| `brand_memory` table | Source for Learning Feedback (Upgrade 4) |
| `asset_memory` table | Source for style evolution patterns |
| `decision_traces` table | Written by Variant Comparison (Upgrade 6) |
| `CampaignReview.tsx` | Asset Auditor panel integration (Upgrade 2) |
| `Dashboard.tsx` | Dashboard Strip integration (Upgrade 1) |
| CSO Upgrade Roadmap | Complementary — CSO handles strategy, CMO handles tactics |
