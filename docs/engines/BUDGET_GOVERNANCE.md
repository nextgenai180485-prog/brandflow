# Budget & Spend Governance — Enterprise Planning Layer

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Owner**: Cross-family (extends Strategy Engine #21)  
> **Phase**: 1A — Governance & Control

---

## Purpose

Prevent uncontrolled spend by enforcing per-brand budget caps, per-campaign allocations, and pre-flight cost checks before any initiative enters the generation queue. This is not a new engine module — it is a governance capability embedded in Strategy Engine (#21) and Plan Review Gate (#2).

---

## Problem

Without budget governance:
- A single campaign track can exhaust an entire brand's monthly budget
- Premium-tier jobs (F5 Cinematic, F2 Spokesperson) can silently accumulate $100+ costs
- No visibility into burn rate until invoices arrive
- No mechanism to block or warn before overspend

---

## Budget Hierarchy

```
Organization (Agency)
  └── Brand Budget (monthly/quarterly cap)
        └── Campaign Track Allocation (reserved from brand budget)
              └── Initiative Cost (actual spend per plan_object)
```

### Rules

| Level | Enforcement | Action on Breach |
|-------|-------------|------------------|
| Organization | Aggregate cap across all brands | Hard block — no new initiatives |
| Brand | Monthly or quarterly spend cap | Hard block at cap, soft warning at 80% |
| Campaign Track | Allocated budget from brand pool | Soft warning when allocation exhausted, falls back to brand pool |
| Initiative | Pre-flight cost estimate check | Block if estimate > remaining brand budget |

---

## Pre-Flight Budget Check

Before Strategy Engine (#21) queues any initiative, it executes this check:

```
1. Resolve brand_id from the initiative
2. Query current period budget:
   SELECT cap_usd, consumed_usd FROM brand_budgets
   WHERE brand_id = ? AND period_start <= now() AND period_end >= now()
3. Calculate remaining = cap_usd - consumed_usd
4. Compare initiative cost_estimate.total_usd against remaining
5. Return budget_check result:
   - passed: cost < remaining AND remaining > 20% of cap
   - warning: cost < remaining BUT remaining < 20% of cap
   - blocked: cost >= remaining
```

### Integration with Plan Object

The `budget_check` field is added to `PLAN_OBJECT_SCHEMA.md`:

```json
"budget_check": {
  "status": "passed | warning | blocked",
  "remaining_usd": 245.00,
  "period_cap_usd": 500.00,
  "consumed_usd": 255.00,
  "burn_rate_daily_usd": 12.50,
  "projected_exhaustion_date": "ISO 8601 | null"
}
```

### Status Effects

| Budget Status | Plan Object Status | Requires |
|---------------|-------------------|----------|
| `passed` | Proceeds to `queued` | Nothing |
| `warning` | Proceeds to `queued` with flag | Human acknowledgment in Review Packet |
| `blocked` | Enters `blocked_budget` | Budget increase or lower-tier re-route |

---

## Burn Rate Tracking

The system maintains a rolling burn rate per brand:

```
burn_rate_daily = SUM(job_stages.cost) over last 7 days / 7
projected_exhaustion = remaining_usd / burn_rate_daily
```

This feeds into:
- **Strategy Engine (#21)**: adjusts initiative priority if budget is running low
- **Metrics Layer 2**: `mv_brand_budget_health` materialized view
- **Event Bus**: emits `budget.warning` at 80% and `budget.critical` at 95% utilization

---

## Campaign Track Allocation

Brands can optionally reserve budget for specific campaign tracks:

```json
{
  "allocation_id": "uuid",
  "brand_id": "uuid",
  "campaign_track_id": "uuid",
  "allocated_usd": 150.00,
  "consumed_usd": 42.30,
  "status": "active | exhausted | cancelled"
}
```

### Allocation Rules

- Allocations are carved from the brand's period budget
- When a track allocation is exhausted, initiatives fall back to the general brand pool
- Unspent allocations are released at campaign track end date
- Over-allocation (sum of allocations > brand cap) is prevented at creation time

---

## Tier Downgrade on Budget Pressure

When budget is under pressure (warning or blocked), the system can suggest automatic tier downgrades:

| Original Tier | Downgrade Option | Typical Savings |
|---------------|-----------------|-----------------|
| Premium | Standard | 40-60% |
| Standard | Draft | 50-70% |
| Draft | — (already minimum) | — |

The downgrade suggestion is surfaced in the Plan Review Gate (#2) as an alternative route. The human approver decides whether to accept the downgrade or increase budget.

---

## Event Bus Integration

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `budget.check.passed` | Pre-flight check passes | `{ brand_id, remaining_usd, initiative_cost_usd }` |
| `budget.check.warning` | Remaining < 20% of cap | `{ brand_id, remaining_usd, burn_rate_daily }` |
| `budget.check.blocked` | Cost exceeds remaining | `{ brand_id, remaining_usd, requested_usd }` |
| `budget.threshold.80` | Period consumption hits 80% | `{ brand_id, consumed_usd, cap_usd }` |
| `budget.threshold.95` | Period consumption hits 95% | `{ brand_id, consumed_usd, cap_usd }` |
| `budget.allocation.exhausted` | Campaign track allocation fully consumed | `{ brand_id, campaign_track_id }` |

---

## Audit Trail Integration

Every budget check emits an `audit_log` entry (Layer 3):

```json
{
  "entity_type": "plan_object",
  "entity_id": "plan_id",
  "action": "budget_check",
  "actor": "system:strategy_engine",
  "detail": {
    "status": "warning",
    "remaining_usd": 45.00,
    "initiative_cost_usd": 12.50
  }
}
```

---

## Database Schema

```sql
CREATE TABLE brand_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cap_usd NUMERIC NOT NULL,
  consumed_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | exhausted | closed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, period_start, period_end)
);

CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  budget_id UUID REFERENCES brand_budgets(id) NOT NULL,
  campaign_track_id UUID NOT NULL,
  allocated_usd NUMERIC NOT NULL,
  consumed_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | exhausted | cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_budgets_active ON brand_budgets(brand_id, period_start, period_end);
CREATE INDEX idx_budget_allocations_track ON budget_allocations(campaign_track_id);
```

---

## Cross-References

| Component | Interaction |
|-----------|------------|
| Strategy Engine (#21) | Executes pre-flight budget check before queueing |
| Plan Review Gate (#2) | Displays budget status and downgrade options |
| Plan Object Schema | `budget_check` field added to plan object |
| Metrics Layer 2 | `mv_brand_budget_health` materialized view |
| Event Bus (Layer 1) | Budget threshold events |
| Audit Trail (Layer 3) | Immutable budget check records |
| Performance Feedback (#22) | Budget efficiency metrics feed back into strategy optimization |
