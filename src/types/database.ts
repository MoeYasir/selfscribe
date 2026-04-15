export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          voice_profile: Json | null
          energy_map: Json | null
          energy_map_updated_at: string | null
          entry_count: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          voice_profile?: Json | null
          energy_map?: Json | null
          energy_map_updated_at?: string | null
          entry_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          voice_profile?: Json | null
          energy_map?: Json | null
          energy_map_updated_at?: string | null
          entry_count?: number
          created_at?: string
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          content: string | null
          mood_word: string | null
          focus_note: string | null
          word_count: number
          is_open: boolean
          loop_context: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date: string
          content?: string | null
          mood_word?: string | null
          focus_note?: string | null
          word_count?: number
          is_open?: boolean
          loop_context?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          content?: string | null
          mood_word?: string | null
          focus_note?: string | null
          word_count?: number
          is_open?: boolean
          loop_context?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      entry_embeddings: {
        Row: {
          id: string
          entry_id: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          embedding?: number[] | null
          created_at?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          id: string
          source_entry_id: string
          related_entry_id: string
          similarity_score: number
          created_at: string
        }
        Insert: {
          id?: string
          source_entry_id: string
          related_entry_id: string
          similarity_score: number
          created_at?: string
        }
        Update: {
          id?: string
          source_entry_id?: string
          related_entry_id?: string
          similarity_score?: number
          created_at?: string
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          id: string
          user_id: string
          week_start: string
          ai_summary: string | null
          user_reflection: string | null
          emotional_arc: Json | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          ai_summary?: string | null
          user_reflection?: string | null
          emotional_arc?: Json | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          ai_summary?: string | null
          user_reflection?: string | null
          emotional_arc?: Json | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      mirror_reports: {
        Row: {
          id: string
          user_id: string
          report_month: string
          content: string | null
          patterns: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_month: string
          content?: string | null
          patterns?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_month?: string
          content?: string | null
          patterns?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      recurring_themes: {
        Row: {
          id: string
          user_id: string
          theme_label: string
          occurrence_count: number
          last_seen: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme_label: string
          occurrence_count?: number
          last_seen?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme_label?: string
          occurrence_count?: number
          last_seen?: string | null
          created_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string | null
          post_type: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content?: string | null
          post_type?: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string | null
          post_type?: string
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      find_similar_entries: {
        Args: {
          p_entry_id: string
          p_embedding: string
          p_user_id: string
          p_limit?: number
        }
        Returns: Array<{ entry_id: string; similarity: number }>
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row']
export type DailyEntryRow = Database['public']['Tables']['daily_entries']['Row']
export type EntryEmbeddingRow = Database['public']['Tables']['entry_embeddings']['Row']
export type ThreadRow = Database['public']['Tables']['threads']['Row']
export type WeeklySummaryRow = Database['public']['Tables']['weekly_summaries']['Row']
export type MirrorReportRow = Database['public']['Tables']['mirror_reports']['Row']
export type RecurringThemeRow = Database['public']['Tables']['recurring_themes']['Row']
export type BlogPostRow = Database['public']['Tables']['blog_posts']['Row']
