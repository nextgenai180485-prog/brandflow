

## Rebrand Design System to ElevenLabs-Inspired Palette

ElevenLabs uses a warm, minimal, premium aesthetic: off-white/cream background, near-black text, subtle gray borders, and dark primary buttons. This fits Brandflow's editorial, high-end positioning perfectly.

### Color Palette (ElevenLabs-inspired)

```text
Background:    #F8F5F1  (warm cream/off-white)
Foreground:    #1A1A1A  (near-black text)
Card:          #FFFFFF  (pure white cards on cream bg)
Primary:       #1A1A1A  (dark buttons, strong CTAs)
Primary-fg:    #FFFFFF  (white text on dark buttons)
Secondary:     #F0EDE8  (muted warm gray)
Secondary-fg:  #1A1A1A
Muted:         #E8E4DF  (subtle warm gray)
Muted-fg:      #6B6560  (warm medium gray)
Accent:        #F0EDE8
Border:        #E0DCD6  (warm subtle border)
Destructive:   #DC2626  (standard red)
```

### Changes

1. **`src/index.css`** — Update all CSS custom properties in `:root` to the new warm/cream palette. Update `.dark` theme to a complementary dark mode (deep warm black `#141210`, warm dark cards).

2. **`tailwind.config.ts`** — No structural changes needed (it already references CSS vars). Optionally add a custom font family entry for Inter (the font ElevenLabs uses).

3. **`src/App.css`** — Remove the default Vite boilerplate styles that won't be used.

### Technical Detail

All colors converted to HSL for the CSS custom properties:
- `#F8F5F1` → `30 33% 96%`
- `#1A1A1A` → `0 0% 10%`
- `#F0EDE8` → `30 20% 92%`
- `#E8E4DF` → `33 16% 89%`
- `#6B6560` → `28 5% 40%`
- `#E0DCD6` → `36 14% 86%`

