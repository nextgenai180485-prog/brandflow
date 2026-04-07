

# Social Publishing Engine via Blotato API

## What We're Building

A complete social publishing pipeline that lets users publish approved assets from the Content Command Center directly to Instagram, TikTok, Facebook, LinkedIn, X, YouTube, and more — powered by Blotato's REST API.

## Architecture

```text
Calendar (Content Command Center)
  └── "Publish" button on approved asset cards
        └── Publish Modal (platform picker + schedule options)
              └── Edge Function: social-publish
                    └── Blotato REST API (https://backend.blotato.com/v2)
                          ├── GET /users/me/accounts (list connected socials)
                          ├── POST /posts (publish/schedule)
                          ├── GET /posts/:id (poll status)
                          └── POST /media/uploads (presigned upload for local files)
```

## Build Steps

### Step 1: Secret + Database

- Add `BLOTATO_API_KEY` secret
- Create two tables via migration:
  - `social_accounts` — caches Blotato account data (account_id, platform, username, avatar, brand mapping)
  - `publish_records` — tracks each publish attempt (asset_id, platform, status, blotato_post_id, scheduled_at, published_at, error_message)
- RLS: scoped to `profile_id = auth.uid()`

### Step 2: Edge Function `social-publish`

Single edge function with action-based routing:

| Action | What It Does |
|--------|-------------|
| `list-accounts` | Calls `GET /users/me/accounts` on Blotato, returns connected platforms |
| `sync-accounts` | Fetches Blotato accounts and upserts into `social_accounts` table |
| `publish` | Calls `POST /posts` with asset media URL, caption, platform-specific target fields; creates `publish_records` entry |
| `schedule` | Same as publish but with `scheduledTime` field at root level |
| `check-status` | Polls `GET /posts/:postSubmissionId`, updates `publish_records` status |

Auth: JWT validation in code (existing pattern). Blotato auth: `blotato-api-key` header.

### Step 3: Social Settings UI

New section in Settings (or standalone `/settings/social`):
- Input for Blotato API key (stored via secrets, passed to edge function)
- "Sync Accounts" button that calls the edge function
- Display connected platforms as cards with avatar, username, platform badge
- Toggle auto-publish per account

### Step 4: Calendar Publish Flow

Enhance the Content Command Center (`CalendarView.tsx`):
- Add "Publish" button on asset cards with status `approved`
- Publish Modal:
  - Platform selector (shows only synced accounts from `social_accounts`)
  - Platform-specific fields (TikTok privacy, Facebook page, YouTube title)
  - Caption editor (pre-filled from `content_text`)
  - Schedule picker: "Now" / "Pick time" / "Next free slot"
- On submit: calls `social-publish` edge function
- Asset status updates to `published` or `scheduled` in real-time

### Step 5: Queue Status Tracking

- Enhance Queue tab to show `publish_records` data
- Real-time status: queued → publishing → published / failed
- Retry button for failed publishes
- Link to live post URL when published

## Technical Details

- **Blotato Base URL**: `https://backend.blotato.com/v2`
- **Auth Header**: `blotato-api-key: YOUR_API_KEY`
- **Media**: Our assets are in public Supabase storage buckets — pass URLs directly to `mediaUrls` (no upload step needed)
- **Async flow**: `POST /posts` returns `postSubmissionId`, poll with `GET /posts/:id` until `published` or `failed`
- **Platform targets**: Each platform has specific required fields (e.g., TikTok needs `privacyLevel`, Facebook needs `pageId`)
- **Rate limits**: 30 POST/min, 60 GET/min — well within our volume

## Database Schema

```sql
-- social_accounts: cached Blotato account data
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  blotato_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  auto_publish BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, blotato_account_id)
);

-- publish_records: tracks every publish attempt
CREATE TABLE publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  campaign_id UUID,
  social_account_id UUID REFERENCES social_accounts(id),
  platform TEXT NOT NULL,
  blotato_post_submission_id TEXT,
  status TEXT DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## What the User Needs To Do

1. Sign up for Blotato Business plan ($29/mo for 20 accounts)
2. Connect social accounts in Blotato's dashboard
3. Generate API key in Blotato Settings > API
4. Paste API key into Brandflow's Social Settings page

