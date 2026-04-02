# Ad Creator Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `R36 | The Ad Creator AI Agent (by RoboNuggets)`
> Supporting docs: `Ads_Creator_AI_Agent_Instruction.md`, `Initial_Prompt_AI_Agent_Ad_Creator.md`

---

## Overview

A single-scene polished ad generator with a **pre-generation approval gate**. Takes a product reference image and creative brief, uses an AI Creative Director agent to generate image + video prompts, shows the creative summary to the user for approval BEFORE generating any media, then renders a single high-quality product ad (image → video).

**Core principle**: Quality over quantity — one polished scene with human approval before expensive generation.

---

## Pipeline Stages

```text
Telegram Trigger (photo + caption) → Get Image Path → Analyze Image (GPT-4o Vision)
  → AI Creative Director Agent (GPT-4.1, AGENT framework)
  → Set Prompts → Get Approval (Telegram form)
  → [if approved] GPT-Image (Kie AI) → Poll
  → Create Veo3 (Kie AI) → Poll → Deliver
  → [if rejected] Revised Prompt Agent → Loop back to Approval
```

---

## Stage 0: Creative Direction (Module #23)

**Mandatory first stage** — transforms the creative brief into a strategic ad concept before the Creative Director Agent runs. For F7, this feeds the gold-standard AGENT framework with pre-reasoned ad angles, hook logic, and camera motion presets (Module #24). See `engines/CREATIVE_DIRECTION_ENGINE.md`.

---

## Stage 1: Brief Intake

**Source**: Telegram photo + caption (Brandflow: web UI upload + form)

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Reference image | Photo | Yes | Product photo via Telegram |
| Creative brief | string (caption) | Yes | "Create a cinematic ad for this perfume, moody noir style" |

---

## Stage 2: Analyze Reference Image

**Purpose**: Extract detailed product description, ignoring background.

**Provider**: OpenAI GPT-4o (vision) — `chatgpt-4o-latest`

**Prompt**:
```
Describe the product and brand in this image in full detail.
Fully ignore the background. Focus ONLY on the product.
```

**Output**: Detailed text description of the product.

---

## Stage 3: Creative Director AI Agent

**Purpose**: Generate structured image prompt, video prompt, caption, and creative summary.

**Provider**: OpenAI GPT-4.1 + Think Tool + Structured Output Parser

**System Prompt** (AGENT framework):
```
## 🎨 SYSTEM PROMPT: Image + Video Prompt Generator for Product Creatives

A – Ask:
  Generate an image prompt and a video prompt (both as JSON), plus a short
  caption and a structured creative summary.

G – Guidance:
  role: Seasoned creative director with deep expertise in visual storytelling
  output_count: 1

  constraints:
    - Prioritize dynamic backgrounds and fully detailed scenes
    - Reference image must be used for detailed visual context
    - Preserve product label, color, and packaging fidelity
    - If brief lacks detail, creatively interpret and propose a concept
    - Video setting must align with image setting

    image_prompt (string) must include:
      description, setting, background, composition, elements,
      lighting, camera_type, camera_settings, effects, style
      + "Keep product's packaging, label, text, logo 100% sharp"
      + "Background color matches dominant packaging color"

    video_prompt (stringified JSON) must include:
      description (scene starts with product already in frame),
      setting, camera_type, camera_movement (prioritize simple),
      action, lighting, other_details, dialogue (optional),
      music, ending (optional), keywords (optional)

    creative_summary format:
      📢 One-paragraph overview
      🖼️ IMAGE: bullet point summary
      🎬 VIDEO: bullet point summary
      📐 Aspect Ratio: 16:9 or 9:16 (default 9:16)
      🧠 Model: veo3 or veo3_fast (default veo3_fast)

    caption: At least one emoji + 1-2 relevant hashtags

E – Examples:
  🟢 Eye-Catchy Product Video (IKEA furniture assembly)
  🟢 Product Photoshoot (ingredient explosion)
  🟢 Stylized Editorial Portrait (90s neo-noir)
  🟢 Street Style Product Ad (eyewear)
  🟢 Realistic Influencer Portrait (Vogue editorial)

T – Tools:
  - Think Tool: Reflect and reason before responding
```

**Output Schema**:
```json
{
  "image_prompt": "string",
  "video_prompt": "stringified JSON",
  "caption": "short caption with emoji and hashtags",
  "creative_summary": "structured summary with emoji headers",
  "aspect_ratio": "vertical or horizontal",
  "video_model": "veo3 or veo3_fast"
}
```

---

## Stage 4: Pre-Generation Approval Gate

**Purpose**: Show the creative concept to the user BEFORE spending money on generation.

**Provider**: Telegram Send-and-Wait with custom form (Brandflow: in-app UI)

**Approval Message**:
```
📣 CAPTION
<caption text>

📝 CREATIVE SUMMARY
<creative_summary text>
```

**Form fields**:
- **Approve**: Dropdown (Yes / No) — required
- **Comments**: Free text for revision notes

**Flow**:
- If **Yes** → proceed to image generation (Stage 5)
- If **No** → route to **Revised Prompt Agent** with comments, then loop back to approval

### Revision Loop

When rejected, a second AI agent run uses:
- Original creative brief
- Rejection comments from user
- Original image analysis

The revised agent generates new prompts incorporating the feedback, then re-submits for approval.

---

## Stage 5: Image Generation

**Purpose**: Generate a product image placing the product in the creative scene.

**Provider**: Kie AI (`/api/v1/gpt4o-image/generate`)

**Request**:
```json
POST https://api.kie.ai/api/v1/gpt4o-image/generate
{
  "filesUrl": ["<reference_image_url>"],
  "prompt": "Take the product in the image and place it in this scenario: <image_prompt>",
  "size": "3:2",
  "nVariants": 1
}
```

**Authentication**: API key via HTTP header

**Polling**:
- GET `https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId=<taskId>`
- Check `data.successFlag === 1`
- Result at `data.response.resultUrls[0]`

---

## Stage 6: Video Generation

**Purpose**: Generate a product video using the generated image as the starting frame.

**Provider**: Kie AI Veo3 (`/api/v1/veo/generate`)

**Request**:
```json
POST https://api.kie.ai/api/v1/veo/generate
{
  "prompt": <video_prompt as JSON>,
  "model": "<video_model>",
  "aspectRatio": "<aspect_ratio>",
  "imageUrls": "<generated_image_url>"
}
```

**Polling**: Standard Kie AI pattern — wait ~240 seconds, poll `record-info`.

---

## Stage 7: Deliver

**Original**: Send final video back via Telegram
**Brandflow**: Store in Supabase Storage, create artifact record, notify user via UI

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Analyze Image | OpenAI GPT-4o | OpenAI API (vision) | API key |
| Creative Director | OpenAI GPT-4.1 | OpenAI API (chat) | API key |
| Approval Gate | Telegram (→ Brandflow UI) | Telegram Bot API | Bot token |
| Image Generation | Kie AI (GPT-4o Image) | `api.kie.ai/api/v1/gpt4o-image/generate` | HTTP header |
| Image Polling | Kie AI | `api.kie.ai/api/v1/gpt4o-image/record-info` | HTTP header |
| Video Generation | Kie AI (Veo3) | `api.kie.ai/api/v1/veo/generate` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/veo/record-info` | HTTP header |

---

## Brand Customization

The system prompt can be customized per brand:

1. Copy the system prompt
2. Use ChatGPT to adjust tone, color language, and mood for the specific brand
3. Provide: mood board, brand tone notes, color palette, sample ad copy
4. Keep the AGENT structure intact — only modify descriptive content

**Brandflow**: Store customized system prompts as brand-level configuration.

---

## Quality Tips (from documentation)

1. **Be specific in briefs** — detailed briefs produce dramatically better output
2. **Test with veo3_fast first** — iterate on concept before switching to veo3 for final quality
3. **Video prompt is stringified JSON** — the inner structure is parsed by downstream systems
4. **Raw prompt inspection** — for debugging, the full image/video prompts can be displayed

---

## Key Design Notes

1. **Pre-generation approval** is the key differentiator — saves money by catching bad concepts early
2. **Single scene only** — produces one polished ad, not a batch
3. **Revision loop** allows iterative refinement without restarting the entire pipeline
4. **Image prompt wrapping**: The image prompt is wrapped with "Take the product in the image and place it in this scenario: ..." before sending to Kie AI
5. **Video prompt is stringified JSON** within the output JSON — requires double-serialization handling
6. **5 creative examples** in the system prompt guide the AI's creative direction
7. **Product fidelity mandate**: "Keep product's packaging, label, text, logo and all design details 100% sharp, clear and untouched"

---

## Alternative Providers (from documentation)

If Kie AI is unavailable:
- **Fal.ai** — fast, wide model support, higher pricing
- **Replicate.com** — flexible, many hosted models, higher pricing

As of July 2025, Kie AI is the most cost-effective option for high-volume usage.

---

## Brandflow Implementation Notes

1. **Replace Telegram** with web UI for both input and approval
2. **Approval gate** becomes an in-app review interface with approve/reject/comment
3. **Revision loop** should preserve the conversation history (original brief → rejection comments → revised output)
4. **Brand-level prompt customization** stored in a `brand_config` table
5. **A/B test opportunity**: Test Seedream 5 Lite vs GPT-4o Image for the image generation step
6. **Cost tracking**: Since this pipeline has an approval gate, track both "approved" and "rejected" generation costs separately
7. **The AGENT framework** (Ask, Guidance, Examples, Notation, Tools) should be standardized across all AI agent prompts in Brandflow

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — F7 Ad Creator is already the most enterprise-ready pipeline. This section documents its reference patterns and remaining upgrades.

### 1. Asset Analyzer (replaces Stage 2)

Switch from GPT-4o to the unified `AnalyzeAsset` Edge Function:
- **Mode**: `product` (primary — product ad pipeline)
- **Provider**: Gemini via Lovable AI Gateway (standardize across families)
- **Output**: Structured YAML with product details
- Currently uses GPT-4o with "describe product, ignore background" — standardize to shared format

### 2. Creative Director Agent ✅ (reference pattern)

F7 already has the gold-standard Creative Director Agent:
- Full AGENT framework (Ask, Guidance, Examples, Notation, Tools)
- Think Tool for structured reasoning
- Structured creative summary with emoji headers
- 5 creative examples in system prompt
- **This is the reference pattern** that all other families should adopt

### 3. Plan Review Gate ✅ (reference pattern)

F7 already has pre-generation approval:
- Shows caption + creative summary to user before generation
- Approve / Reject with comments
- **This is the reference pattern** for the shared Plan Review Gate module

### 4. Revision Loop ✅ (reference pattern)

F7 already has the Revised Prompt Agent:
- Takes original brief + rejection comments + original analysis
- Generates new prompts incorporating feedback
- Loops back to approval
- **This is the reference pattern** for the shared RevisionAgent module

### 5. SEALCaM Adoption

- Recommended for image and video prompt structure
- Map existing prompt fields to SEALCaM 6-field standard:
  - description → Subject
  - setting + background → Environment
  - lighting → Lighting
  - camera_type + camera_settings → Camera
  - effects + style → Metatokens
  - action (from video_prompt) → Action
- Enables template reuse across families

### 6. Core Elements Board Injection

- Core Elements Board (from F6) injected as reference for the Creative Director
- Provides visual context for product placement, brand setting, character style
- If brand has Core Elements Board → include as additional image input to the agent
- If no board → pipeline works without it (already optional)

### 7. Music Engine (optional, parallel lane)

- Toggle: "Add background music?" in the brief
- If enabled: Suno V5 via Kie AI runs in parallel with video generation
- Single-scene pipeline so music is a simple overlay
- Mood auto-detected from creative summary or user-specified

### 8. Assembly Engine

- Single-scene pipeline — Assembly Engine handles music overlay only (no concatenation)
- If music enabled: overlay music at reduced volume (25%) on the product video
- Provider: Fal AI FFmpeg API (custom command for audio mix)

### 9. Re-entry Controller

Resume from any stage via `job_stages` status check:
- `brief_intake` → `asset_analysis` → `creative_director` → `plan_review` → `image_generation` → `video_generation` → `assembly` → `delivery`
- If image generation fails, retry without re-running the Creative Director
- If user edits prompts after rejection, re-run only from plan_review

### 10. Tier Router

| Tier | Image Model | Video Model | Use Case |
|------|-------------|-------------|----------|
| **Draft** | GPT-4o Image (standard) | `veo3_fast` | Pre-approval iteration |
| **Production** | GPT-4o Image (high quality) | `veo3` | Post-approval final render |

- Auto-selects Draft before Plan Review Gate (save money during iteration)
- Switches to Production after user approval
- This is the pipeline where tier routing has the highest ROI (approval gate ensures production tier only fires once)

### 11. Hook Library Injection

- Query `hooks` table for top-performing hooks in brand's industry
- Inject hooks into caption generation (the `caption` field in output)
- Ensures captions use proven engagement patterns
- See `HOOK_LIBRARY_ENGINE_DESIGN.md` for schema and query patterns

### 12. Brand Voice DNA Integration

Inject `voice_signature.json` into Stage 3 Creative Director Agent:
- Prepend `## Brand Voice Context` block to the AGENT framework system prompt
- Caption tone, CTA patterns, and vocabulary match brand voice profile
- Creative summary reflects brand personality
- See `engines/BRAND_VOICE_DNA_ENGINE.md` for full schema and injection contract

### 13. Prompt Schema Normalizer

Replace stringified JSON video prompt with nested object schema:
- `video_prompt` becomes a structured object with SEALCaM fields (subject, environment, action, lighting, camera, metatokens)
- `image_prompt` also structured for consistency
- Eliminates double-serialization handling and escaping issues
- See `engines/AD_CREATOR_SCHEMA.md` for the migration spec

### 14. Provider Routing

All provider calls route through the Provider Routing Layer:
- Video: Kie AI → Runway → Pika (fallback chain)
- Image: Kie AI → OpenAI Images → SDXL (fallback chain)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic

### 15. Delivery & Post-Production (Module #17)

After Assembly, output passes through Module #17 for enterprise-grade finishing:
- **Auto-Subtitles**: ✅ (BytePlus VOD Smart Captioning)
- **Dubbing**: opt (user-selected)
- **Audio Polish**: ✅ (loudness normalization)
- **Video Enhancement**: opt (upscale, color grading)
- **Thumbnails**: ✅ (auto-extracted + brand overlay)
- **Watermark**: ✅ (review versions watermarked, stream-only)
- **Export**: ✅ (multi-format, multi-platform presets)
- See `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` for full specification
