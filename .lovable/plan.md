

## Cross-Family Engine Audit: Enterprise-Grade Pattern Gaps

After analyzing all 8 pipeline families plus 2 engine designs, here are the patterns that exist in one family but are missing where they would add significant value.

---

### 1. Creative Director AI Agent (exists in F7 Ad Creator, partially in F5 Cinematic Ad — missing everywhere else)

The Ad Creator has a dedicated **Creative Director Agent** using the AGENT framework (Ask, Guidance, Examples, Notation, Tools) with a Think Tool for structured reasoning before generating prompts. The Cinematic Ad has a similar "Multimedia Ad Director" agent. But UGC, AI Spokesperson, Product Videography, and Creative Cloner all use simpler prompt-in/structured-out AI calls with no explicit reasoning step.

**Should adopt**: All families. Every scene planning stage should use:
- The AGENT framework for system prompts (standardized structure)
- A Think Tool / reasoning pass before output
- Structured creative summary output (not just raw prompts)

---

### 2. Pre-Generation Approval Gate (exists in F7 Ad Creator, F4 Social Content — missing from F1, F2, F3, F5, F8)

Ad Creator shows the creative concept (caption + creative summary) to the user BEFORE spending money on generation. Social Content has an approval gate before publishing. But UGC, AI Spokesperson, Product Videography, Cinematic Ad, and Creative Cloner all go straight from planning to generation with no checkpoint.

**Should adopt**: All video families. At minimum, show users the planned scenes, mood, and estimated output before burning GPU credits. This is the core of the "approval-first" principle from PROJECT.md.

**Proposed standard**: Every family gets a mandatory **Plan Review Gate** between prompt generation and media generation. The user sees:
- Scene count and descriptions
- Mood/style summary
- Estimated generation time and cost tier
- Approve / Reject / Edit prompts

---

### 3. Revision Loop with Feedback Injection (exists in F7 Ad Creator — missing from all others)

When a user rejects the Ad Creator concept, a **Revised Prompt Agent** takes the original brief + rejection comments + original analysis and generates new prompts incorporating feedback. No other family has this — rejection means full restart.

**Should adopt**: All families. Every rejection should feed the user's comments back into the planning agent as revision context, not force a cold restart.

**Proposed standard**: A shared `RevisionAgent` Edge Function that takes:
- Original brief
- Original AI output
- User rejection comments
- Family-specific system prompt
And returns revised prompts for the specific stage that needs rework.

---

### 4. SEALCaM Structured Prompting (exists in F8 Creative Cloner — recommended but not adopted in F5 Cinematic Ad, F7 Ad Creator)

The Creative Cloner uses SEALCaM (Subject, Environment, Action, Lighting, Camera, Metatokens) as a mandatory 6-field prompting standard. The framework doc says it is "recommended" for Cinematic Ad and Ad Creator but neither actually uses it. Product Videography uses a similar but different YAML structure (Composition, Lighting, Environment, Action, Refinements, Camera, Aesthetic, Mood).

**Should adopt**: F5 Cinematic Ad and F3 Product Videography should standardize on SEALCaM. The PV YAML fields map cleanly:
- Composition → Subject + Camera
- Lighting → Lighting
- Environment → Environment
- Action → Action
- Refinements → Metatokens
- Camera → Camera
- Aesthetic + Mood → Metatokens

This gives consistent prompts across families, making the template library work cross-family.

---

### 5. Re-entrant State Machine (exists in F3 Product Videography — missing from all others)

Product Videography has a Switch node that checks what data already exists and resumes from the appropriate stage. If prompts exist but images don't, it skips straight to image generation. No other family has this — they all run linearly from the start.

**Should adopt**: All families. The `job_stages` table already supports this conceptually, but the pipelines need explicit resume-from-stage logic. This enables:
- Editing prompts after generation and re-running only downstream stages
- Retrying a failed stage without restarting
- Manual intervention at any checkpoint

---

### 6. Core Elements Board as Universal Prerequisite (exists as standalone F6 — only connected to F3 and F5)

The Core Elements Board generates a structured character + setting + product composite image. Currently only Cinematic Ad and Product Videography use it. But every family that generates images needs consistent brand visual context.

**Should adopt**: Make Core Elements Board a **brand onboarding step** that auto-generates during brand setup. Store as a permanent brand asset. Then inject it into:
- F1 UGC: as reference for product placement scenes
- F2 AI Spokesperson: as visual context for avatar settings
- F7 Ad Creator: as reference for the Creative Director
- F8 Creative Cloner: as brand context for prompt generation
- Image Template Engine: as brand style reference for Seedream fusion

---

### 7. Vision Analysis Standardization (different approaches in every family)

| Family | Analysis Provider | Analysis Prompt | Output Format |
|--------|------------------|-----------------|---------------|
| F1 UGC | GPT-4o | Product-focused YAML | YAML |
| F2 AI Spokesperson | GPT-4o | Product + Character YAML | YAML |
| F3 Product Videography | Gemini 3 Pro | Describe character/setting/product | Free text |
| F5 Cinematic Ad | Gemini 3 Pro | Describe character/setting/product | Free text |
| F7 Ad Creator | GPT-4o | Describe product, ignore background | Free text |
| F8 Creative Cloner | Gemini 3 Pro | SEALCaM cinematic breakdown | Structured JSON |

Six families, three different providers, three different output formats. This should be ONE shared analysis engine.

**Proposed standard**: A single `AnalyzeAsset` Edge Function with modes:
- `product` → returns structured product YAML (brand, colors, materials, description)
- `character` → returns structured character YAML (appearance, outfit, expression)
- `scene` → returns SEALCaM-structured scene breakdown
- `composite` → returns all three (for Core Elements Board)

Standardize on Gemini via Lovable AI Gateway as the vision provider.

---

### 8. Music Generation (exists in F5 Cinematic Ad and F8 Creative Cloner — missing from F1 UGC, F2 AI Spokesperson, F7 Ad Creator)

Cinematic Ad and Creative Cloner generate background music via Suno. UGC and AI Spokesperson produce silent videos. Ad Creator produces videos with no audio layer.

**Should adopt**: Offer music as an optional enhancement for ALL video families. The music generation stage is independent (runs in parallel) and adds ~3 minutes. Make it a toggle: "Add background music?" with mood auto-detected from the brand profile.

---

### 9. Assembly / Post-Production (automated in F1B UGC Variant B, planned for F5 and F8 — missing from F1A, F2, F3, F7)

Only UGC Variant B has automated FFmpeg merging via Fal AI. Cinematic Ad explicitly notes assembly is "not automated — currently requires manual assembly." Product Videography and Ad Creator produce single scenes with no merge needed, but have no audio overlay capability.

**Should adopt**: A shared `AssemblyEngine` that handles:
- Video concatenation (multi-scene families)
- Music overlay with volume control
- Voiceover overlay with timing sync
- Fade transitions between scenes
- Caption/subtitle burn-in (optional)
- Final export with aspect ratio enforcement

---

### 10. Cost/Quality Tier Routing (not in any family)

No family currently has explicit cost-vs-quality routing. Users get whatever model is hardcoded. But PROJECT.md specifies `cost_tier` and `latency_tier` as Plan Object fields.

**Should adopt**: Every family should support at least two tiers:
- **Draft/Preview**: Fastest, cheapest models (veo3_fast, sora2, seedream lite)
- **Final/Production**: Highest quality (veo3, sora2-pro, seedream pro)

The planner should auto-select based on whether this is a first draft or a final render after approval.

---

### Summary: Shared Engine Modules to Build Before Any Family

| Engine Module | Used By | Purpose |
|---------------|---------|---------|
| **Creative Director Agent** (AGENT framework) | All families | Standardized reasoning + prompt generation |
| **Plan Review Gate** | All families | Pre-generation approval checkpoint |
| **Revision Agent** | All families | Feedback-aware prompt regeneration |
| **Asset Analyzer** | All families | Unified vision analysis (product/character/scene) |
| **SEALCaM Prompt Builder** | F3, F5, F7, F8 | Structured prompt assembly |
| **Core Elements Generator** | Brand onboarding | Auto-generate brand board during setup |
| **Music Engine** | All video families | Optional background music generation |
| **Assembly Engine** | All video families | FFmpeg merge + audio overlay + export |
| **Tier Router** | All families | Draft vs production quality routing |
| **Re-entry Controller** | All families | Resume-from-stage + retry logic |

These 10 modules form the **enterprise engine layer** that sits between the family-specific logic and the provider adapters. Build these first, then each family becomes a thin orchestration config on top.

