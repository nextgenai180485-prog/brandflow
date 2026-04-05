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
      approval_decisions: {
        Row: {
          approval_id: string
          approver_user_id: string | null
          artifact_scope_json: Json
          comment: string | null
          created_at: string
          decision: string
          id: string
          role: string
        }
        Insert: {
          approval_id: string
          approver_user_id?: string | null
          artifact_scope_json?: Json
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          role: string
        }
        Update: {
          approval_id?: string
          approver_user_id?: string | null
          artifact_scope_json?: Json
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_packet_artifact_id: string | null
          approval_type: string
          created_at: string
          current_step: number
          id: string
          job_id: string
          request_id: string
          required_roles_json: Json
          status: string
          updated_at: string
        }
        Insert: {
          approval_packet_artifact_id?: string | null
          approval_type: string
          created_at?: string
          current_step?: number
          id?: string
          job_id: string
          request_id: string
          required_roles_json?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          approval_packet_artifact_id?: string | null
          approval_type?: string
          created_at?: string
          current_step?: number
          id?: string
          job_id?: string
          request_id?: string
          required_roles_json?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approval_packet_artifact_id_fkey"
            columns: ["approval_packet_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          approved: boolean
          artifact_type: string
          created_at: string
          external_url: string | null
          id: string
          job_id: string | null
          metadata_json: Json
          request_id: string
          scene_id: string | null
          stage_type: string
          storage_path: string | null
          supersedes_artifact_id: string | null
          value_text: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          approved?: boolean
          artifact_type: string
          created_at?: string
          external_url?: string | null
          id?: string
          job_id?: string | null
          metadata_json?: Json
          request_id: string
          scene_id?: string | null
          stage_type: string
          storage_path?: string | null
          supersedes_artifact_id?: string | null
          value_text?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          approved?: boolean
          artifact_type?: string
          created_at?: string
          external_url?: string | null
          id?: string
          job_id?: string | null
          metadata_json?: Json
          request_id?: string
          scene_id?: string | null
          stage_type?: string
          storage_path?: string | null
          supersedes_artifact_id?: string | null
          value_text?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_supersedes_artifact_id_fkey"
            columns: ["supersedes_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          approval_status: string
          asset_type: string
          brand_id: string | null
          campaign_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_size_bytes: number | null
          id: string
          metadata_json: Json
          mime_type: string | null
          name: string
          rights_status: string
          source_url: string | null
          storage_path: string | null
          updated_at: string
          usage_scope: string
          workspace_id: string
        }
        Insert: {
          approval_status?: string
          asset_type: string
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata_json?: Json
          mime_type?: string | null
          name: string
          rights_status?: string
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string
          usage_scope?: string
          workspace_id: string
        }
        Update: {
          approval_status?: string
          asset_type?: string
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata_json?: Json
          mime_type?: string | null
          name?: string
          rights_status?: string
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string
          usage_scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          details_json: Json
          event_type: string
          id: string
          job_id: string | null
          node_name: string | null
          provider: string | null
          request_id: string
          stage_id: string | null
          status: string | null
          summary: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          details_json?: Json
          event_type: string
          id?: string
          job_id?: string | null
          node_name?: string | null
          provider?: string | null
          request_id: string
          stage_id?: string | null
          status?: string | null
          summary: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          details_json?: Json
          event_type?: string
          id?: string
          job_id?: string | null
          node_name?: string | null
          provider?: string | null
          request_id?: string
          stage_id?: string | null
          status?: string | null
          summary?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          compliance_notes: string | null
          created_at: string
          default_aspect_ratio: string | null
          description: string | null
          id: string
          industry: string | null
          name: string
          offer_summary: string | null
          primary_goal: string | null
          slug: string
          status: string
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string
          visual_direction: string | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          compliance_notes?: string | null
          created_at?: string
          default_aspect_ratio?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          offer_summary?: string | null
          primary_goal?: string | null
          slug: string
          status?: string
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          visual_direction?: string | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          compliance_notes?: string | null
          created_at?: string
          default_aspect_ratio?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          offer_summary?: string | null
          primary_goal?: string | null
          slug?: string
          status?: string
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          visual_direction?: string | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string | null
          brand_id: string
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          offer_summary: string | null
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          audience?: string | null
          brand_id: string
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          offer_summary?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          audience?: string | null
          brand_id?: string
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          offer_summary?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          approval_status: string
          brand_id: string | null
          created_at: string
          default_asset_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          usage_notes: string | null
          workspace_id: string
        }
        Insert: {
          approval_status?: string
          brand_id?: string | null
          created_at?: string
          default_asset_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          usage_notes?: string | null
          workspace_id: string
        }
        Update: {
          approval_status?: string
          brand_id?: string | null
          created_at?: string
          default_asset_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          usage_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_default_asset_id_fkey"
            columns: ["default_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      create_requests: {
        Row: {
          approval_mode: string
          aspect_ratio: string
          brand_id: string
          campaign_id: string | null
          created_at: string
          created_by: string | null
          customer_inputs_json: Json
          deadline: string | null
          family: string
          goal: string
          id: string
          priority: string
          status: string
          target_platforms_json: Json
          title: string
          updated_at: string
          what_to_make: string
          workspace_id: string
        }
        Insert: {
          approval_mode?: string
          aspect_ratio: string
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_inputs_json?: Json
          deadline?: string | null
          family: string
          goal: string
          id?: string
          priority?: string
          status?: string
          target_platforms_json?: Json
          title: string
          updated_at?: string
          what_to_make: string
          workspace_id: string
        }
        Update: {
          approval_mode?: string
          aspect_ratio?: string
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_inputs_json?: Json
          deadline?: string | null
          family?: string
          goal?: string
          id?: string
          priority?: string
          status?: string
          target_platforms_json?: Json
          title?: string
          updated_at?: string
          what_to_make?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "create_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "create_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "create_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_errors: {
        Row: {
          created_at: string
          details_json: Json
          id: string
          job_id: string
          message: string
          provider: string | null
          raw_code: string | null
          retryable: boolean
          stage_id: string | null
        }
        Insert: {
          created_at?: string
          details_json?: Json
          id?: string
          job_id: string
          message: string
          provider?: string | null
          raw_code?: string | null
          retryable?: boolean
          stage_id?: string | null
        }
        Update: {
          created_at?: string
          details_json?: Json
          id?: string
          job_id?: string
          message?: string
          provider?: string | null
          raw_code?: string | null
          retryable?: boolean
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_errors_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          error_snapshot_json: Json
          id: string
          inputs_snapshot_json: Json
          job_id: string
          outputs_snapshot_json: Json
          provider_used: string | null
          stage_type: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_snapshot_json?: Json
          id?: string
          inputs_snapshot_json?: Json
          job_id: string
          outputs_snapshot_json?: Json
          provider_used?: string | null
          stage_type: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_snapshot_json?: Json
          id?: string
          inputs_snapshot_json?: Json
          job_id?: string
          outputs_snapshot_json?: Json
          provider_used?: string | null
          stage_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          cost_tier: string
          created_at: string
          current_stage: string | null
          family: string
          id: string
          latency_tier: string
          plan_id: string
          request_id: string
          started_at: string | null
          status: string
          updated_at: string
          variant: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_tier?: string
          created_at?: string
          current_stage?: string | null
          family: string
          id?: string
          latency_tier?: string
          plan_id: string
          request_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          variant: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          cost_tier?: string
          created_at?: string
          current_stage?: string | null
          family?: string
          id?: string
          latency_tier?: string
          plan_id?: string
          request_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          variant?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          approval_route_json: Json
          aspect_ratio: string
          assumptions_json: Json
          brand_id: string
          campaign_id: string | null
          compliance_flags_json: Json
          created_at: string
          created_by: string | null
          expected_artifacts_json: Json
          fallback_policy_json: Json
          family: string
          goal: string
          id: string
          input_summary: string | null
          missing_inputs_json: Json
          plan_version: number
          provider_route_json: Json
          request_id: string
          requires_human_review: boolean
          rerun_points_json: Json
          risk_level: string
          stage_plan_json: Json
          target_platforms_json: Json
          variant: string
          workspace_id: string
        }
        Insert: {
          approval_route_json?: Json
          aspect_ratio: string
          assumptions_json?: Json
          brand_id: string
          campaign_id?: string | null
          compliance_flags_json?: Json
          created_at?: string
          created_by?: string | null
          expected_artifacts_json?: Json
          fallback_policy_json?: Json
          family: string
          goal: string
          id?: string
          input_summary?: string | null
          missing_inputs_json?: Json
          plan_version?: number
          provider_route_json?: Json
          request_id: string
          requires_human_review?: boolean
          rerun_points_json?: Json
          risk_level?: string
          stage_plan_json?: Json
          target_platforms_json?: Json
          variant: string
          workspace_id: string
        }
        Update: {
          approval_route_json?: Json
          aspect_ratio?: string
          assumptions_json?: Json
          brand_id?: string
          campaign_id?: string | null
          compliance_flags_json?: Json
          created_at?: string
          created_by?: string | null
          expected_artifacts_json?: Json
          fallback_policy_json?: Json
          family?: string
          goal?: string
          id?: string
          input_summary?: string | null
          missing_inputs_json?: Json
          plan_version?: number
          provider_route_json?: Json
          request_id?: string
          requires_human_review?: boolean
          rerun_points_json?: Json
          risk_level?: string
          stage_plan_json?: Json
          target_platforms_json?: Json
          variant?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_jobs: {
        Row: {
          artifact_id: string
          channel: string
          created_at: string
          id: string
          job_id: string | null
          payload_json: Json
          request_id: string
          response_json: Json
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artifact_id: string
          channel: string
          created_at?: string
          id?: string
          job_id?: string | null
          payload_json?: Json
          request_id: string
          response_json?: Json
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artifact_id?: string
          channel?: string
          created_at?: string
          id?: string
          job_id?: string | null
          payload_json?: Json
          request_id?: string
          response_json?: Json
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_jobs_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_assets: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          request_id: string
          role: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          request_id: string
          role: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          request_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          approval_status: string
          created_at: string
          end_image_prompt: string | null
          id: string
          job_id: string
          notes: string | null
          plan_id: string
          request_id: string
          scene_name: string
          scene_order: number
          start_image_prompt: string | null
          status: string
          updated_at: string
          video_prompt: string | null
        }
        Insert: {
          approval_status?: string
          created_at?: string
          end_image_prompt?: string | null
          id?: string
          job_id: string
          notes?: string | null
          plan_id: string
          request_id: string
          scene_name: string
          scene_order: number
          start_image_prompt?: string | null
          status?: string
          updated_at?: string
          video_prompt?: string | null
        }
        Update: {
          approval_status?: string
          created_at?: string
          end_image_prompt?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          plan_id?: string
          request_id?: string
          scene_name?: string
          scene_order?: number
          start_image_prompt?: string | null
          status?: string
          updated_at?: string
          video_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "create_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_aspect_ratios: {
        Row: {
          active: boolean
          created_at: string
          height_ratio: number
          key: string
          label: string
          sort_order: number
          width_ratio: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          height_ratio: number
          key: string
          label: string
          sort_order: number
          width_ratio: number
        }
        Update: {
          active?: boolean
          created_at?: string
          height_ratio?: number
          key?: string
          label?: string
          sort_order?: number
          width_ratio?: number
        }
        Relationships: []
      }
      voices: {
        Row: {
          approval_status: string
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          provider: string
          provider_voice_id: string
          updated_at: string
          usage_notes: string | null
          workspace_id: string
        }
        Insert: {
          approval_status?: string
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          provider: string
          provider_voice_id: string
          updated_at?: string
          usage_notes?: string | null
          workspace_id: string
        }
        Update: {
          approval_status?: string
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          provider?: string
          provider_voice_id?: string
          updated_at?: string
          usage_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_families: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          key: string
          name: string
          sort_order: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      workflow_stages_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          key: string
          name: string
          sort_order: number
          stage_group: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          key: string
          name: string
          sort_order: number
          stage_group: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          key?: string
          name?: string
          sort_order?: number
          stage_group?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
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
