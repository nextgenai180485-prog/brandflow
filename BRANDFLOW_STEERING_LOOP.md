# BRANDFLOW Steering Loop
_Last updated: 2026-03-25_

## Purpose
This document exists to keep Brandflow focused.

It defines:
- how the roadmap should be adjusted
- how the initiative should be evaluated
- what signals matter most in the early phase
- how to steer the product without getting lost in feature sprawl

---

## 1. Roadmap Adjustment

### Core recommendation
Do **not** broaden the roadmap yet.
Tighten it.

Brandflow does not need more ambition right now.
It needs better sequencing.

### Main adjustment
Move **workflow inventory + provider abstraction design** to the top of the roadmap.

Before deep implementation, we need every workflow mapped with:
- input
- output
- provider used
- cost sensitivity
- latency
- failure points
- sync vs async behavior

### Why this matters
Without this, the product architecture stays too theoretical.
The real system cannot be designed properly until the actual workflows are known.

---

## 2. Dashboard Restraint

### Rule
The dashboard is not the product.

The dashboard can be premium and useful, but it should not distract from the real MVP center:
- onboarding
- first batch generation
- approval workspace
- scheduling state

### Correct priority order
1. onboarding
2. first generated batch
3. approval workspace
4. scheduling / publishing state
5. dashboard refinement

### Avoid
- analytics-first roadmap thinking
- overbuilding visual admin layers before the core loop feels smooth

---

## 3. Approval Workspace Priority

### Rule
The approval workspace is the core differentiator.

This is where Brandflow separates itself from generic tools like Publer, Buffer, and other scheduling products.

### Product requirement
Approval should feel:
- fast
- clear
- low-friction
- confidence-building
- better than manual review and posting

### Early requirement set
- approve
- reject
- regenerate
- lightweight edit
- preview by platform
- bulk approval
- approval event logging

---

## 4. Learning Loop Timing

### Rule
Do not overbuild the intelligence layer too early.

### Phase 1
Capture signals:
- approval events
- rejection events
- edit events
- publishing outcomes

### Phase 2
Use those signals to improve generation quality.

### Phase 3
Surface the learning back to the user in a meaningful way.

### Why
The smartest first move is not to over-explain intelligence.
The smartest first move is to **collect real signal**.

---

## 5. Publishing Architecture Rule

### Rule
Publishing must be treated as a replaceable layer.

Whether we start with Blotato or another provider, Brandflow should not hardwire publishing logic to one external service.

### Product architecture requirement
Brandflow should use its own internal publishing abstraction.

Example responsibilities:
- schedule post
- publish post
- check post status
- cancel scheduled post
- retry failed publish

### Why
This keeps the system:
- faster to evolve
- less vendor-locked
- more enterprise-ready later

---

## 6. Revised Roadmap Priority

### Priority 1
- workflow inventory
- provider abstraction
- schema design
- onboarding architecture

### Priority 2
- first generated batch
- approval workspace
- asset handling
- preview system

### Priority 3
- scheduling / publishing state machine
- provider integration
- retry / failure handling

### Priority 4
- dashboard intelligence
- learning loop surfaces
- advanced campaign logic

### Priority 5
- team features
- mobile app
- enterprise extras

---

## 7. Initiative Evaluation

### Problem quality
**9/10**
Real, painful, and widespread.

### Buyer willingness to pay
**8.5/10**
Especially strong in medspa and e-commerce if the output quality is truly good.

### Differentiation
**8/10**
Strong if Brandflow stays approval-first and quality-first.
Weakens quickly if it becomes just another scheduler.

### GTM clarity
**8/10**
Medspa-first + founder-led + concierge MVP is a workable early path.

### Product complexity
**8.5/10 complexity**
This is a serious system with many moving parts.

### Execution risk
**High but manageable**
Not because the idea is weak — because the system is rich and easy to overbuild.

### Speed-to-value potential
**9/10**
If the first flow is correct, users can feel value quickly.

### Long-term platform potential
**9/10**
Brandflow can grow into:
- content OS
- brand OS
- campaign OS
- creative operations platform
- multi-agent marketing platform

### Biggest strength
The promise is easy to understand and commercially useful.

### Biggest risk
Building too much before the core loop becomes frictionless.

---

## 8. Initiative Verdict

Brandflow is a **strong initiative**.
It is not just a cool idea.
It is a real business candidate.

### Why it is strong
- real problem
- obvious value
- clear wedge
- strong concierge MVP path
- room for moat later

### Why it can still fail
- slow product
- weak approval UX
- generic output quality
- too much early complexity
- trying to impress before proving value

---

## 9. Weekly Steering Loop

Every week, Brandflow should be reviewed through these questions:

1. Are users getting to first value fast enough?
2. Is approval easier than manual posting?
3. Is content quality high enough to trust?
4. Are publish/schedule states reliable?
5. What part of the flow is creating the most friction?
6. What can we remove instead of add?

This should be the operating lens.

---

## 10. Early KPI Focus

### Core KPIs
- onboarding completion rate
- time to first generated batch
- first-week approval rate
- percentage of content approved without rewrite
- weekly return rate
- pilot retention
- publish success rate
- generation turnaround time

### Why these matter
These KPIs measure whether the core loop is working.
They matter more than vanity growth metrics in the early phase.

---

## 11. Final Steering Guidance

### Should Brandflow continue?
**Yes. Absolutely.**

### Should the roadmap be adjusted?
**Yes.**
Toward:
- workflow clarity
- approval-first MVP
- less dashboard vanity
- more core-loop discipline

### Final initiative classification
**High-potential, execution-sensitive, worth pursuing.**

---

## 12. North Star Reminder

Brandflow should be judged by one question:

> Can a small business owner go from signup to approved weekly content with speed, trust, and minimal stress?

If yes, Brandflow wins.
If not, all extra features are noise.
