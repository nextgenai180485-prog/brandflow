export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_reference_library: {
        Row: {
          compatible_families: string[]
          created_at: string
          description: string | null
          id: string
          industry_tags: string[] | null
          is_active: boolean
          media_type: string
          media_url: string | null
          mood_tags: string[] | null
          performance_notes: string | null
          platform_tags: string[] | null
          sealcam_analysis: Json
          thumbnail_url: string | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          compatible_families?: string[]
          created_at?: string
          description?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          mood_tags?: string[] | null
          performance_notes?: string | null
          platform_tags?: string[] | null
          sealcam_analysis?: Json
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          compatible_families?: string[]
          created_at?: string
          description?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          mood_tags?: string[] | null
          performance_notes?: string | null
          platform_tags?: string[] | null
          sealcam_analysis?: Json
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      asset_memory: {
        Row: {
          asset_id: string | null
          confidence: number
          created_at: string
          frequency: number
          id: string
          memory_type: string
          pattern_key: string
          pattern_value: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          confidence?: number
          created_at?: string
          frequency?: number
          id?: string
          memory_type?: string
          pattern_key: string
          pattern_value: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          confidence?: number
          created_at?: string
          frequency?: number
          id?: string
          memory_type?: string
          pattern_key?: string
          pattern_value?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_assets: {
        Row: {
          asset_type: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          profile_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          profile_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      brand_memory: {
        Row: {
          context: Json
          created_at: string
          frequency: number
          id: string
          last_seen_at: string
          memory_type: string
          pattern_category: string
          pattern_value: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          memory_type?: string
          pattern_category: string
          pattern_value: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          memory_type?: string
          pattern_category?: string
          pattern_value?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_strategy: {
        Row: {
          core_identity: Json
          core_value: string | null
          created_at: string
          current_focus: string
          enemy: string | null
          funnel_stages: Json
          id: string
          interview_completed: boolean
          launch_readiness: number
          launch_roadmap: Json
          mode: string
          persona_card: Json
          profile_id: string
          secret_weapon: string | null
          strategy_generated: boolean
          updated_at: string
        }
        Insert: {
          core_identity?: Json
          core_value?: string | null
          created_at?: string
          current_focus?: string
          enemy?: string | null
          funnel_stages?: Json
          id?: string
          interview_completed?: boolean
          launch_readiness?: number
          launch_roadmap?: Json
          mode?: string
          persona_card?: Json
          profile_id: string
          secret_weapon?: string | null
          strategy_generated?: boolean
          updated_at?: string
        }
        Update: {
          core_identity?: Json
          core_value?: string | null
          created_at?: string
          current_focus?: string
          enemy?: string | null
          funnel_stages?: Json
          id?: string
          interview_completed?: boolean
          launch_readiness?: number
          launch_roadmap?: Json
          mode?: string
          persona_card?: Json
          profile_id?: string
          secret_weapon?: string | null
          strategy_generated?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      campaign_assets: {
        Row: {
          asset_role: string
          brand_asset_id: string
          campaign_id: string
          created_at: string
          id: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          asset_role?: string
          brand_asset_id: string
          campaign_id: string
          created_at?: string
          id?: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          asset_role?: string
          brand_asset_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_brand_asset_id_fkey"
            columns: ["brand_asset_id"]
            isOneToOne: false
            referencedRelation: "brand_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_research: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          intelligence_brief: Json | null
          profile_id: string
          provider: string
          query: string
          research_type: string
          results: Json | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          intelligence_brief?: Json | null
          profile_id: string
          provider?: string
          query: string
          research_type?: string
          results?: Json | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          intelligence_brief?: Json | null
          profile_id?: string
          provider?: string
          query?: string
          research_type?: string
          results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_research_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          profile_id: string
          publish_platforms: string[] | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          profile_id: string
          publish_platforms?: string[] | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          profile_id?: string
          publish_platforms?: string[] | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_library: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          compatible_families: string[]
          created_at: string
          description: string | null
          ethnicity_tags: string[] | null
          gender: string | null
          id: string
          industry_tags: string[] | null
          is_active: boolean
          mood_tags: string[] | null
          name: string
          persona_traits: Json
          updated_at: string
          usage_count: number
          voice_style: string | null
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          compatible_families?: string[]
          created_at?: string
          description?: string | null
          ethnicity_tags?: string[] | null
          gender?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean
          mood_tags?: string[] | null
          name: string
          persona_traits?: Json
          updated_at?: string
          usage_count?: number
          voice_style?: string | null
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          compatible_families?: string[]
          created_at?: string
          description?: string | null
          ethnicity_tags?: string[] | null
          gender?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean
          mood_tags?: string[] | null
          name?: string
          persona_traits?: Json
          updated_at?: string
          usage_count?: number
          voice_style?: string | null
        }
        Relationships: []
      }
      cmo_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          profile_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          profile_id: string
          role?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
          role?: string
        }
        Relationships: []
      }
      creative_history: {
        Row: {
          campaign_id: string
          created_at: string
          direction_output: Json
          family: string
          generation_params: Json
          id: string
          profile_id: string
          result_status: string
          sealcam_scenes: Json
          updated_at: string
          user_feedback: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          direction_output?: Json
          family: string
          generation_params?: Json
          id?: string
          profile_id: string
          result_status?: string
          sealcam_scenes?: Json
          updated_at?: string
          user_feedback?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          direction_output?: Json
          family?: string
          generation_params?: Json
          id?: string
          profile_id?: string
          result_status?: string
          sealcam_scenes?: Json
          updated_at?: string
          user_feedback?: string | null
        }
        Relationships: []
      }
      decision_traces: {
        Row: {
          asset_id: string | null
          assumptions: Json
          brand_memory_influences: Json
          campaign_id: string
          confidence_score: number
          created_at: string
          creative_directions: Json
          decision_summary: string
          id: string
          next_test_recommendation: Json | null
          profile_id: string
          rejected_alternatives: Json
          research_id: string | null
          research_sources: Json
          scoring_criteria: Json
          winner: Json
        }
        Insert: {
          asset_id?: string | null
          assumptions?: Json
          brand_memory_influences?: Json
          campaign_id: string
          confidence_score?: number
          created_at?: string
          creative_directions?: Json
          decision_summary: string
          id?: string
          next_test_recommendation?: Json | null
          profile_id: string
          rejected_alternatives?: Json
          research_id?: string | null
          research_sources?: Json
          scoring_criteria?: Json
          winner?: Json
        }
        Update: {
          asset_id?: string | null
          assumptions?: Json
          brand_memory_influences?: Json
          campaign_id?: string
          confidence_score?: number
          created_at?: string
          creative_directions?: Json
          decision_summary?: string
          id?: string
          next_test_recommendation?: Json | null
          profile_id?: string
          rejected_alternatives?: Json
          research_id?: string | null
          research_sources?: Json
          scoring_criteria?: Json
          winner?: Json
        }
        Relationships: []
      }
      generated_assets: {
        Row: {
          asset_type: string
          campaign_id: string
          content_text: string | null
          content_url: string | null
          created_at: string
          format: string | null
          generation_cost: number | null
          generation_time_ms: number | null
          id: string
          platform: string | null
          profile_id: string
          provider: string | null
          rationale: string | null
          research_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          campaign_id: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          format?: string | null
          generation_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          platform?: string | null
          profile_id: string
          provider?: string | null
          rationale?: string | null
          research_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          campaign_id?: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          format?: string | null
          generation_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          platform?: string | null
          profile_id?: string
          provider?: string | null
          rationale?: string | null
          research_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_assets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_assets_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "campaign_research"
            referencedColumns: ["id"]
          },
        ]
      }
      hooks: {
        Row: {
          created_at: string
          effectiveness_score: number
          family: string | null
          hook_text: string
          hook_type: string
          id: string
          platform: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          effectiveness_score?: number
          family?: string | null
          hook_text: string
          hook_type?: string
          id?: string
          platform?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          effectiveness_score?: number
          family?: string | null
          hook_text?: string
          hook_type?: string
          id?: string
          platform?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      image_templates: {
        Row: {
          created_at: string
          format: string | null
          id: string
          is_active: boolean
          negative_prompt: string
          platform: string | null
          prompt_modifiers: string[]
          quality_tier: string
          style_guide: Json
          style_name: string
          tags: string[] | null
          updated_at: string
          usage_count: number
          vertical: string
        }
        Insert: {
          created_at?: string
          format?: string | null
          id?: string
          is_active?: boolean
          negative_prompt?: string
          platform?: string | null
          prompt_modifiers?: string[]
          quality_tier?: string
          style_guide?: Json
          style_name: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number
          vertical?: string
        }
        Update: {
          created_at?: string
          format?: string | null
          id?: string
          is_active?: boolean
          negative_prompt?: string
          platform?: string | null
          prompt_modifiers?: string[]
          quality_tier?: string
          style_guide?: Json
          style_name?: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number
          vertical?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blotato_api_key: string | null
          brand_colors: Json | null
          brand_palette: Json | null
          brand_voice_keywords: string[] | null
          brand_voice_tone: string | null
          business_name: string | null
          created_at: string
          first_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          onboarding_completed: boolean
          onboarding_step: number
          target_audience: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          blotato_api_key?: string | null
          brand_colors?: Json | null
          brand_palette?: Json | null
          brand_voice_keywords?: string[] | null
          brand_voice_tone?: string | null
          business_name?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          blotato_api_key?: string | null
          brand_colors?: Json | null
          brand_palette?: Json | null
          brand_voice_keywords?: string[] | null
          brand_voice_tone?: string | null
          business_name?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      publish_records: {
        Row: {
          asset_id: string
          blotato_post_submission_id: string | null
          campaign_id: string | null
          caption: string | null
          created_at: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          platform: string
          platform_post_url: string | null
          profile_id: string
          published_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          social_account_id: string | null
          status: string | null
        }
        Insert: {
          asset_id: string
          blotato_post_submission_id?: string | null
          campaign_id?: string | null
          caption?: string | null
          created_at?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          platform: string
          platform_post_url?: string | null
          profile_id: string
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          social_account_id?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string
          blotato_post_submission_id?: string | null
          campaign_id?: string | null
          caption?: string | null
          created_at?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          platform?: string
          platform_post_url?: string | null
          profile_id?: string
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          social_account_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_records_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          auto_publish: boolean | null
          avatar_url: string | null
          blotato_account_id: string
          created_at: string | null
          display_name: string | null
          id: string
          platform: string
          profile_id: string
          status: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          auto_publish?: boolean | null
          avatar_url?: string | null
          blotato_account_id: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          platform: string
          profile_id: string
          status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          auto_publish?: boolean | null
          avatar_url?: string | null
          blotato_account_id?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          platform?: string
          profile_id?: string
          status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      video_templates: {
        Row: {
          aspect_ratio: string
          created_at: string
          duration_s: number
          example_url: string | null
          family: string
          hook_type: string | null
          id: string
          is_active: boolean
          mood: string | null
          sealcam_analysis: Json
          tags: string[] | null
          template_name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          duration_s?: number
          example_url?: string | null
          family: string
          hook_type?: string | null
          id?: string
          is_active?: boolean
          mood?: string | null
          sealcam_analysis?: Json
          tags?: string[] | null
          template_name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          duration_s?: number
          example_url?: string | null
          family?: string
          hook_type?: string | null
          id?: string
          is_active?: boolean
          mood?: string | null
          sealcam_analysis?: Json
          tags?: string[] | null
          template_name?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
