export type CampaignStatus = 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'published';
export type AssetType = 'image' | 'video' | 'copy' | 'carousel';
export type AssetStatus = 'pending_review' | 'approved' | 'rejected' | 'regenerating';

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'linkedin' | 'x' | 'snapchat';
export type SocialFormat = 'post' | 'story' | 'reel' | 'carousel';
export type ContentType = 'image' | 'ugc_video' | 'pro_video';

export interface SocialMeta {
  platform: SocialPlatform;
  format: SocialFormat;
  aspectRatio: string;
  label: string;
  width: number;
  height: number;
}

export interface Campaign {
  id: string;
  profile_id: string;
  title: string;
  status: CampaignStatus;
  instructions: string | null;
  scheduled_at: string | null;
  publish_platforms: string[];
  created_at: string;
  updated_at: string;
}

export interface GeneratedAsset {
  id: string;
  campaign_id: string;
  profile_id: string;
  asset_type: AssetType;
  content_url: string | null;
  content_text: string | null;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
  platform?: SocialPlatform;
  format?: SocialFormat;
  rationale?: string | null;
  provider?: string | null;
  generation_cost?: number | null;
  generation_time_ms?: number | null;
  research_id?: string | null;
}

export interface BrandProfile {
  summary: string;
  brand_voice_detected: string;
  visual_style: string;
  target_audience_detected: string;
  competitors: { name: string; strength?: string }[];
  key_themes: string[];
  color_palette_suggestion?: { primary: string; secondary: string; accent: string } | null;
  content_pillars?: string[];
}

// Complete social format matrix with native dimensions
export const SOCIAL_FORMATS: SocialMeta[] = [
  // Instagram
  { platform: 'instagram', format: 'post', aspectRatio: '4/5', label: 'Instagram Post', width: 1080, height: 1350 },
  { platform: 'instagram', format: 'story', aspectRatio: '9/16', label: 'Instagram Story', width: 1080, height: 1920 },
  { platform: 'instagram', format: 'reel', aspectRatio: '9/16', label: 'Instagram Reel', width: 1080, height: 1920 },
  { platform: 'instagram', format: 'carousel', aspectRatio: '1/1', label: 'Instagram Carousel', width: 1080, height: 1080 },
  // TikTok
  { platform: 'tiktok', format: 'reel', aspectRatio: '9/16', label: 'TikTok Video', width: 1080, height: 1920 },
  // Facebook
  { platform: 'facebook', format: 'post', aspectRatio: '1/1', label: 'Facebook Post', width: 1200, height: 1200 },
  { platform: 'facebook', format: 'story', aspectRatio: '9/16', label: 'Facebook Story', width: 1080, height: 1920 },
  // LinkedIn
  { platform: 'linkedin', format: 'post', aspectRatio: '1/1', label: 'LinkedIn Post', width: 1200, height: 1200 },
  { platform: 'linkedin', format: 'carousel', aspectRatio: '4/5', label: 'LinkedIn Carousel', width: 1080, height: 1350 },
  // X (Twitter)
  { platform: 'x', format: 'post', aspectRatio: '16/9', label: 'X Post', width: 1200, height: 675 },
  // Snapchat
  { platform: 'snapchat', format: 'story', aspectRatio: '9/16', label: 'Snapchat Story', width: 1080, height: 1920 },
  // YouTube
  { platform: 'youtube', format: 'post', aspectRatio: '16/9', label: 'YouTube Thumbnail', width: 1280, height: 720 },
];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  snapchat: 'Snapchat',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; description: string }> = {
  image: { label: 'Image', description: 'High-fidelity static visuals' },
  ugc_video: { label: 'UGC Video', description: 'Authentic, raw-style video content' },
  pro_video: { label: 'Pro Video', description: 'Polished, high-production video' },
};
