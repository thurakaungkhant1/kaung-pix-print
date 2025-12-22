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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: number
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: number
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          participant1_id: string
          participant2_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant1_id: string
          participant2_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          participant1_id?: string
          participant2_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      favourite_photos: {
        Row: {
          created_at: string | null
          id: string
          photo_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_photos_new_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_products_new_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          media_type: string | null
          media_url: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          transcription: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          transcription?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivery_address: string
          game_id: string | null
          game_name: string | null
          id: string
          payment_method: string
          payment_proof_url: string | null
          phone_number: string
          price: number
          product_id: number
          quantity: number
          server_id: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_address?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          payment_method?: string
          payment_proof_url?: string | null
          phone_number?: string
          price: number
          product_id: number
          quantity?: number
          server_id?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_address?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          payment_method?: string
          payment_proof_url?: string | null
          phone_number?: string
          price?: number
          product_id?: number
          quantity?: number
          server_id?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_new_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          category: string | null
          client_name: string
          created_at: string | null
          file_size: number
          file_url: string
          id: number
          preview_image: string | null
          shooting_date: string | null
        }
        Insert: {
          category?: string | null
          client_name: string
          created_at?: string | null
          file_size: number
          file_url: string
          id?: number
          preview_image?: string | null
          shooting_date?: string | null
        }
        Update: {
          category?: string | null
          client_name?: string
          created_at?: string | null
          file_size?: number
          file_url?: string
          id?: number
          preview_image?: string | null
          shooting_date?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      point_withdrawals: {
        Row: {
          created_at: string | null
          id: string
          points_withdrawn: number
          status: string
          user_id: string
          withdrawal_item_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_withdrawn: number
          status?: string
          user_id: string
          withdrawal_item_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points_withdrawn?: number
          status?: string
          user_id?: string
          withdrawal_item_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "point_withdrawals_new_withdrawal_item_id_fkey"
            columns: ["withdrawal_item_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_items"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_memberships: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          points_per_minute: number
          started_at: string
          total_chat_points_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          points_per_minute?: number
          started_at?: string
          total_chat_points_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          points_per_minute?: number
          started_at?: string
          total_chat_points_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_plans: {
        Row: {
          badge_text: string | null
          created_at: string
          description: string | null
          duration_months: number
          id: string
          is_active: boolean
          name: string
          plan_type: string
          price_mmk: number | null
          price_points: number
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          duration_months: number
          id?: string
          is_active?: boolean
          name: string
          plan_type?: string
          price_mmk?: number | null
          price_points: number
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: string
          price_mmk?: number | null
          price_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      premium_purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          phone_number: string
          plan_id: string | null
          points_per_minute: number
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          phone_number: string
          plan_id?: string | null
          points_per_minute?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          plan_id?: string | null
          points_per_minute?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_purchase_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "premium_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          product_id: number
          rating: number
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          product_id: number
          rating: number
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          product_id?: number
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: number
          image_url: string
          name: string
          points_value: number
          price: number
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: number
          image_url: string
          name: string
          points_value?: number
          price: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string
          name?: string
          points_value?: number
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string | null
          download_pin: string | null
          email: string | null
          id: string
          is_active_visible: boolean | null
          language: string | null
          name: string
          phone_number: string
          points: number
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string | null
          download_pin?: string | null
          email?: string | null
          id: string
          is_active_visible?: boolean | null
          language?: string | null
          name: string
          phone_number: string
          points?: number
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string | null
          download_pin?: string | null
          email?: string | null
          id?: string
          is_active_visible?: boolean | null
          language?: string | null
          name?: string
          phone_number?: string
          points?: number
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_action: string | null
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          message_id: string | null
          reason: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          reason: string
          report_type?: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      spinner_spins: {
        Row: {
          created_at: string | null
          id: string
          points_won: number
          spin_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_won: number
          spin_date?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_won?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_items: {
        Row: {
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          is_active: boolean
          name: string
          points_required: number
          updated_at: string
          value_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name: string
          points_required: number
          updated_at?: string
          value_amount: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_required?: number
          updated_at?: string
          value_amount?: number
        }
        Relationships: []
      }
      withdrawal_settings: {
        Row: {
          created_at: string | null
          enabled: boolean
          exchange_rate: number
          id: string
          minimum_points: number
          terms_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          exchange_rate?: number
          id?: string
          minimum_points?: number
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          exchange_rate?: number
          id?: string
          minimum_points?: number
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          points: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          points?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          points?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      get_daily_points_earned: {
        Args: { exclude_spin?: boolean; user_id_param: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
