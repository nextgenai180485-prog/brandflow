# Brandflow Implementation Priorities

> **Status**: Active roadmap  
> **Last updated**: 2026-04-03  
> **Purpose**: Tiered implementation plan — trust-critical → learning-critical → scale-critical  
> **Source of truth**: `docs/BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md`

---

## Guiding Principle

Every major request must produce:

1. A **strategy object** — what we decided to create and why
2. A **rationale** — the reasoning chain behind the decision
3. A **confidence signal** — how certain the system is
4. **Alternative paths** — what else was considered
5. **Traceable source inputs** — what data informed the decision

This is what makes the architecture **decision-rich**, not just module-rich.

---

## User-Facing Flow Compression

Internally: 27 modules + 4 architectural layers + 15-step pre-generation pipeline.

Externally, users experience **6 steps**:

| Step | User Feels | Internal Reality |
|------|-----------|-----------------|
| **Understand** | "It knows my brand" | Brand Memory + Category Intelligence + Research Engine |
| **Decide** | "It chose smartly" | Decision Engine + Strategy Object Builder + Trust Engine |
| **Create** | "It made great content" | Creative Direction + Creative Director Agent + Provider Routing + Generation |
| **Finish** | "It's polished and ready" | Assembly + Post-Production + Review Packet |
| **Publish** | "It posted for me" | Social Publishing + Delivery Packaging |
| **Learn** | "It gets better each time" | Performance Feedback + Brand Memory updates + Preference Learning |

This compression is critical. The system must feel simple even though it's sophisticated.

---

## Tier 1 — Trust-Critical (Weeks 1–6)

> These create the **feeling of intelligence and trust** fastest.

### 1.1 Foundation Infrastructure

| Component | What | Why First |
|-----------|------|-----------|
| Supabase schema deployment | Deploy 32 tables from `db/BRANDFLOW_SQL_SCHEMA.md` | Everything depends on persistence |
| Brand Profile + Brand Memory tables | `brand_profiles`, `brand_memory`, `asset_memory`, `preference_memory`, `creative_history`, `do_not_use_registry` | Every family needs brand context |
| Jobs + Job Stages tables | `jobs`, `job_stages`, `artifacts`, `touchpoint_events` | Billing and orchestration core |
| Plan Object tables | `plan_objects`, `plan_versions`, `plan_dependencies` | Central contract for all initiatives |

### 1.2 Intelligence Stack

| Component | What | Why Trust-Critical |
|-----------|------|-------------------|
| **Creative Direction Engine (#23)** | Build reasoning logic for Stage 0 intake | **Biggest commercial gap** — without this, generation starts blind |
| **Decision Engine (#26)** | Per-request strategic decisioning → `strategy_object.json` | Makes every output intentional, not random |
| **Brand Memory Engine** | Query/update brand-specific intelligence | Makes system feel like it knows the client |
| **Strategy Object Builder** | Transform strategy_object → family-specific generation instructions | Ensures coherent execution across families |
| **Trust & Explainability Engine** | Generate `decision_trace.json` for every recommendation | Makes the system inspectable, not black-box |
| **Review Packet Engine (#19)** updates | Attach decision_trace, strategy_angle, confidence, alternatives | Transforms approval from "accept/reject" to trust-building |

### 1.3 Success Criteria

- [ ] Every generation request flows through the 15-step pre-generation pipeline
- [ ] Every review packet includes: why this direction, what informed it, how confident, what alternatives
- [ ] Brand Memory persists approved/rejected patterns across sessions
- [ ] Users say "it feels like it understands my brand" in first feedback loop

---

## Tier 2 — Learning-Critical (Weeks 7–12)

> These make the system **improve over time**.

### 2.1 Closed-Loop Learning

| Component | What | Why Learning-Critical |
|-----------|------|----------------------|
| **Performance Feedback (#22) expansion** | Engagement signal collection (T+24h, T+48h, T+7d, T+30d) | Without signals, the system can't learn |
| **Approval/rejection loops** | Track patterns per brand: what gets approved, what gets rejected, why | Feeds Brand Memory with actionable intelligence |
| **Preference learning** | Infer format, visual style, voice, platform preferences from behavior | System adapts to each brand's taste without manual config |
| **Variant winner tracking** | A/B test result ingestion → hook weight updates | Closes the loop on Campaign Multiplication |
| **Category Intelligence Cache** | Cache vertical heuristics, refresh on staleness | Reduces research cost/latency by 60–80% for repeat categories |

### 2.2 Auto-Detection Logic

| Component | What | Why |
|-----------|------|-----|
| **Brand Memory auto-detection** | Auto-infer brand association, approved styles, rejection patterns | See `engines/BRAND_MEMORY_AUTO_DETECTION.md` |
| **Do-not-use auto-flagging** | 5+ rejections of same pattern → automatic flag | System protects brands from repeated mistakes |
| **Hook weight decay** | Reduce weight of underperforming hooks over time | Prevents stale hooks from dominating recommendations |

### 2.3 Success Criteria

- [ ] System demonstrates measurable improvement in approval rate after 20+ brand interactions
- [ ] Hook Library weights update automatically from performance signals
- [ ] Category Intelligence Cache hit rate > 70% for repeat verticals
- [ ] Do-not-use patterns auto-detected without manual intervention

---

## Tier 3 — Scale-Critical (Weeks 13–18)

> These enable **operational scale and distribution**.

### 3.1 Publishing & Distribution

| Component | What | Why Scale-Critical |
|-----------|------|-------------------|
| **Social Publishing Engine (#27)** | Meta Graph API + TikTok API integration | Closes the "last mile" — content reaches audiences automatically |
| **Campaign Multiplication (W6)** | Hook swaps, cutdowns, aspect ratio variants, A/B packs | Multiplies value per approved asset |
| **Localization Engine (#18)** | Multilingual translation + cultural adaptation + dubbing | Opens international markets |

### 3.2 Operational Automation

| Component | What | Why |
|-----------|------|-----|
| **Research Engine (#25)** full implementation | Competitor discovery, trend signals, category norms | Market-aware generation at scale |
| **Provider Routing health checks** | 3-strike failover, automated provider switching | Reliability at volume |
| **SLA enforcement** | Critical path calculation, escalation triggers | Enterprise-grade delivery guarantees |
| **Cross-brand portfolio view** | Multi-brand dashboard, aggregate analytics | Agency/enterprise scale |

### 3.3 Success Criteria

- [ ] End-to-end flow: brief → generation → approval → publish → learn in one session
- [ ] Platform publishing success rate > 95%
- [ ] Campaign Multiplication generates 5+ variants from single approved asset
- [ ] System handles 100+ concurrent brand contexts without degradation

---

## Risk Mitigation

### Risk 1: Over-Architecture Before Proving the Core Loop

**Mitigation**: Tier 1 focuses entirely on making the core loop feel magical:
- User gives project → Brandflow understands it → makes smart recommendation → creates useful output → explains why → improves next time

If this loop isn't tight, the architecture becomes abstract.

### Risk 2: Too Many Modules Without Dominant Execution Path

**Mitigation**: Internally 27+4 modules. Externally: **Understand → Decide → Create → Finish → Publish → Learn**. That compression is enforced at the UI layer.

### Risk 3: Explainability Becomes Verbose

**Mitigation**: Trust Engine output is compressed to:
- Why this direction was chosen (1 sentence)
- What informed it (3–5 bullet signals)
- Confidence score (0.0–1.0)
- What alternatives exist (2–3 options with reason for rejection)

Short, useful, confidence-building. Not engine soup.

---

## Dependency Graph

```
Tier 1 (Trust):
  Supabase Schema → Brand Memory → Decision Engine → Strategy Object Builder → Trust Engine
                  → Creative Direction (#23) → Creative Director Agent (#1) → Review Packets

Tier 2 (Learning):
  Performance Feedback (#22) → Brand Memory updates → Preference Learning
  Category Intelligence Cache ← Research Engine (#25)
  Variant Winner Tracking ← Campaign Multiplication (W6)

Tier 3 (Scale):
  Social Publishing (#27) ← Delivery Packaging ← Post-Production (#17)
  Localization (#18) ← Voice Management (#20)
  Provider Routing health ← Infrastructure
```

---

## Cross-References

| Document | Relevance |
|----------|-----------|
| `BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md` | Master architecture — source of truth |
| `BRANDFLOW_MVP_EXECUTION_ROADMAP.md` | MVP-specific execution sequence |
| `engines/BRAND_MEMORY_AUTO_DETECTION.md` | Auto-detection logic design |
| `PLAN_OBJECT_SCHEMA.md` | Strategy Object as system spine |
| `db/BRANDFLOW_SQL_SCHEMA.md` | 32-table schema for deployment |
