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
      appointment_body_selections: {
        Row: {
          appointment_id: string
          area_name: string
          area_price: number
          body_area_id: string
          created_at: string
          id: string
        }
        Insert: {
          appointment_id: string
          area_name: string
          area_price: number
          body_area_id: string
          created_at?: string
          id?: string
        }
        Update: {
          appointment_id?: string
          area_name?: string
          area_price?: number
          body_area_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_body_selections_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_body_selections_body_area_id_fkey"
            columns: ["body_area_id"]
            isOneToOne: false
            referencedRelation: "body_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_specifications: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          specification_id: string
          specification_name: string
          specification_price: number
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          specification_id: string
          specification_name: string
          specification_price?: number
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          specification_id?: string
          specification_name?: string
          specification_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_specifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_specifications_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "procedure_specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          city_id: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          procedure_id: string
          professional_id: string | null
          selected_gender: string | null
          status: string
          total_body_areas_price: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          city_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          procedure_id: string
          professional_id?: string | null
          selected_gender?: string | null
          status?: string
          total_body_areas_price?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          city_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          procedure_id?: string
          professional_id?: string | null
          selected_gender?: string | null
          status?: string
          total_body_areas_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_settings"
            referencedColumns: ["id"]
          },
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
      body_areas: {
        Row: {
          coordinates: Json
          created_at: string
          id: string
          is_symmetric: boolean | null
          name: string
          price: number
          procedure_id: string
          updated_at: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          id?: string
          is_symmetric?: boolean | null
          name: string
          price?: number
          procedure_id: string
          updated_at?: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          id?: string
          is_symmetric?: boolean | null
          name?: string
          price?: number
          procedure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_areas_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
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
      city_availability: {
        Row: {
          city_id: string
          created_at: string
          date_end: string | null
          date_start: string
          end_time: string | null
          id: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          date_end?: string | null
          date_start: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          date_end?: string | null
          date_start?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_availability_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      city_settings: {
        Row: {
          address: string | null
          city: string | null
          city_name: string
          clinic_name: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          map_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          city_name: string
          clinic_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          map_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          city_name?: string
          clinic_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          map_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          notes: string | null
          original_file_name: string
          updated_at: string
          uploaded_by_admin: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          notes?: string | null
          original_file_name: string
          updated_at?: string
          uploaded_by_admin?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          notes?: string | null
          original_file_name?: string
          updated_at?: string
          uploaded_by_admin?: string | null
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
      document_annotations: {
        Row: {
          annotation_type: string
          content: string
          created_at: string
          created_by: string
          document_id: string
          id: string
          page_number: number | null
          position_x: number | null
          position_y: number | null
          style_properties: Json | null
          updated_at: string
        }
        Insert: {
          annotation_type?: string
          content: string
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          style_properties?: Json | null
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          content?: string
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          style_properties?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          material_name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_name: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_suggestions: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          status: string
          suggested_date: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          status?: string
          suggested_date: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          status?: string
          suggested_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_suggestions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          invoice_url: string | null
          item_id: string
          notes: string | null
          procedure_id: string | null
          quantity: number
          total_value: number | null
          transaction_date: string
          transaction_type: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_url?: string | null
          item_id: string
          notes?: string | null
          procedure_id?: string | null
          quantity: number
          total_value?: number | null
          transaction_date: string
          transaction_type: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_url?: string | null
          item_id?: string
          notes?: string | null
          procedure_id?: string | null
          quantity?: number
          total_value?: number | null
          transaction_date?: string
          transaction_type?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
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
      procedure_discount_config: {
        Row: {
          created_at: string
          discount_percentage: number
          id: string
          is_active: boolean
          max_groups: number | null
          min_groups: number
          procedure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percentage: number
          id?: string
          is_active?: boolean
          max_groups?: number | null
          min_groups: number
          procedure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          max_groups?: number | null
          min_groups?: number
          procedure_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      procedure_monthly_goals: {
        Row: {
          created_at: string
          id: string
          procedure_id: string
          quantity: number
          specification_id: string | null
          target_month: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          procedure_id: string
          quantity?: number
          specification_id?: string | null
          target_month?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          procedure_id?: string
          quantity?: number
          specification_id?: string | null
          target_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_monthly_goals_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_monthly_goals_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "procedure_specifications"
            referencedColumns: ["id"]
          },
        ]
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
      procedure_specifications: {
        Row: {
          area_shapes: Json | null
          created_at: string | null
          description: string | null
          display_order: number | null
          gender: string | null
          has_area_selection: boolean | null
          id: string
          is_active: boolean | null
          material_cost: number | null
          name: string
          price: number
          procedure_id: string
          updated_at: string | null
        }
        Insert: {
          area_shapes?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gender?: string | null
          has_area_selection?: boolean | null
          id?: string
          is_active?: boolean | null
          material_cost?: number | null
          name: string
          price?: number
          procedure_id: string
          updated_at?: string | null
        }
        Update: {
          area_shapes?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gender?: string | null
          has_area_selection?: boolean | null
          id?: string
          is_active?: boolean | null
          material_cost?: number | null
          name?: string
          price?: number
          procedure_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_specifications_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          benefits: string[] | null
          body_image_url: string | null
          body_image_url_male: string | null
          body_selection_type: string | null
          category_id: string | null
          created_at: string
          description: string | null
          duration: number
          id: string
          image_url: string | null
          indication: string | null
          is_featured: boolean | null
          material_cost: number | null
          name: string
          price: number | null
          requires_area_selection: boolean | null
          requires_body_image_selection: boolean | null
          requires_body_selection: boolean | null
          requires_specifications: boolean | null
          sessions: number
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          body_image_url?: string | null
          body_image_url_male?: string | null
          body_selection_type?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          indication?: string | null
          is_featured?: boolean | null
          material_cost?: number | null
          name: string
          price?: number | null
          requires_area_selection?: boolean | null
          requires_body_image_selection?: boolean | null
          requires_body_selection?: boolean | null
          requires_specifications?: boolean | null
          sessions?: number
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          body_image_url?: string | null
          body_image_url_male?: string | null
          body_selection_type?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          indication?: string | null
          is_featured?: boolean | null
          material_cost?: number | null
          name?: string
          price?: number | null
          requires_area_selection?: boolean | null
          requires_body_image_selection?: boolean | null
          requires_body_selection?: boolean | null
          requires_specifications?: boolean | null
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
      promotions: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          is_procedure: boolean | null
          procedure_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          is_procedure?: boolean | null
          procedure_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          is_procedure?: boolean | null
          procedure_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          appointment_date: string | null
          appointment_id: string | null
          client_phone: string | null
          created_at: string | null
          id: string
          message_id: string | null
          sent_date: string | null
          status: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_id?: string | null
          client_phone?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          sent_date?: string | null
          status?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_id?: string | null
          client_phone?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          sent_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reminder_time: string
          template_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reminder_time?: string
          template_content?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reminder_time?: string
          template_content?: string
          updated_at?: string
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
      check_and_send_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      cleanup_old_appointments: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      get_inventory_balance: {
        Args: { p_item_id: string }
        Returns: number
      }
      get_latest_unit_price: {
        Args: { p_item_id: string }
        Returns: number
      }
      get_public_site_setting: {
        Args: { setting_key_param: string }
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
      safe_check_cpf_exists: {
        Args: { cpf_param: string }
        Returns: boolean
      }
      send_daily_reminders: {
        Args: Record<PropertyKey, never>
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
