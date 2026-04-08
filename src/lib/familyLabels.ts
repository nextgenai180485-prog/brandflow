/** Maps internal engine codes to user-friendly display names */
export const FAMILY_LABELS: Record<string, string> = {
  F1_UGC: "UGC Video Ad",
  F2_SPOKESPERSON: "AI Spokesperson",
  F3_PRODUCT_VIDEO: "Product Video",
  F4_SOCIAL_CONTENT: "Social Content",
  F5_CINEMATIC: "Cinematic Ad",
  F6_CORE_ELEMENTS: "Core Elements",
  F7_AD_CREATOR: "Ad Creator",
  F8_CREATIVE_CLONER: "Creative Cloner",
  F9_IMAGE_TEMPLATE: "Image Template",
};

/** Returns user-friendly label or the raw code if unknown */
export const getFamilyLabel = (code: string): string =>
  FAMILY_LABELS[code] || code;
