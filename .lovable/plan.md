

# Add Preview Thumbnails to Image Templates + Generate Previews for All 10 Existing Templates

## What This Does
Adds a `preview_url` column to the `image_templates` table and a file upload field in the admin form, so every image template has a visual thumbnail users can browse. Then generates 10 realistic preview images (one per existing template) using the Gemini image engine, uploads them to the `library-assets` bucket, and updates each row.

## Current State
- 10 image templates exist (Clean Product Hero, Lifestyle Product Integration, Dark Luxury Showcase, etc.)
- Each has a `style_guide` JSON describing mood, lighting, composition, background — but no visual preview
- The admin form for `image_templates` has no file upload field
- The library browser shows templates as text-only rows

## Plan

### Step 1 — Database Migration
Add `preview_url TEXT` column to `image_templates` table.

### Step 2 — Admin Form Update (`AdminLibraryForm.tsx`)
Add a `{ key: "preview_url", label: "Preview Thumbnail", type: "file", folder: "image-templates" }` entry to the `image_templates` field config — right after `style_name`.

### Step 3 — Admin Table Update (`AdminLibraryTable.tsx`)
Show the preview thumbnail inline in the image_templates table rows — a small 32x32 rounded image next to the style name.

### Step 4 — Library Picker Update (`AssetLibraryPicker.tsx`)
When rendering image template items in the content library modal, display the `preview_url` thumbnail so users can visually browse styles.

### Step 5 — Generate 10 Preview Images via Edge Function
Create a one-time script in an edge function (`seededit` or a temporary invocation) that:
1. For each of the 10 templates, uses their `style_guide` (mood, lighting, composition, background) to build a prompt
2. Calls the Lovable AI Gateway (Gemini 2.5 Flash Image) to generate a realistic preview
3. Uploads the resulting image to `library-assets/image-templates/`
4. Updates the `preview_url` column for each template

Each prompt will incorporate the template's exact style_guide values (e.g., "soft studio three-point lighting, centered product hero composition, clean white background") combined with the photorealism anchors (Nikon Z8, organic textures, cinematic film grain) to produce world-class preview thumbnails.

## Technical Details

**Migration SQL:**
```sql
ALTER TABLE image_templates ADD COLUMN preview_url TEXT;
```

**Preview generation prompt pattern:**
```
Professional {vertical} photography preview. {style_guide.composition}, 
{style_guide.lighting}, {style_guide.background}. {style_guide.color_treatment}. 
Shot on Nikon Z8 45.7MP, 85mm f/1.8. Organic skin tones, subtle cinematic 
film grain. No AI artifacts, no stylization. Format: {format}.
```

**Files Changed:**
- `image_templates` table — add `preview_url` column
- `src/components/admin/AdminLibraryForm.tsx` — add file upload field for preview
- `src/components/admin/AdminLibraryTable.tsx` — show thumbnail in rows
- `src/components/AssetLibraryPicker.tsx` — show thumbnail in library modal
- `supabase/functions/generate-content/index.ts` — add a helper or use a one-time script to generate the 10 previews

