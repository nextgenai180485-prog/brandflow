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
      profiles: {
        Row: {
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
