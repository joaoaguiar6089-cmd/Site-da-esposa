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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string | null
          email_notifications: boolean
          id: string
          is_active: boolean
          last_login: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          id?: string
          is_active?: boolean
          last_login?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          id?: string
          is_active?: boolean
          last_login?: string | null
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          procedure_id: string
          professional_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          procedure_id: string
          professional_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          procedure_id?: string
          professional_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          celular: string
          cidade: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          id: string
          nome: string
          sobrenome: string
          updated_at: string
        }
        Insert: {
          celular: string
          cidade?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          id?: string
          nome: string
          sobrenome: string
          updated_at?: string
        }
        Update: {
          celular?: string
          cidade?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          id?: string
          nome?: string
          sobrenome?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      procedure_results: {
        Row: {
          appointment_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_results_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          benefits: string[] | null
          category_id: string | null
          created_at: string
          description: string | null
          duration: number
          id: string
          image_url: string | null
          indication: string | null
          is_featured: boolean | null
          name: string
          price: number | null
          sessions: number
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          indication?: string | null
          is_featured?: boolean | null
          name: string
          price?: number | null
          sessions?: number
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          indication?: string | null
          is_featured?: boolean | null
          name?: string
          price?: number | null
          sessions?: number
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          cpf: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          created_at: string
          custom_end_time: string | null
          custom_interval_minutes: number | null
          custom_start_time: string | null
          date_end: string | null
          date_start: string
          id: string
          is_closed: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_end_time?: string | null
          custom_interval_minutes?: number | null
          custom_start_time?: string | null
          date_end?: string | null
          date_start: string
          id?: string
          is_closed?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_end_time?: string | null
          custom_interval_minutes?: number | null
          custom_start_time?: string | null
          date_end?: string | null
          date_start?: string
          id?: string
          is_closed?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_settings: {
        Row: {
          available_days: number[]
          created_at: string
          end_time: string
          id: string
          interval_minutes: number
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          available_days?: number[]
          created_at?: string
          end_time?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Update: {
          available_days?: number[]
          created_at?: string
          end_time?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          id: string
          template_content: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_content: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          template_content?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      professionals_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_login: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      authenticate_for_cpf_lookup: {
        Args: { cpf_param: string }
        Returns: boolean
      }
      check_admin_access: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_appointment_conflict: {
        Args: {
          p_appointment_date: string
          p_appointment_id?: string
          p_appointment_time: string
          p_procedure_id: string
          p_professional_id: string
        }
        Returns: boolean
      }
      check_cpf_exists: {
        Args: { cpf_param: string }
        Returns: boolean
      }
      check_is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      columns_match_current_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_secure_cpf_password: {
        Args: { cpf_param: string }
        Returns: string
      }
      generic_view_policy: {
        Args: { table_name: string }
        Returns: boolean
      }
      get_client_by_cpf: {
        Args: { p_cpf: string }
        Returns: Json
      }
      get_current_user_cpf: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_active_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args: {
          event_details?: Json
          event_type: string
          target_user_id?: string
        }
        Returns: undefined
      }
      update_client_phone: {
        Args:
          | { p_client_id: string; p_cpf: string; p_phone: string }
          | { p_client_id: string; p_cpf: string; p_phone: string }
          | { p_client_id: string; p_phone: string; p_user_id: string }
          | { p_cpf: string; p_phone: string }
        Returns: Json
      }
      update_client_phone_simple: {
        Args: { p_client_id: string; p_cpf: string; p_phone: string }
        Returns: boolean
      }
      validate_cpf: {
        Args: { p_cpf: string }
        Returns: boolean
      }
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
