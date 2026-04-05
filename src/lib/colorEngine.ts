/**
 * Enterprise Color Engine — Seed-to-Token via OKLCH
 *
 * Converts a brand hex seed into a perceptually uniform 10-step
 * color scale with high-chroma "bright" variants for generation mixing.
 */

// ── Hex ↔ sRGB ──────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ── sRGB ↔ Linear RGB ───────────────────────────────────────

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, s * 255));
}

// ── Linear RGB → OKLab ──────────────────────────────────────

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// ── OKLab → Linear RGB ──────────────────────────────────────

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// ── OKLab ↔ OKLCH ───────────────────────────────────────────

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

// ── Gamut clamping (reduce chroma until in sRGB) ────────────

function clampToGamut(L: number, C: number, H: number): [number, number, number] {
  let lo = 0;
  let hi = C;
  let bestC = 0;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const [labL, labA, labB] = oklchToOklab(L, mid, H);
    const [r, g, b] = oklabToLinearRgb(labL, labA, labB);
    if (r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && b >= -0.001 && b <= 1.001) {
      bestC = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return [L, bestC, H];
}

// ── Public: Hex → OKLCH ─────────────────────────────────────

export interface OklchColor {
  L: number; // 0-1
  C: number; // 0-0.4+
  H: number; // 0-360
}

export function hexToOklch(hex: string): OklchColor {
  const [r, g, b] = hexToRgb(hex);
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [labL, labA, labB] = linearRgbToOklab(lr, lg, lb);
  const [L, C, H] = oklabToOklch(labL, labA, labB);
  return { L, C, H };
}

export function oklchToHex(L: number, C: number, H: number): string {
  const [cL, cC, cH] = clampToGamut(L, C, H);
  const [labL, labA, labB] = oklchToOklab(cL, cC, cH);
  const [lr, lg, lb] = oklabToLinearRgb(labL, labA, labB);
  return rgbToHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb));
}

// ── Scale Step Definition ───────────────────────────────────

export interface ColorScaleStep {
  step: number;       // 100-1000
  hex: string;
  oklch: OklchColor;
  role: string;       // semantic role
  cssVar: string;     // e.g. --brand-100
}

// Step lightness targets (100=lightest, 1000=darkest)
const STEP_LIGHTNESS: Record<number, number> = {
  100: 0.97,
  200: 0.90,
  300: 0.80,
  400: 0.70,
  500: 0.60,
  600: 0.50,
  700: 0.40,
  800: 0.30,
  900: 0.22,
  1000: 0.15,
};

// High-chroma boost factor for vibrant steps
const CHROMA_BOOST: Record<number, number> = {
  100: 0.3,
  200: 0.5,
  300: 1.4,  // Vibrant mixer
  400: 1.5,  // Vibrant mixer (peak)
  500: 1.3,  // Vibrant
  600: 1.0,  // Primary active
  700: 0.9,
  800: 0.7,
  900: 0.5,
  1000: 0.3,
};

const STEP_ROLES: Record<number, string> = {
  100: "subtle-accent",
  200: "soft",
  300: "vibrant-mixer",
  400: "vibrant-mixer-peak",
  500: "vibrant",
  600: "primary-active",
  700: "deep",
  800: "deeper",
  900: "text",
  1000: "darkest",
};

// ── Core: Generate Brand Scale ──────────────────────────────

export interface BrandColorScale {
  seed: string;
  seedOklch: OklchColor;
  normalizedOklch: OklchColor;
  steps: ColorScaleStep[];
  tokens: BrandTokens;
}

export interface BrandTokens {
  "--brand-vibrant": string;
  "--brand-soft": string;
  "--brand-text": string;
  "--brand-active": string;
  "--brand-subtle": string;
  "--brand-deep": string;
  [key: string]: string;
}

export function generateBrandScale(seedHex: string): BrandColorScale {
  const seedOklch = hexToOklch(seedHex);

  // Phase 1: Normalize — if too light or dark, anchor at L=0.6
  const normalizedL =
    seedOklch.L > 0.9 ? 0.6 : seedOklch.L < 0.2 ? 0.6 : seedOklch.L;
  const normalizedOklch: OklchColor = {
    L: normalizedL,
    C: seedOklch.C,
    H: seedOklch.H,
  };

  // Phase 2: Generate 10-step scale
  // Find max chroma for this hue at the seed's lightness
  const baseChroma = Math.max(seedOklch.C, 0.08);

  const steps: ColorScaleStep[] = [];
  for (const stepNum of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
    const targetL = STEP_LIGHTNESS[stepNum];
    const boost = CHROMA_BOOST[stepNum];
    const targetC = baseChroma * boost;
    const hex = oklchToHex(targetL, targetC, seedOklch.H);
    steps.push({
      step: stepNum,
      hex,
      oklch: { L: targetL, C: targetC, H: seedOklch.H },
      role: STEP_ROLES[stepNum],
      cssVar: `--brand-${stepNum}`,
    });
  }

  // Phase 3 & 4: Map semantic tokens
  const findStep = (n: number) => steps.find((s) => s.step === n)!.hex;
  const tokens: BrandTokens = {
    "--brand-vibrant": findStep(400),
    "--brand-soft": findStep(200),
    "--brand-text": findStep(900),
    "--brand-active": findStep(600),
    "--brand-subtle": findStep(100),
    "--brand-deep": findStep(800),
  };

  // Also add all step tokens
  for (const s of steps) {
    tokens[s.cssVar] = s.hex;
  }

  return {
    seed: seedHex,
    seedOklch,
    normalizedOklch,
    steps,
    tokens,
  };
}

// ── Inject tokens into document ─────────────────────────────

export function injectBrandTokens(tokens: BrandTokens): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

// ── Generate full palette from brand colors object ──────────

export interface BrandPalette {
  primary: BrandColorScale;
  secondary: BrandColorScale;
  accent: BrandColorScale;
}

export function generateFullBrandPalette(colors: {
  primary: string;
  secondary: string;
  accent: string;
}): BrandPalette {
  return {
    primary: generateBrandScale(colors.primary),
    secondary: generateBrandScale(colors.secondary),
    accent: generateBrandScale(colors.accent),
  };
}

export function injectFullBrandPalette(palette: BrandPalette): void {
  const root = document.documentElement;

  // Inject primary tokens with prefix
  for (const s of palette.primary.steps) {
    root.style.setProperty(`--brand-primary-${s.step}`, s.hex);
  }
  root.style.setProperty("--brand-vibrant", palette.primary.tokens["--brand-vibrant"]);
  root.style.setProperty("--brand-soft", palette.primary.tokens["--brand-soft"]);
  root.style.setProperty("--brand-text", palette.primary.tokens["--brand-text"]);
  root.style.setProperty("--brand-active", palette.primary.tokens["--brand-active"]);
  root.style.setProperty("--brand-subtle", palette.primary.tokens["--brand-subtle"]);

  // Inject secondary tokens
  for (const s of palette.secondary.steps) {
    root.style.setProperty(`--brand-secondary-${s.step}`, s.hex);
  }

  // Inject accent tokens
  for (const s of palette.accent.steps) {
    root.style.setProperty(`--brand-accent-${s.step}`, s.hex);
  }
}
