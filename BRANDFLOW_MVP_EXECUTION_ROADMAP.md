# BRANDFLOW MVP Execution Roadmap
_Last updated: 2026-03-25_

## Purpose
This document defines the practical MVP build order for Brandflow.

It is designed to keep execution tight, fast, and focused on the core loop.

---

## MVP Principle
Do not build the impressive version first.
Build the version that proves:
- users can onboard
- Brandflow can generate a first content batch
- users can approve content quickly
- approved content can move into a scheduling/publishing state

That is the MVP.

---

## Phase 0 — Workflow Intelligence Intake

### Goal
Turn the real workflows into a system map.

### Tasks
- collect all workflows from operator
- classify workflow categories
- map inputs/outputs
- map providers used
- map cost/latency/failure points
- identify sync vs async tasks
- identify asset requirements per workflow/template

### Exit criteria
- complete workflow inventory exists
- provider map exists
- asset map exists

---

## Phase 1 — Architecture + Foundation

### Goal
Create the implementation base.

### Tasks
- initialize Brandflow repo
- establish Next.js app structure
- wire Supabase
- define initial schema
- define provider abstraction layer
- define job orchestration strategy
- add design tokens / UI primitives

### Exit criteria
- app skeleton exists
- DB is connected
- schema draft exists
- UI system is seeded

---

## Phase 2 — Front Door + Identity

### Goal
Create the first live surface of Brandflow.

### Tasks
- build landing page
- build waitlist/signup
- build auth flow
- build app shell
- implement base dashboard structure

### Exit criteria
- users can reach the product
- users can sign up
- app shell is navigable

---

## Phase 3 — Onboarding + Brand Intake

### Goal
Get a business into the system without excessive friction.

### Tasks
- phased onboarding
- website input
- business profile capture
- asset upload
- brand voice capture
- social account placeholders/connections
- onboarding progress and persistence

### Exit criteria
- a user can complete onboarding
- brand data is stored correctly
- generation can be triggered from real user data

---

## Phase 4 — First Generated Batch

### Goal
Reach the first “wow” moment.

### Tasks
- create batch-generation trigger flow
- run generation through provider abstraction
- store generated outputs
- render first content batch
- show generation progress/status
- support partial result delivery

### Exit criteria
- Brandflow can generate first outputs for a real onboarded brand
- user sees useful content, not a blank workspace

---

## Phase 5 — Approval Workspace

### Goal
Build Brandflow’s core differentiator.

### Tasks
- content review layout
- platform preview system
- approve action
- reject action
- regenerate action
- lightweight edit action
- approval event logging
- batch and item status transitions

### Exit criteria
- user can review and approve a content batch quickly
- state updates are visible and reliable

---

## Phase 6 — Scheduling / Publishing State

### Goal
Move approved content into real delivery state.

### Tasks
- scheduling state model
- publishing abstraction implementation
- first publishing provider integration
- publish status UI
- retry/failure states
- audit/status history

### Exit criteria
- approved content can move into a visible schedule/publish pipeline
- failures are surfaced clearly

---

## Phase 7 — Pilot Hardening

### Goal
Make the MVP usable with early businesses.

### Tasks
- improve onboarding friction points
- improve generation speed/perception
- improve approval UX speed
- improve publishing reliability
- capture approval/rejection/edit signals
- add logging/monitoring
- fix top pilot pain points

### Exit criteria
- internal team would trust pilot users on the product
- weekly use feels stable enough for real testing

---

## What Is Explicitly Out of Scope for MVP

Do not prioritize these before the core loop works:
- native mobile app
- deep analytics suite
- advanced multi-role enterprise permissions
- broad multi-vertical support
- advanced self-serve enterprise controls
- overly complex learning dashboards
- huge template marketplace surfaces

---

## Core Build Sequence Summary

1. workflow inventory
2. architecture foundation
3. landing + signup + shell
4. onboarding
5. first generated batch
6. approval workspace
7. scheduling/publishing state
8. pilot hardening

---

## MVP Success Test

Brandflow MVP is successful if a medspa owner can:
1. sign up
2. onboard quickly
3. receive a first batch of content
4. approve content in minutes
5. trust the schedule/publish flow
6. feel less stress than before

If that is not true, the MVP is not done.

---

## Final Execution Rule

Brandflow should always prioritize:
**core loop speed over feature breadth**

The product does not win by looking large.
It wins by making the approval-first content workflow feel fast, clear, and valuable.
