
## Enterprise-Grade Gap Closure Plan

After a full audit of the codebase, architecture, and UX, here are the **7 gaps** that need closing before we move to dataset loading. Each is scoped, prioritized, and actionable.

---

### 1. 🔒 Admin Role Check in Edge Function (CRITICAL — Security)
**Gap:** The `admin-library` edge function authenticates the user but **never checks if they have the admin role**. Any authenticated user can create/update/delete library items.
**Fix:** Add `has_role` check via a query to `user_roles` in the edge function before allowing write operations (`create`, `update`, `toggle`, `delete`).

---

### 2. 🛡️ Error Boundary (HIGH — Stability)
**Gap:** No React error boundary exists. A single component crash whiteouts the entire app.
**Fix:** Create a `<ErrorBoundary>` component wrapping `<Routes>` in `App.tsx` with a branded fallback UI ("Something went wrong — reload").

---

### 3. 📊 Admin Dashboard → Libraries Link Fix (MEDIUM — UX)
**Gap:** The Admin Dashboard navigation link in `AppShell.tsx` points to `/dashboard/admin`, but the sidebar Libraries link references `/dashboard/admin/libraries`. The nav item uses `startsWith` matching — both will highlight. This is correct but the admin nav should have a sub-route to libraries directly accessible.
**Status:** ✅ Already working — no fix needed.

---

### 4. 🔄 Edge Function Deployment Verification (HIGH — Reliability)
**Gap:** The `admin-library` edge function is the only backend gate for all 5 library tables. If it fails silently, the entire admin panel is dead.
**Fix:** Add a health-check toast on the Admin Dashboard that pings the edge function on mount with a lightweight `list` call to verify connectivity.

---

### 5. 📱 Mobile Admin Experience (MEDIUM — UX)
**Gap:** The admin library tabs use a 5-column grid on mobile (`grid-cols-5`), which crushes the text. Tab labels are barely readable at 390px.
**Fix:** Switch to horizontal `ScrollArea` on mobile with `overflow-x-auto` instead of cramming 5 columns.

---

### 6. 🎨 Inspiration Showcase Graceful Empty State (LOW — Polish)
**Gap:** The `EmptyCampaigns` showcase section correctly hides when no library data exists. ✅ No fix needed.

---

### 7. 📋 Bulk Import — CSV Column Mismatch Protection (MEDIUM — Data Integrity)
**Gap:** The bulk import parses any CSV blindly — if column headers don't match the table schema, rows silently fail with cryptic Supabase errors.
**Fix:** Add a column validation step before import that checks parsed headers against expected fields and warns about mismatches.

---

## Implementation Order
1. **Admin role check in edge function** (security — must do first)
2. **Error boundary** (stability foundation)
3. **Mobile admin tabs** (UX polish)
4. **Bulk import validation** (data integrity for dataset loading)
5. **Edge function health check** (operational confidence)

Items 3, 5, 6 are already working or cosmetic — so the **real blockers are items 1, 2, and 7**.
