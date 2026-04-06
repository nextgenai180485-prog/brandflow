## Phase 10 — Real AI Provider Integration

**MVP Alignment:** This is Phase 4 of the MVP roadmap ("First Generated Batch") — the critical "wow" moment.

**Engines/Modules being built (MVP versions):**
- Module #25 (Research & Competitor Intelligence) — MVP: Exa search → brief
- Module #26 (Decision Engine) — MVP: Simple scoring from research
- Module #9 (Provider & Tier Routing) — MVP: Primary provider selection with 1 fallback
- Module #17 (Post-Production) — Deferred to later phase

---

### Step 1: Database Migration
Add tables for research and cost tracking:
- `campaign_research` — stores Exa research results per campaign
- Add `provider`, `generation_cost`, `generation_time_ms` columns to `generated_assets`

### Step 2: Add API Secrets
Request all 5 provider keys:
- `KIE_AI_API_KEY` (Veo3 video, GPT-4o image, Suno audio)
- `FAL_AI_API_KEY` (Kling, LatentSync, Whisper)
- `ELEVENLABS_API_KEY` (TTS, voice)
- `EXA_API_KEY` (research/search)
- `REPLICATE_API_KEY` (SDXL fallback)

### Step 3: Edge Function — `research`
- Accepts campaign context (industry, brand voice, target audience)
- Calls Exa API for market trends + competitor patterns
- Returns structured `intelligence_brief` JSON
- Saves to `campaign_research` table

### Step 4: Edge Function — `generate-content`
- Accepts campaign ID, asset type, platform, format
- Loads research brief from DB
- Routes to provider based on asset type:
  - **Image:** Kie AI (GPT-4o Image) → FAL AI fallback → Replicate fallback
  - **Video:** Kie AI (Veo3) → FAL AI (Kling) fallback
  - **Audio/Voice:** ElevenLabs → Kie AI (Suno) for music
  - **Copy:** Lovable AI (gemini-3-flash) — already available
- Generates caption via Lovable AI alongside media
- Uploads to Supabase Storage
- Saves asset record with provider, cost, time tracking

### Step 5: Update GenerateButton
- Replace stub logic with edge function calls
- Flow: Research → Generate all assets → Save → Update status
- Show progress indicator per asset type

### Step 6: Cost Summary UI
- Display provider used + cost per asset in Campaign Details
- Simple cost summary card

### What's NOT in this phase:
- Full tier routing (draft/production) — single tier for now
- Post-production pipeline (subtitles, watermarks, enhancement)
- Campaign Multiplication workflow
- Social Publishing Engine (Meta/TikTok API)
- Advanced Decision Engine scoring
