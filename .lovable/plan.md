## Creative Brief Builder + AI Copy Generator

### 1. Structured Brief Section (replaces plain textarea)

**Collapsible form fields:**
- **Objective** — dropdown: Awareness / Consideration / Conversion / Engagement
- **Message Angle** — short input: "What's the core message?" (e.g. "Our product saves 3 hours/week")
- **Tone** — chip selector: Professional, Playful, Urgent, Luxurious, Edgy, Warm, Bold
- **CTA Goal** — dropdown: Shop Now / Learn More / Sign Up / Book Demo / Download / Custom
- **Target Emotion** — chip selector: Trust, Excitement, FOMO, Curiosity, Aspiration, Relief

**Freeform override** — collapsible textarea: "Additional instructions for the AI" (power user escape hatch)

All structured fields get serialized into a `creativeBrief` object passed to the generation engine.

### 2. AI Copy Generator (new section below brief)

**"Generate Copy" button** — calls the `cmo-chat` or a new `generate-copy` edge function with:
- The structured brief fields
- Brand profile (voice, tone, audience)
- Selected reference context

**Returns editable fields:**
- **Headline** — large input
- **Subheadline** — medium input  
- **CTA Text** — small input
- **Body Copy** — textarea (optional, for carousel/post captions)

User can edit any field before proceeding. A "Regenerate" button re-runs the AI.

### Files

1. **New: `src/components/campaign/CreativeBriefBuilder.tsx`** — structured brief form + AI copy section
2. **Edit: `src/pages/NewCampaign.tsx`** — replace plain textarea with `CreativeBriefBuilder`, wire state
3. **Edit: `supabase/functions/generate-content/index.ts`** — accept structured brief + copy fields in payload

### State Shape
```ts
interface CreativeBrief {
  objective: 'awareness' | 'consideration' | 'conversion' | 'engagement';
  messageAngle: string;
  tone: string[];
  ctaGoal: string;
  targetEmotion: string[];
  freeformNotes: string;
}

interface CampaignCopy {
  headline: string;
  subheadline: string;
  ctaText: string;
  bodyCopy: string;
}
```
