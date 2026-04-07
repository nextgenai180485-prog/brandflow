

## Update CSO & CMO to Enterprise-Grade Workspace Awareness

### What Changes

Both AI agents need updated system prompts and the CMO Rail needs new intelligence signals to reflect the redesigned unified campaign workspace.

### 1. CSO System Prompt Update (`supabase/functions/cmo-chat/index.ts`)

Update the `SYSTEM_PROMPT` platform knowledge section:

- **Campaign Creation Workspace** — Replace the current 5-step wizard description with the new unified workspace layout: left builder panel + right iPhone 16 Pro simulator + bottom source gallery
- **Template Reference Flow** — Add knowledge that users can select templates from the bottom gallery as creative references, which auto-populate the simulator preview and inject `referenceImageUrl` into generation
- **Platform Preview Intelligence** — CSO can now recommend: "Select that template, then switch the simulator to TikTok view to check your Safe Zones before generating"
- **Source Gallery Guidance** — CSO knows about the tabs (Templates / Competitors / Your Generations / For You) and filter chips (All / Trending / Top Ads) and can guide users: "Filter by 'Top Ads' in the Competitors tab to find proven formats in your vertical"
- **Reference-Aware Generation** — When recommending families, CSO can say: "Select a reference from the gallery below — the engine will match its composition and mood via style injection"

### 2. CMO Reactive Prompt Update (`supabase/functions/cmo-agent/index.ts`)

Update `CMO_REACTIVE_PROMPT` to add:

- **Reference Asset Detection** — When the CMO sees a campaign with `referenceImageUrl`, it validates the reference against the brand strategy: "I see you're using a competitor reference. The Cloner Engine (F8) will reverse-engineer that style — but verify the color palette doesn't clash with your brand primaries."
- **Template Selection Validation** — CMO can flag mismatches: "That template is optimized for Instagram Feed (4:5). Your selected platform is TikTok (9:16) — the Safe Zone overlay will show content loss."
- **Workspace Context** — CMO knows the user is in a unified workspace and can reference the simulator: "Check the right panel — your headline is landing in TikTok's dead zone."

### 3. CMO Sentient Rail Enhancement (`src/components/SentientCMORail.tsx`)

Add new intelligence signals to `scanIntelligence()`:

- **Template Library Signal** — Query `ad_reference_library` for recently added templates and surface: "12 new competitor templates added to your Source Gallery — 3 match your vertical"
- **Reference Usage Tracking** — When a campaign is created with a reference asset, the CMO notes: "Campaign X was generated from template reference — monitor performance to feed Brand Memory"

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/cmo-chat/index.ts` | Update `SYSTEM_PROMPT` with unified workspace knowledge, template reference flow, simulator guidance, and source gallery navigation |
| `supabase/functions/cmo-agent/index.ts` | Update `CMO_REACTIVE_PROMPT` with reference asset validation, template-platform mismatch detection, and workspace-aware prescriptions |
| `src/components/SentientCMORail.tsx` | Add `ad_reference_library` query to `scanIntelligence()` for template library signals |

### Deployment

Both edge functions (`cmo-chat`, `cmo-agent`) will be redeployed after prompt updates.

