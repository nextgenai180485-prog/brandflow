

# Bi-Cameral Workspace: CSO War Room + CMO Tactical Rail

## Current State

The project already has:
- **GlobalCMOChat** — a floating chat widget (bottom-right bubble) that streams to the `cmo-chat` edge function. Currently labeled "CSO" in spirit but serves as a general-purpose chat.
- **CMOStrategyPanel** — a right-rail tactical panel used inside the Campaign Wizard (`NewCampaign.tsx`) that provides real-time contextual guidance as users select platforms/content types.
- **AppShell** — the global layout wrapper with a top navigation bar.

The proposal from the external architect is sound. The split-architecture aligns with what we partially have. The gap is that the two agents share the same backend and the UX doesn't enforce the role separation.

## What We Will Build

### 1. Rebrand & Clarify Agent Roles

| Agent | Role | Location | Interaction |
|-------|------|----------|-------------|
| **CMO** (Tactical Co-Pilot) | Context-aware cards, warnings, recommendations. Reacts to what user is doing NOW. | Right rail inside workspace pages (Campaign Wizard, Dashboard) | Push — auto-updates, no chat bubbles |
| **CSO** (Strategic Architect) | Deep conversational strategy. Knows full project history A-Z. Summonable War Room. | Global slide-over overlay (left or center) | Pull — user initiates conversation |

### 2. CSO War Room (Global Overlay)

**Replace the current floating bubble chat with a slide-over "War Room" panel:**

- **Trigger**: A glowing "Strategy" button in the AppShell header (desktop) or a floating pill (mobile)
- **Desktop**: Slide-over panel from the right, 480px wide, glassmorphic backdrop blur on the rest of the app
- **Mobile**: Full-height drawer (using existing `Drawer` component from vaul) instead of a floating panel
- **Keyboard shortcut**: `Cmd+K` / `Ctrl+K` to toggle
- **Content**: The existing streaming chat UI from `GlobalCMOChat`, rebranded as "Chief Strategy Officer"
- **Persistence**: Same `cmo_chat_messages` table, same `cmo-chat` edge function

### 3. CMO Tactical Rail Enhancement

**Upgrade `CMOStrategyPanel` to be a true "HUD" (Heads-Up Display):**

- Already lives in the right rail of the Campaign Wizard — keep it there
- Add it to the Dashboard as a collapsible right panel showing brand health + next-move cards
- Card-based UI (not chat bubbles) — status indicators, actionable buttons
- Reactive: responds to user selections in real-time (already partially implemented)

### 4. Responsive Mobile Strategy

- **Desktop (≥768px)**: AppShell header + Canvas center + optional CMO rail right. CSO slides from right as overlay.
- **Mobile (<768px)**: 
  - CMO rail hidden, replaced by a floating bottom pill showing alert count
  - Tapping pill opens a half-height Drawer with CMO cards
  - CSO trigger in mobile header opens full-screen Drawer chat

### 5. File Changes

| File | Change |
|------|--------|
| `src/components/GlobalCMOChat.tsx` | Refactor from floating bubble to slide-over overlay panel. Add glassmorphic backdrop. Add keyboard shortcut. Rebrand to "Chief Strategy Officer". Mobile: use Drawer. |
| `src/components/AppShell.tsx` | Add CSO trigger button in header (glowing icon). Add mobile CMO pill. |
| `src/components/CMOStrategyPanel.tsx` | Minor: ensure card-based UI (already is). No major changes needed. |
| `src/pages/Dashboard.tsx` | Optionally add a lightweight CMO status strip or "next move" card. |
| `src/index.css` or `tailwind.config.ts` | Add glassmorphism utility if needed (`backdrop-blur-xl`, `bg-white/90`). |

### 6. Technical Details

- **Shared backend**: Both agents use the same `cmo-chat` edge function. The system prompt already handles both tactical and strategic guidance. No backend changes needed.
- **Keyboard shortcut**: `useEffect` listener on `keydown` for `Cmd+K` / `Ctrl+K` in `GlobalCMOChat.tsx`.
- **Mobile detection**: Use existing `useIsMobile()` hook to switch between slide-over (desktop) and Drawer (mobile).
- **State management**: CSO open/close state managed in `GlobalCMOChat`. CMO pill state managed in `AppShell` or a new `CMOPill` component.
- **No new tables or edge functions** — purely a frontend UX refactor.

### 7. Build Order

1. Refactor `GlobalCMOChat` into the CSO slide-over overlay (desktop + mobile)
2. Update `AppShell` with the CSO trigger button and mobile CMO pill
3. Add keyboard shortcut (Cmd+K)
4. Polish glassmorphism, animations, responsive breakpoints

