export type CampaignStatus = 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'published';
export type AssetType = 'image' | 'video' | 'copy';
export type AssetStatus = 'pending_review' | 'approved' | 'rejected' | 'regenerating';

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube';
export type SocialFormat = 'post' | 'story' | 'reel' | 'carousel';

export interface SocialMeta {
  platform: SocialPlatform;
  format: SocialFormat;
  aspectRatio: string; // e.g. "1/1", "4/5", "9/16"
  label: string; // e.g. "Instagram Post"
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
  // Extended meta stored in content_text as JSON prefix or derived client-side
  platform?: SocialPlatform;
  format?: SocialFormat;
}

// Social format definitions for generation
export const SOCIAL_FORMATS: SocialMeta[] = [
  { platform: 'instagram', format: 'post', aspectRatio: '4/5', label: 'Instagram Post' },
  { platform: 'instagram', format: 'story', aspectRatio: '9/16', label: 'Instagram Story' },
  { platform: 'instagram', format: 'reel', aspectRatio: '9/16', label: 'Instagram Reel' },
  { platform: 'tiktok', format: 'reel', aspectRatio: '9/16', label: 'TikTok Video' },
  { platform: 'facebook', format: 'post', aspectRatio: '1/1', label: 'Facebook Post' },
  { platform: 'facebook', format: 'story', aspectRatio: '9/16', label: 'Facebook Story' },
];
