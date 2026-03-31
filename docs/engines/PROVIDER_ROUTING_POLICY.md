# Provider Routing Policy — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Eliminate single-provider dependency with automatic fallback routing

---

## Overview

Brandflow currently depends heavily on Kie AI (video), WaveSpeed (images), and Fal.ai (lip-sync, FFmpeg). If any provider goes down, entire pipeline families fail. This policy defines fallback chains, health-check monitoring, and auto-recovery for all provider categories.

---

## Fallback Chains

### Video Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | Kie AI | Veo3 / Veo3_fast | F1, F5, F7 |
| Fallback 1 | Runway | Gen-4 | F1, F5, F7 |
| Fallback 2 | Pika | Pika 2.2 | F1, F5, F7 |

### Image Generation

| Priority | Provider | Model | Families |
|----------|----------|-------|----------|
| Primary | WaveSpeed AI | nano-banana-pro | F3, F5, F6, F8 |
| Fallback 1 | Kie AI | GPT-4o Image | F1, F7 |
| Fallback 2 | OpenAI | DALL-E 3 | All |
| Fallback 3 | Replicate | SDXL variants | All |

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

## Routing Logic (Pseudocode)

```
function selectProvider(category, tier):
  chain = fallback_chains[category]
  for provider in chain:
    status = registry.getStatus(provider.id)
    if status.status === "healthy":
      return provider
    if status.status === "degraded" and no better option:
      return provider  // with warning
  
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

1. **Fallback ≠ equivalent** — fallback providers may produce slightly different quality/style. Document differences per chain.
2. **Cost implications** — fallback providers are often more expensive. Log cost delta when fallback is active.
3. **Rate limit awareness** — if failover is due to rate limiting, the fallback provider may also rate-limit under sudden load.
4. **Provider-specific polling patterns** — Kie AI uses `taskId`, Fal.ai uses `response_url`, WaveSpeed uses `request_id`. The routing layer must abstract these differences.
5. **Alert on failover** — notify system admins when any provider enters `degraded` or `down` state.
