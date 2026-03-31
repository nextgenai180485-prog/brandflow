# Provider & Tier Routing Engine — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module (infrastructure)  
> **Purpose**: Unified routing layer combining quality-tier selection AND provider failover into a single decision engine
> **Consolidation note**: This module merges the former **Tier Router (#9)** and **Provider Routing Layer (#14)** — they are two halves of the same routing decision.

---

## Overview

Every generation request flows through a single routing engine that answers two questions in sequence:

1. **What quality tier?** → Draft (fast/cheap preview) or Production (high-fidelity final render)
2. **Which provider at that tier?** → Select from the healthy primary; if down, failover to next in chain

Previously these were separate modules. Merging them eliminates a double-routing hop and ensures tier + provider decisions are consistent.

---

## Architecture

```text
Generation Request
  │
  ▼
┌─────────────────────────────────────┐
│ Provider & Tier Routing Engine      │
│                                     │
│  1. Resolve tier (draft/production) │
│     ├─ job.status === 'approved' → production │
│     └─ else → draft                │
│                                     │
│  2. Select provider from chain      │
│     ├─ Check provider_status_registry│
│     ├─ Primary healthy? → use it   │
│     └─ Else → next fallback        │
│                                     │
│  3. Return: { provider, model, tier }│
└─────────────────────────────────────┘
  │
  ▼
Provider Adapter (Kie AI / Runway / WaveSpeed / etc.)
```

---

## Tier Routing Logic

### Tier Definitions

| Tier | Purpose | Trigger | Cost | Latency |
|------|---------|---------|------|---------|
| **Draft** | Fast iteration, first previews | Pre-approval, first generation | ~$0.02–0.05/call | 5–30s |
| **Production** | Final approved render | Post-approval via Plan Review Gate | ~$0.10–0.50/call | 30–120s |

### Tier-Specific Model Selection

| Category | Draft Model | Production Model |
|----------|-------------|-----------------|
| Video | veo3_fast | veo3 |
| Video (PV) | Seedance 1.0 Lite | Seedance 1.0 |
| Image | Seedream 5.0 Lite | Seedream 5.0 Pro |
| Image Edit | SeedEdit 3.0 (draft) | SeedEdit 3.0 (full) |
| Lip-sync | ByteDance LatentSync | Sync Labs Lipsync 2.0 |
| Music | Suno V5 (30s) | Suno V5 (full) |
| Voice | ElevenLabs Turbo v2.5 | ElevenLabs Multilingual V2 |

### Auto-Tier Selection Rules

```
function resolveTier(job):
  if job.status === 'approved':
    return 'production'
  if job.revision_count > 0 and user_requested_final:
    return 'production'
  return 'draft'
```

---

## Fallback Chains

### Video Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | Kie AI | Veo3 / Veo3_fast | F1, F3, F5, F7 |
| Fallback 1 | BytePlus | Seedance 1.0 | F3, F5 |
| Fallback 2 | Runway | Gen-4 | F1, F5, F7 |
| Fallback 3 | Pika | Pika 2.2 | F1, F5, F7 |

### Image Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | WaveSpeed AI | nano-banana-pro | F3, F5, F6, F8 |
| Fallback 1 | BytePlus | SeedEdit 3.0 / Seedream 5.0 | F3, F6 |
| Fallback 2 | Kie AI | GPT-4o Image | F1, F7 |
| Fallback 3 | OpenAI | DALL-E 3 | All |
| Fallback 4 | Replicate | SDXL variants | All |

### Image-to-Video

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | WaveSpeed AI | Kling 2.6 Pro | F8 |
| Fallback 1 | Kie AI | Kling 2.6 | F2 |
| Fallback 2 | Fal.ai | Kling variants | F2, F8 |

### Lip-Sync

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | Fal.ai | Sync Labs Lipsync 2.0 | F2 (production) |
| Fallback 1 | Fal.ai | ByteDance LatentSync | F2 (draft) |
| Fallback 2 | Replicate | Wav2Lip | F2 (emergency) |

### Music Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | Kie AI | Suno V5 | F5, F8 |
| Fallback 1 | Suno Direct | Suno API | F5, F8 |
| Fallback 2 | Udio | Udio API | F5, F8 |

### Voice Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | ElevenLabs | Multilingual V2 | F2, F5 |
| Fallback 1 | WaveSpeed | ElevenLabs Turbo v2.5 | F5 |

### Vision Analysis

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | Lovable AI Gateway | Gemini | All |
| Fallback 1 | OpenAI | GPT-4o Vision | All |

---

## Provider Status Registry

```json
{
  "providers": [
    {
      "provider_id": "kie_ai",
      "display_name": "Kie AI",
      "status": "healthy",
      "latency_p95_ms": 2400,
      "last_checked": "2026-03-31T10:00:00Z",
      "error_count_1h": 0,
      "error_count_24h": 2,
      "consecutive_failures": 0,
      "failover_active": false,
      "endpoints": {
        "veo_generate": { "status": "healthy", "latency_p95_ms": 2400 },
        "gpt4o_image": { "status": "healthy", "latency_p95_ms": 1800 },
        "suno_generate": { "status": "healthy", "latency_p95_ms": 5000 }
      }
    }
  ]
}
```

---

## Health-Check Protocol

### Polling
- **Interval**: 60 seconds per provider
- **Method**: Lightweight health-check endpoint or minimal test request
- **Timeout**: 10 seconds per check

### Failover Logic
- **3-strike rule**: 3 consecutive failures → mark provider as `degraded`
- **Degraded**: Route new requests to fallback; existing in-progress requests continue
- **Down**: 5 consecutive failures → mark as `down`, full failover active
- **Error types that trigger failover**: 5xx errors, timeouts, rate limit exhaustion
- **Error types that do NOT trigger failover**: 4xx client errors, invalid input

### Auto-Recovery
- After failover, continue polling the primary provider
- **5 minutes healthy**: Re-enable primary as active (gradual: 25% → 50% → 100% over 15 min)
- **Sticky sessions**: In-progress jobs stay on their current provider until completion

---

## Unified Routing Logic (Pseudocode)

```
function route(category, job):
  // Step 1: Resolve tier
  tier = resolveTier(job)
  
  // Step 2: Get chain for category
  chain = fallback_chains[category]
  
  // Step 3: Select model for tier
  for provider in chain:
    status = registry.getStatus(provider.id)
    if status.status === "healthy":
      model = provider.models[tier]  // draft or production model
      return { provider: provider.id, model, tier }
    if status.status === "degraded" and no_better_option:
      return { provider: provider.id, model: provider.models[tier], tier, warning: "degraded" }
  
  // All providers down
  throw ProviderUnavailableError(category)
  // Queue job for retry when provider recovers
```

---

## Database Schema

```sql
CREATE TABLE provider_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, down
  latency_p95_ms INTEGER,
  last_checked TIMESTAMPTZ DEFAULT now(),
  error_count_1h INTEGER DEFAULT 0,
  error_count_24h INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  failover_active BOOLEAN DEFAULT false,
  endpoints JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Key Design Notes

1. **Single routing call** — tier + provider resolved in one function, not two sequential lookups
2. **Fallback ≠ equivalent** — fallback providers may produce slightly different quality/style. Document differences per chain.
3. **Cost implications** — fallback providers are often more expensive. Log cost delta when fallback is active.
4. **Rate limit awareness** — if failover is due to rate limiting, the fallback provider may also rate-limit under sudden load.
5. **Provider-specific polling patterns** — Kie AI uses `taskId`, Fal.ai uses `response_url`, WaveSpeed uses `request_id`. The routing layer must abstract these differences.
6. **Alert on failover** — notify system admins when any provider enters `degraded` or `down` state.
7. **Tier override** — users on Enterprise plan can force `production` tier on first generation (skip draft).
