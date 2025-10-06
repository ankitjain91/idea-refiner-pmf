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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_credits_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          credits_used: number
          id: string
          operation_type: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          credits_used?: number
          id?: string
          operation_type: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          credits_used?: number
          id?: string
          operation_type?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analysis_sessions: {
        Row: {
          created_at: string
          id: string
          idea: string
          insights: Json | null
          is_active: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          last_accessed: string | null
          metadata: Json | null
          pmf_score: number | null
          refinements: Json | null
          session_name: string
          updated_at: string
          user_answers: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea: string
          insights?: Json | null
          is_active?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_accessed?: string | null
          metadata?: Json | null
          pmf_score?: number | null
          refinements?: Json | null
          session_name: string
          updated_at?: string
          user_answers?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea?: string
          insights?: Json | null
          is_active?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_accessed?: string | null
          metadata?: Json | null
          pmf_score?: number | null
          refinements?: Json | null
          session_name?: string
          updated_at?: string
          user_answers?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      brainstorming_sessions: {
        Row: {
          activity_log: Json
          created_at: string
          id: string
          is_active: boolean | null
          last_accessed: string
          name: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_log?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_accessed?: string
          name: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_log?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_accessed?: string
          name?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collaborations: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          message: string | null
          recipient_id: string
          requester_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          message?: string | null
          recipient_id: string
          requester_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          message?: string | null
          recipient_id?: string
          requester_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_data: {
        Row: {
          created_at: string
          data: Json
          expires_at: string | null
          id: string
          idea_text: string | null
          metadata: Json | null
          session_id: string | null
          tile_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          expires_at?: string | null
          id?: string
          idea_text?: string | null
          metadata?: Json | null
          session_id?: string | null
          tile_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          idea_text?: string | null
          metadata?: Json | null
          session_id?: string | null
          tile_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "brainstorming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exports_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          export_type: string
          id: string
          idea_id: string | null
          user_id: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          export_type: string
          id?: string
          idea_id?: string | null
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          export_type?: string
          id?: string
          idea_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      idea_analyses: {
        Row: {
          benchmarks: Json | null
          competitors: Json | null
          created_at: string
          focus_zones: Json | null
          gtm_strategy: Json | null
          id: string
          idea_text: string
          implementation_strategy: Json | null
          last_refreshed_at: string | null
          market_size: Json | null
          marketing_channels: Json | null
          personas: Json | null
          profit_potential: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          benchmarks?: Json | null
          competitors?: Json | null
          created_at?: string
          focus_zones?: Json | null
          gtm_strategy?: Json | null
          id?: string
          idea_text: string
          implementation_strategy?: Json | null
          last_refreshed_at?: string | null
          market_size?: Json | null
          marketing_channels?: Json | null
          personas?: Json | null
          profit_potential?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          benchmarks?: Json | null
          competitors?: Json | null
          created_at?: string
          focus_zones?: Json | null
          gtm_strategy?: Json | null
          id?: string
          idea_text?: string
          implementation_strategy?: Json | null
          last_refreshed_at?: string | null
          market_size?: Json | null
          marketing_channels?: Json | null
          personas?: Json | null
          profit_potential?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idea_validations: {
        Row: {
          created_at: string | null
          id: string
          idea_text: string
          metadata: Json | null
          pmf_score: number | null
          tam: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_text: string
          metadata?: Json | null
          pmf_score?: number | null
          tam?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_text?: string
          metadata?: Json | null
          pmf_score?: number | null
          tam?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category: string | null
          competition: string | null
          created_at: string
          id: string
          income_range: string | null
          interests: string[] | null
          is_public: boolean | null
          keywords: string[] | null
          market_size: string | null
          original_idea: string
          pmf_score: number | null
          refined_idea: string | null
          target_age: string | null
          trends: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          competition?: string | null
          created_at?: string
          id?: string
          income_range?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          keywords?: string[] | null
          market_size?: string | null
          original_idea: string
          pmf_score?: number | null
          refined_idea?: string | null
          target_age?: string | null
          trends?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          competition?: string | null
          created_at?: string
          id?: string
          income_range?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          keywords?: string[] | null
          market_size?: string | null
          original_idea?: string
          pmf_score?: number | null
          refined_idea?: string | null
          target_age?: string | null
          trends?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      implementation_tasks: {
        Row: {
          analysis_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          task_category: string
          task_name: string
        }
        Insert: {
          analysis_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          task_category: string
          task_name: string
        }
        Update: {
          analysis_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          task_category?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_tasks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "idea_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          hit_count: number
          last_accessed: string
          model: string
          prompt_hash: string
          response: Json
          tokens_used: number | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          hit_count?: number
          last_accessed?: string
          model: string
          prompt_hash: string
          response: Json
          tokens_used?: number | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          hit_count?: number
          last_accessed?: string
          model?: string
          prompt_hash?: string
          response?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      openai_usage: {
        Row: {
          cost_usd: number
          created_at: string
          function_name: string | null
          id: string
          model: string
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          function_name?: string | null
          id?: string
          model: string
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          function_name?: string | null
          id?: string
          model?: string
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          display_name: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          locked_idea: string | null
          marketing_emails: boolean | null
          phone: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_tier: Database["public"]["Enums"]["app_role"] | null
          timezone: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          locked_idea?: string | null
          marketing_emails?: boolean | null
          phone?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: Database["public"]["Enums"]["app_role"] | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          locked_idea?: string | null
          marketing_emails?: boolean | null
          phone?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: Database["public"]["Enums"]["app_role"] | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      realtime_metrics: {
        Row: {
          analysis_id: string
          id: string
          metric_type: string
          metric_value: Json
          timestamp: string
        }
        Insert: {
          analysis_id: string
          id?: string
          metric_type: string
          metric_value: Json
          timestamp?: string
        }
        Update: {
          analysis_id?: string
          id?: string
          metric_type?: string
          metric_value?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "realtime_metrics_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "idea_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      refinements: {
        Row: {
          applied_at: string
          id: string
          idea_id: string
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          idea_id: string
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          idea_id?: string
          suggestion_description?: string
          suggestion_title?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refinements_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_idea_suggestions: {
        Row: {
          category: string | null
          created_at: string
          difficulty_level: string | null
          id: string
          idea_text: string
          is_active: boolean | null
          target_audience: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          difficulty_level?: string | null
          id?: string
          idea_text: string
          is_active?: boolean | null
          target_audience?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          difficulty_level?: string | null
          id?: string
          idea_text?: string
          is_active?: boolean | null
          target_audience?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      twitter_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          query_hash: string
          query_text: string
          rate_limit_remaining: number | null
          rate_limit_reset: number | null
          response_data: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          query_hash: string
          query_text: string
          rate_limit_remaining?: number | null
          rate_limit_reset?: number | null
          response_data: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          query_hash?: string
          query_text?: string
          rate_limit_remaining?: number | null
          rate_limit_reset?: number | null
          response_data?: Json
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          ai_credits_used: number
          billing_period_end: string
          billing_period_start: string
          exports_used: number
          id: string
          ideas_used: number
          projects_used: number
          seats_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_used?: number
          billing_period_end: string
          billing_period_start: string
          exports_used?: number
          id?: string
          ideas_used?: number
          projects_used?: number
          seats_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_used?: number
          billing_period_end?: string
          billing_period_start?: string
          exports_used?: number
          id?: string
          ideas_used?: number
          projects_used?: number
          seats_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      web_search_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      clean_expired_twitter_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_llm_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_billing_period: {
        Args: Record<PropertyKey, never>
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      get_openai_total_spend: {
        Args: { _user_id?: string }
        Returns: number
      }
      get_random_startup_ideas: {
        Args: { limit_count?: number }
        Returns: {
          category: string | null
          created_at: string
          difficulty_level: string | null
          id: string
          idea_text: string
          is_active: boolean | null
          target_audience: string | null
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _amount?: number; _type: string; _user_id: string }
        Returns: boolean
      }
      initialize_usage_limits: {
        Args: { _user_id: string }
        Returns: undefined
      }
      sync_user_subscription: {
        Args: {
          _stripe_customer_id?: string
          _subscription_end?: string
          _tier: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "free" | "pro" | "enterprise"
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
    Enums: {
      app_role: ["free", "pro", "enterprise"],
    },
  },
} as const
