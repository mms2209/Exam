export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          menu_access: string[]
          sub_menu_access: Record<string, string[]>
          component_access: string[]
          is_active: boolean
          needs_password_reset: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string
          menu_access?: string[]
          sub_menu_access?: Record<string, string[]>
          component_access?: string[]
          is_active?: boolean
          needs_password_reset?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          menu_access?: string[]
          sub_menu_access?: Record<string, string[]>
          component_access?: string[]
          is_active?: boolean
          needs_password_reset?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          resource: string
          action: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          resource: string
          action: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          resource?: string
          action?: string
          description?: string | null
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          created_at?: string
        }
      }
      exam_subjects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      exam_papers: {
        Row: {
          id: string
          subject_id: string
          year: number
          paper_number: string
          title: string | null
          paper_file_url: string
          marking_scheme_file_url: string
          uploaded_by: string | null
          paper_extracted_text: string | null
          marking_scheme_extracted_text: string | null
          text_extraction_status: 'pending' | 'processing' | 'completed' | 'failed'
          text_extracted_at: string | null
          extraction_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          year: number
          paper_number: string
          title?: string | null
          paper_file_url: string
          marking_scheme_file_url: string
          uploaded_by?: string | null
          paper_extracted_text?: string | null
          marking_scheme_extracted_text?: string | null
          text_extraction_status?: 'pending' | 'processing' | 'completed' | 'failed'
          text_extracted_at?: string | null
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          year?: number
          paper_number?: string
          title?: string | null
          paper_file_url?: string
          marking_scheme_file_url?: string
          uploaded_by?: string | null
          paper_extracted_text?: string | null
          marking_scheme_extracted_text?: string | null
          text_extraction_status?: 'pending' | 'processing' | 'completed' | 'failed'
          text_extracted_at?: string | null
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      student_paper_interactions: {
        Row: {
          id: string
          user_id: string
          paper_id: string
          last_accessed_at: string
          access_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          paper_id: string
          last_accessed_at?: string
          access_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          paper_id?: string
          last_accessed_at?: string
          access_count?: number
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          paper_id: string
          messages: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          paper_id: string
          messages?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          paper_id?: string
          messages?: any
          created_at?: string
          updated_at?: string
        }
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
  }
}