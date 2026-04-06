## Zero-to-One Founder Protocol Implementation

### Phase 1: Database — `brand_strategy` table
- Store `core_identity` (archetype, enemy, hero_journey), `funnel_stages` (tof/mof/bof), `current_focus`, `persona_card`
- RLS: users own their strategy
- Referenced by CMO Agent and generation engine

### Phase 2: Onboarding Fork — Detect "No Website" Path
- In `Onboarding.tsx` Step 0 (BusinessBasics), add a toggle/option: "I don't have a website yet" or "I'm starting a new business"
- If selected, skip website URL field and flag `isGenesis: true`
- On "Launch Brandflow", route Genesis users to a **Founder Interview** flow instead of standard research

### Phase 3: Founder Interview Component
- New component `FounderInterview.tsx` — renders in the CMO right panel at `/dashboard/strategy/new`
- 3 sequential questions (Core Value → The Enemy → Secret Weapon)
- Each answer streams to CMO Agent which provides real-time synthesis
- After Q3, CMO generates the full Strategy Board

### Phase 4: CMO Agent "Architect Mode"
- Update `cmo-agent` edge function with a new mode: `architect`
- Input: 3 interview answers + industry + business name
- Output: Structured JSON — `core_identity`, `persona_card`, `funnel_stages`, `launch_roadmap`
- Persists to `brand_strategy` table

### Phase 5: Strategy Dashboard Widget
- Collapsible accordion on Dashboard showing "Current Mission" from `brand_strategy.current_focus`
- Expands to show Persona Card + Funnel Architecture
- Links to Strategy Command Center for full details

### Phase 6: Context Injection
- When creating campaigns, inject `brand_strategy` context into CMO/generation prompts
- Enforce funnel-stage-appropriate content (no sales posts during awareness phase)

### Files Modified:
- `supabase/migrations/` — new `brand_strategy` table
- `src/components/onboarding/BusinessBasics.tsx` — "no website" toggle
- `src/pages/Onboarding.tsx` — genesis routing
- `src/components/FounderInterview.tsx` — NEW: 3-question interview
- `src/components/CMOStrategyPanel.tsx` — architect mode rendering
- `supabase/functions/cmo-agent/index.ts` — architect mode prompt
- `src/pages/Dashboard.tsx` — strategy widget
- `src/pages/StrategyCommandCenter.tsx` — interview integration
