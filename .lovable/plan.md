
# Per-User Social Publishing Connection

## What Changes

Each user manages their own social channels by entering their personal Blotato API key. No shared keys, no founder management.

## User Flow

1. User goes to `/dashboard/social-settings`
2. Enters their Blotato API key (with clear instructions on where to get it)
3. Clicks "Sync Accounts" — pulls their connected socials from Blotato
4. Publishes directly to their own channels from the Content Command Center

## Technical Changes

### 1. Add `blotato_api_key` column to `profiles` table
- Encrypted text field on the existing `profiles` table
- Each user stores their own key
- RLS already scoped to `auth.uid() = id`

### 2. Update `social-publish` edge function
- Instead of reading `BLOTATO_API_KEY` from env, read the user's key from their profile row
- Falls back to env var for admin/founder use
- Returns clear error if user hasn't set their key yet

### 3. Update Social Settings UI
- Add API key input field with save button at the top
- Show setup instructions with link to Blotato dashboard
- "Sync Accounts" only works after key is saved
- Key is masked after saving (show last 4 chars only)

### 4. Remove server-level dependency
- The server `BLOTATO_API_KEY` secret becomes optional (fallback only)
- Each user is fully independent
