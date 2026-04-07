# CSO War Room — Upgrade Roadmap

> **Status**: Planned  
> **Last updated**: 2026-04-07  
> **Owner**: CSO Agent / Platform UX  
> **Current State**: Read + Advise (conversational strategy with full brand intelligence dossier)

---

## Purpose

Upgrade the CSO from a "read + advise" conversational agent to a **tool-calling strategic executor** that can design, create, and optimize funnels, campaigns, and content strategies — with user approval gates at every destructive action.

---

## Upgrade 1 — Tool-Calling (Ghost Fix Mechanic)

**Priority**: High  
**Dependencies**: None (frontend + edge function only)

### What It Does

When the CSO recommends an action, it includes an "Apply" button. On user approval, the CSO executes the action automatically — no manual navigation or copy-paste.

### Implementation

1. Add a `tools` array to the AI gateway call in `cmo-chat/index.ts`:
   - `update_funnel_stages` — writes to `brand_strategy.funnel_stages`
   - `navigate_to_route` — triggers client-side navigation
   - `prefill_campaign` — creates a draft campaign with pre-filled fields
   - `update_brand_strategy` — modifies `brand_strategy` fields

2. Parse tool-call responses in `GlobalCMOChat.tsx`:
   - Render tool-call results as actionable cards (not plain text)
   - Include "Apply" / "Dismiss" buttons
   - On "Apply", execute the action via Supabase client or navigation

3. Add approval gate:
   - Tool calls that modify data require explicit user confirmation
   - Read-only tool calls (e.g., "show me my funnel") execute immediately

### Example Flow

```
User: "Design me a TOF awareness funnel for Instagram"

CSO Response:
  [Text] "Based on your brand archetype (Rebel) and medspa vertical..."
  [Tool Call: update_funnel_stages]
    → TOF: Educational Reels (3/week), Authority Carousels (2/week)
    → MOF: Before/After Stories (daily), Client Testimonial UGC
    → BOF: Limited-offer DM sequences, Booking CTA posts
  
  [Apply Button] → Writes to brand_strategy.funnel_stages
  [Dismiss Button] → Discards
```

---

## Upgrade 2 — Visual Funnel Builder

**Priority**: Medium  
**Dependencies**: Upgrade 1 (tool-calling)

### What It Does

A visual funnel diagram in the Strategy Command Center (`/dashboard/strategy/new`) that the CSO can populate and the user can interactively edit.

### Implementation

1. New component: `FunnelBuilder.tsx`
   - 3-stage vertical diagram: TOF → MOF → BOF
   - Each stage shows content pillars, platform mix, and posting cadence
   - Drag-to-reorder content pillars within stages
   - Click-to-edit individual content types

2. Data source: `brand_strategy.funnel_stages` (existing jsonb column)

3. CSO integration:
   - CSO tool call `update_funnel_stages` → auto-renders in the builder
   - User edits in the builder → reflected in CSO context on next query

---

## Upgrade 3 — Action Execution (Route Navigation)

**Priority**: Medium  
**Dependencies**: Upgrade 1 (tool-calling)

### What It Does

CSO suggestions include contextual navigation. When the CSO says "Create a UGC campaign targeting your TOF audience," the user can click "Go" and land on `/dashboard/campaigns/new` with platforms and content type pre-selected.

### Implementation

1. Tool: `navigate_to_route`
   - Payload: `{ route: "/dashboard/campaigns/new", prefill: { platforms: ["instagram"], contentType: "ugc_video" } }`
   - Client-side: `useNavigate()` + state injection via React Router `state` param

2. Tool: `prefill_campaign`
   - Payload: `{ title, platforms, contentType, instructions }`
   - Client-side: Navigate to wizard with pre-filled fields

---

## Upgrade 4 — Multi-Session Memory

**Priority**: Low  
**Dependencies**: None

### What It Does

CSO references past conversation threads by topic, enabling continuity across sessions.

### Implementation

1. Add `topic` column to `cmo_chat_messages` table (auto-classified by the AI)
2. On CSO open, show a "Recent Topics" sidebar:
   - "TikTok Strategy (3 days ago)"
   - "Q2 Funnel Design (1 week ago)"
   - "Competitor Analysis (2 weeks ago)"
3. Clicking a topic loads that thread's messages as context

### Schema Change

```sql
ALTER TABLE cmo_chat_messages ADD COLUMN topic TEXT;
ALTER TABLE cmo_chat_messages ADD COLUMN session_id UUID DEFAULT gen_random_uuid();
CREATE INDEX idx_cmo_chat_sessions ON cmo_chat_messages(profile_id, session_id);
```

---

## Upgrade 5 — Campaign Auto-Draft

**Priority**: High  
**Dependencies**: Upgrade 1 (tool-calling), Upgrade 3 (route navigation)

### What It Does

The CSO can create complete campaign drafts in the `campaigns` table when the user requests a multi-part strategy. Instead of manually creating 3-6 campaigns, the user says "Build me a 3-week awareness funnel" and the CSO creates all campaign drafts with correct platforms, content types, scheduling, and briefs.

### Implementation

1. New tool: `create_campaign_drafts`
   - Payload:
     ```json
     {
       "drafts": [
         {
           "title": "Week 1 — Educational Reels (TOF)",
           "platforms": ["instagram", "tiktok"],
           "content_type": "ugc_video",
           "instructions": "Focus on myth-busting common medspa misconceptions. Hook: 'Stop believing this about Botox.' Tone: authoritative but approachable.",
           "scheduled_at": "2026-04-14T09:00:00Z",
           "funnel_stage": "TOF"
         },
         {
           "title": "Week 2 — Before/After Carousels (MOF)",
           "platforms": ["instagram", "linkedin"],
           "content_type": "image",
           "instructions": "Showcase real client transformations with permission. Include treatment details and timeline. CTA: Book a consultation.",
           "scheduled_at": "2026-04-21T09:00:00Z",
           "funnel_stage": "MOF"
         },
         {
           "title": "Week 3 — Testimonial UGC + Booking CTA (BOF)",
           "platforms": ["instagram", "tiktok"],
           "content_type": "ugc_video",
           "instructions": "Client testimonial format. Real voice, real results. End with limited-time offer and booking link.",
           "scheduled_at": "2026-04-28T09:00:00Z",
           "funnel_stage": "BOF"
         }
       ]
     }
     ```

2. Edge function handler in `cmo-chat/index.ts`:
   - Receives tool call with drafts array
   - Validates each draft against the user's profile
   - Inserts into `campaigns` table with `status: 'draft'` and `profile_id`
   - Returns created campaign IDs

3. Client-side rendering in `GlobalCMOChat.tsx`:
   - Tool call result renders as a "Campaign Plan" card:
     ```
     ┌─────────────────────────────────────┐
     │ 📋 Campaign Plan Created            │
     │                                     │
     │ Week 1: Educational Reels (TOF)     │
     │ Week 2: Before/After Carousels (MOF)│
     │ Week 3: Testimonial UGC (BOF)       │
     │                                     │
     │ [View in Dashboard]  [Edit Drafts]  │
     └─────────────────────────────────────┘
     ```
   - "View in Dashboard" → navigates to `/dashboard`
   - "Edit Drafts" → opens each campaign in the wizard sequentially

4. Approval gate:
   - CSO presents the plan as a preview card
   - User clicks "Create All Drafts" to confirm
   - Only then does the system insert into the database

### Schema Consideration

The `campaigns` table may need a `funnel_stage` column to track TOF/MOF/BOF:

```sql
ALTER TABLE campaigns ADD COLUMN funnel_stage TEXT; -- 'tof' | 'mof' | 'bof'
ALTER TABLE campaigns ADD COLUMN auto_drafted_by TEXT; -- 'cso' | null
```

---

## Upgrade 6 — Real-Time Performance Injection

**Priority**: Low  
**Dependencies**: Social Publishing Engine (Module #27), Performance Feedback Engine (Module #22)

### What It Does

CSO pulls live campaign performance metrics to give mid-flight optimization advice.

### Implementation

1. Add tool: `get_campaign_performance`
   - Queries `publish_records` + platform API metrics
   - Returns: impressions, CTR, engagement rate, spend, ROAS

2. CSO can then say:
   - "Your Week 1 Reels are getting 2.3% CTR — that's 40% above your vertical average. Double down."
   - "Week 2 carousels are underperforming. I recommend switching to video testimonials."

3. Requires: Social accounts connected, publish records with `platform_post_id`, and metric ingestion pipeline.

---

## Build Order

| Phase | Upgrades | Effort |
|-------|----------|--------|
| **Phase 1** | Upgrade 1 (Tool-Calling) + Upgrade 5 (Campaign Auto-Draft) | ~2 days |
| **Phase 2** | Upgrade 3 (Route Navigation) + Upgrade 2 (Funnel Builder) | ~2 days |
| **Phase 3** | Upgrade 4 (Multi-Session Memory) | ~1 day |
| **Phase 4** | Upgrade 6 (Real-Time Performance) | Blocked by Social Publishing Engine |

---

## Cross-References

| Component | Interaction |
|-----------|------------|
| `cmo-chat/index.ts` | Add tool definitions to AI gateway call |
| `GlobalCMOChat.tsx` | Parse tool-call responses, render action cards |
| `brand_strategy` table | `funnel_stages` written by tool calls |
| `campaigns` table | Auto-drafted campaigns inserted by CSO |
| Strategy Command Center | Visual Funnel Builder component |
| Social Publishing Engine (#27) | Required for real-time performance injection |
| Performance Feedback Engine (#22) | Metric data source for Upgrade 6 |
