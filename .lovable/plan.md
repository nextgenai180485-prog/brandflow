

## Brandflow MVP — Phase 1 Build Plan

### What We're Building

The core loop: **Request → Enhance → Generate → Review → Publish → Analyze**

This first build establishes the foundation — app shell, auth, database, and the landing page — so we can wire the generation pipeline immediately after.

### Build Order

**Step 1: Landing Page + App Shell**
- Build a premium landing page (ElevenLabs-inspired warm palette, already set up)
- Hero section: "Your brand's creative engine" with CTA
- Problem/solution section, how-it-works (3 steps: Request → Review → Publish)
- Waitlist/early access signup form
- App shell with sidebar navigation (Dashboard, Brands, Library, Requests, Approvals)

**Step 2: Connect Supabase + Auth**
- Enable Lovable Cloud (Supabase backend)
- Set up auth with email/password + Google OAuth
- Login/signup pages matching the brand aesthetic
- Protected routes for the dashboard

**Step 3: Core Database Schema**
- Workspaces, brands, campaigns tables
- Assets table with Supabase Storage integration
- Create requests table (the intake form)
- Jobs + job_stages tables (orchestration state machine)
- Artifacts table (generated outputs)
- Approvals table

**Step 4: Brand Onboarding Flow**
- Guided brand setup: name, logo, colors, tone of voice, target audience
- Brand detail page
- Asset upload (logos, product images, brand assets)

**Step 5: Request Creation Flow**
- "Create Content" guided form
- Select brand → choose content type → describe what you want → upload assets → submit
- Request persists to DB, triggers the enhancement step

**Step 6: AI Enhancement + Generation Pipeline**
- Edge Function: receives request, calls Lovable AI to enhance the brief (better prompt, concept, copy)
- Edge Function: generates content (images via AI, copy, captions)
- Results stored as artifacts linked to the request
- Status tracking: pending → generating → ready for review

**Step 7: Review + Approval Flow**
- Approval queue page showing pending content
- Review screen: see generated content, approve/reject/request revision
- Approved content moves to "ready to publish" state

**Step 8: Publish Flow**
- Simple publish action (mark as published, store publish timestamp)
- Future: integrate with social platforms via connectors

**Step 9: Analytics/Learning Loop**
- Track approval rates, revision counts, generation quality signals
- Dashboard showing content pipeline metrics
- Feed learning signals back into prompt enhancement

### Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend | Lovable Cloud (Supabase) | No external account needed, fastest path |
| AI | Lovable AI Gateway (Gemini) | Pre-configured, no API keys needed |
| Auth | Supabase Auth | Built-in, handles sessions |
| Storage | Supabase Storage | Assets + generated artifacts |
| Orchestration | Edge Functions | TypeScript-native, sufficient for MVP |
| State machine | DB-driven (job_stages table) | Simple, auditable, no extra infra |

### What This Gets You

After this build, you'll have a working product where a user can:
1. Sign up and create a brand
2. Submit a content request in plain language
3. Brandflow enhances the brief with AI
4. Content is generated automatically
5. User reviews and approves in a clean UI
6. Content is marked as published
7. System tracks quality metrics for continuous improvement

Enterprise-grade from day one: typed contracts, audit trail, approval gates, provider abstraction, artifact versioning.

