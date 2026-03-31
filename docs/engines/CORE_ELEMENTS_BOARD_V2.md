# Core Elements Board V2 — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F6 Core Elements Board Pipeline  
> **Purpose**: Named slot schema, preview overlays, and partial regeneration via SeedEdit 3.0

---

## Overview

The original Core Elements Board relies on image upload ORDER (Image 1-4) to map inputs to board sections. This is fragile — wrong order = wrong output. V2 introduces named slots, visual preview overlays, and partial section regeneration.

---

## Named Slot Schema

### V1 (Current) — Order-Dependent

| Slot | Position | Content |
|------|----------|---------|
| Image 1 | First upload | Wireframe template |
| Image 2 | Second upload | Character photo |
| Image 3 | Third upload | Setting/environment photo |
| Image 4 | Fourth upload | Product photo |

**Problem**: If user uploads in wrong order, the board generates incorrectly.

### V2 (New) — Named Slots

```json
{
  "slots": {
    "wireframe": {
      "slot_id": "wireframe",
      "label": "Layout Template",
      "description": "The grid wireframe that defines board structure",
      "image_url": "https://storage.../wireframe.png",
      "required": true,
      "default": "system_default_9x16_grid"
    },
    "character": {
      "slot_id": "character",
      "label": "Character / Model",
      "description": "Person or model to feature in the board",
      "image_url": "https://storage.../character.jpg",
      "required": true,
      "default": null
    },
    "environment": {
      "slot_id": "environment",
      "label": "Setting / Environment",
      "description": "Location, backdrop, or setting photo",
      "image_url": "https://storage.../environment.jpg",
      "required": true,
      "default": null
    },
    "product": {
      "slot_id": "product",
      "label": "Product",
      "description": "Product photo for the product section",
      "image_url": "https://storage.../product.jpg",
      "required": true,
      "default": null
    }
  }
}
```

### UI Upload Experience

Each slot is a labeled drop zone with:
- Slot name and description visible
- Preview thumbnail after upload
- Drag-and-drop reordering NOT needed (slots are named, not ordered)
- Visual overlay showing where this slot's content appears on the board

---

## Preview Overlays

Before generation, show a preview overlay highlighting where each slot maps to on the wireframe:

```
┌─────────────────────────────────┐
│   CHARACTER (highlighted blue)  │
│  ┌──────────┐ ┌─────┐ ┌─────┐  │
│  │  Main     │ │Head │ │Head │  │
│  │  [slot:   │ │Front│ │Side │  │
│  │  character│ └─────┘ └─────┘  │
│  │  ]        │ ┌─────┐ ┌─────┐  │
│  │           │ │Pose │ │Pose │  │
│  └──────────┘ │  1   │ │  2  │  │
│               └─────┘ └─────┘  │
├─────────────────────────────────┤
│   SETTING (highlighted green)   │
│  ┌──────────┐ ┌─────┐          │
│  │  [slot:   │ │View │          │
│  │  environ- │ │  1  │          │
│  │  ment]    │ ├─────┤          │
│  │           │ │View │          │
│  └──────────┘ │  2  │          │
│               └─────┘          │
├─────────────────────────────────┤
│   PRODUCT (highlighted orange)  │
│  ┌──────────┐ ┌─────┐          │
│  │  [slot:   │ │View │          │
│  │  product] │ │  1  │          │
│  │           │ ├─────┤          │
│  │           │ │View │          │
│  └──────────┘ │  2  │          │
│               └─────┘          │
└─────────────────────────────────┘
```

Each section is color-coded to match its slot, showing the user exactly where their upload will appear.

---

## Partial Regeneration via SeedEdit 3.0

Instead of regenerating the entire board when one section is wrong, use SeedEdit 3.0 to selectively regenerate individual sections.

### Regeneration Modes

| Mode | What Changes | What's Preserved |
|------|-------------|-----------------|
| `character_only` | CHARACTER section re-composited | SETTING + PRODUCT sections unchanged |
| `product_only` | PRODUCT section re-composited | CHARACTER + SETTING sections unchanged |
| `environment_only` | SETTING section re-composited | CHARACTER + PRODUCT sections unchanged |
| `layout_only` | Wireframe structure changed | All content re-composited into new layout |

### SeedEdit 3.0 Integration

```text
1. User selects section to regenerate (e.g., "Regenerate Character")
2. Mask the CHARACTER region of the existing board image
3. SeedEdit 3.0 inpaints the masked region using:
   - New character photo (if user uploaded a replacement)
   - Original character photo with modified prompt (if user wants variation)
4. Output: Updated board with only the selected section changed
```

**Provider**: BytePlus ModelArk (SeedEdit 3.0) or WaveSpeed AI

**Cost**: ~$0.02-0.05 per partial regeneration (vs ~$0.10 for full board)

---

## Updated Pipeline Flow

```text
V1: Upload 4 images (ordered) → Generate board → Done
V2: Upload to named slots (any order) → Preview overlay → Generate board
      → Review → [Optional] Partial regeneration per section → Accept
```

---

## Key Design Notes

1. **Named slots eliminate ordering errors** — the #1 user frustration with V1
2. **Preview overlays reduce "surprise" factor** — users see placement before generation
3. **Partial regeneration saves time and cost** — 5x cheaper than full regeneration
4. **SeedEdit 3.0 masking** requires accurate section coordinates — derived from wireframe template metadata
5. **Default wireframe** — system provides a standard 9:16 grid; custom templates are a future feature
6. **The wireframe slot can auto-populate** from system defaults — user only needs to upload 3 images (character, environment, product)
