export type CampaignStatus = 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'published';
export type AssetType = 'image' | 'video' | 'copy';
export type AssetStatus = 'pending_review' | 'approved' | 'rejected' | 'regenerating';

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
}
