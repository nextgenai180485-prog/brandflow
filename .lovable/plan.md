

# Security Hardening Plan

## Summary
The core chat and campaign flows are already auth-gated and safe. This plan addresses 4 security findings from the scan to bring the system to enterprise-grade.

## Changes

### 1. Remove dead `blotato_api_key` column from profiles
Migration to drop the column — it's a leftover from Model B and shouldn't store API keys in user-accessible rows.

### 2. Lock down media storage buckets
Add INSERT/UPDATE/DELETE policies to `brandflow-pv-frames`, `brandflow-pv-videos`, `brandflow-asv-voice`, `brandflow-asv-videos` scoped to `service_role` only (Edge Functions upload, users read).

### 3. Restrict campaign_assets SELECT to authenticated users
Replace the anonymous public SELECT policy with one requiring `auth.uid() IS NOT NULL` — assets are still readable by any logged-in user (needed for shared campaigns) but not by anonymous visitors.

### 4. Enable leaked password protection
Turn on Supabase Auth's leaked password protection via project settings (requires manual toggle in Supabase Dashboard > Authentication > Settings).

### 5. Tighten RLS role scoping
Several policies apply to `{public}` role instead of `{authenticated}`. While `auth.uid() = profile_id` already blocks anonymous access (since `auth.uid()` returns null for anon), switching to `{authenticated}` is defense-in-depth best practice. Tables affected: campaigns, generated_assets, brand_assets, profiles, campaign_research, decision_traces, brand_memory, brand_strategy, campaign_assets, cmo_chat_messages.

## Technical Detail

All changes are SQL migrations. No UI changes needed. The `blotato_api_key` column removal also requires removing any TypeScript references to `profiles.blotato_api_key` in the frontend.

## What the User Needs To Do
- Go to Supabase Dashboard > Authentication > Settings and enable "Leaked Password Protection"

