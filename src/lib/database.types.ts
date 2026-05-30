export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskStatus =
  | "new"
  | "in_progress"
  | "pending"
  | "delayed"
  | "completed"
  | "cancelled";

export type TaskPriority = "high" | "medium" | "low";

export type CustomFieldType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "multi_select"
  | "person"
  | "rating"
  | "url";

export type ViewMode = "table" | "kanban" | "timeline" | "calendar" | "board";

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          status: TaskStatus;
          client_id: string | null;
          start_date: string | null;
          due_date: string | null;
          is_archived: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          status?: TaskStatus;
          client_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          is_archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          status?: TaskStatus;
          client_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          is_archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          org_id: string;
          name: string;
          status: TaskStatus;
          priority: TaskPriority | null;
          progress: number;
          start_date: string | null;
          due_date: string | null;
          description: string | null;
          client_id: string | null;
          position: number;
          is_archived: boolean;
          custom_data: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          org_id: string;
          name: string;
          status?: TaskStatus;
          priority?: TaskPriority | null;
          progress?: number;
          start_date?: string | null;
          due_date?: string | null;
          description?: string | null;
          client_id?: string | null;
          position?: number;
          is_archived?: boolean;
          custom_data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          org_id?: string;
          name?: string;
          status?: TaskStatus;
          priority?: TaskPriority | null;
          progress?: number;
          start_date?: string | null;
          due_date?: string | null;
          description?: string | null;
          client_id?: string | null;
          position?: number;
          is_archived?: boolean;
          custom_data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_members: {
        Row: {
          task_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      custom_columns: {
        Row: {
          id: string;
          project_id: string | null;
          org_id: string;
          name: string;
          field_type: CustomFieldType;
          options: Json;
          config: Json;
          position: number;
          is_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          org_id: string;
          name: string;
          field_type: CustomFieldType;
          options?: Json;
          config?: Json;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          org_id?: string;
          name?: string;
          field_type?: CustomFieldType;
          options?: Json;
          config?: Json;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sub_tasks: {
        Row: {
          id: string;
          task_id: string;
          org_id: string;
          name: string;
          is_done: boolean;
          assignee_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          org_id: string;
          name: string;
          is_done?: boolean;
          assignee_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          org_id?: string;
          name?: string;
          is_done?: boolean;
          assignee_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          task_id: string;
          org_id: string;
          user_id: string;
          parent_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          org_id: string;
          user_id: string;
          parent_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          org_id?: string;
          user_id?: string;
          parent_id?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_logs: {
        Row: {
          id: string;
          task_id: string;
          org_id: string;
          duration_mins: number;
          description: string | null;
          logged_by: string;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          org_id: string;
          duration_mins: number;
          description?: string | null;
          logged_by: string;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          org_id?: string;
          duration_mins?: number;
          description?: string | null;
          logged_by?: string;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          task_id: string;
          org_id: string;
          storage_path: string;
          filename: string;
          mime_type: string | null;
          size_bytes: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          org_id: string;
          storage_path: string;
          filename: string;
          mime_type?: string | null;
          size_bytes?: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          org_id?: string;
          storage_path?: string;
          filename?: string;
          mime_type?: string | null;
          size_bytes?: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      view_preferences: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          view_mode: ViewMode;
          group_by: string;
          sort_config: Json;
          hidden_columns: Json;
          filters: Json;
          kanban_config: Json;
          calendar_config: Json;
          timeline_config: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          view_mode?: ViewMode;
          group_by?: string;
          sort_config?: Json;
          hidden_columns?: Json;
          filters?: Json;
          kanban_config?: Json;
          calendar_config?: Json;
          timeline_config?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          view_mode?: ViewMode;
          group_by?: string;
          sort_config?: Json;
          hidden_columns?: Json;
          filters?: Json;
          kanban_config?: Json;
          calendar_config?: Json;
          timeline_config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          task_id: string | null;
          comment_id: string | null;
          type: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          task_id?: string | null;
          comment_id?: string | null;
          type: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          task_id?: string | null;
          comment_id?: string | null;
          type?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_org_member: {
        Args: { check_org_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      task_status: TaskStatus;
      task_priority: TaskPriority;
      custom_field_type: CustomFieldType;
      view_mode: ViewMode;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
