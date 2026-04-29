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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          filename: string
          id: string
          mime_type: string
          protocol_id: string
          size_bytes: number
          source_url: string | null
          storage_path: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          filename: string
          id?: string
          mime_type: string
          protocol_id: string
          size_bytes: number
          source_url?: string | null
          storage_path: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          filename?: string
          id?: string
          mime_type?: string
          protocol_id?: string
          size_bytes?: number
          source_url?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edges: {
        Row: {
          condition_expr: Json | null
          id: string
          label: string | null
          protocol_id: string
          source_node_id: string
          style: Database["public"]["Enums"]["edge_style"]
          target_node_id: string
          tenant_id: string
        }
        Insert: {
          condition_expr?: Json | null
          id?: string
          label?: string | null
          protocol_id: string
          source_node_id: string
          style?: Database["public"]["Enums"]["edge_style"]
          target_node_id: string
          tenant_id: string
        }
        Update: {
          condition_expr?: Json | null
          id?: string
          label?: string | null
          protocol_id?: string
          source_node_id?: string
          style?: Database["public"]["Enums"]["edge_style"]
          target_node_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edges_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          calculator_type: string | null
          content: Json
          created_at: string
          encaminhamento_target_id: string | null
          id: string
          label: string
          links_to_protocol_id: string | null
          position_x: number
          position_y: number
          protocol_id: string
          search_vector: unknown
          tags: Json
          tenant_id: string
          type: Database["public"]["Enums"]["node_type"]
          updated_at: string
        }
        Insert: {
          calculator_type?: string | null
          content?: Json
          created_at?: string
          encaminhamento_target_id?: string | null
          id?: string
          label: string
          links_to_protocol_id?: string | null
          position_x?: number
          position_y?: number
          protocol_id: string
          search_vector?: unknown
          tags?: Json
          tenant_id: string
          type: Database["public"]["Enums"]["node_type"]
          updated_at?: string
        }
        Update: {
          calculator_type?: string | null
          content?: Json
          created_at?: string
          encaminhamento_target_id?: string | null
          id?: string
          label?: string
          links_to_protocol_id?: string | null
          position_x?: number
          position_y?: number
          protocol_id?: string
          search_vector?: unknown
          tags?: Json
          tenant_id?: string
          type?: Database["public"]["Enums"]["node_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nodes_encaminhamento_target_id_fkey"
            columns: ["encaminhamento_target_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_links_to_protocol_id_fkey"
            columns: ["links_to_protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_audit: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          id: string
          occurred_at: string
          payload: Json | null
          protocol_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          id?: string
          occurred_at?: string
          payload?: Json | null
          protocol_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          id?: string
          occurred_at?: string
          payload?: Json | null
          protocol_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_audit_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_usage: {
        Row: {
          action: Database["public"]["Enums"]["usage_action"]
          duration_ms: number | null
          id: string
          node_id: string | null
          occurred_at: string
          protocol_id: string
          tenant_id: string
          user_id: string | null
          version_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["usage_action"]
          duration_ms?: number | null
          id?: string
          node_id?: string | null
          occurred_at?: string
          protocol_id: string
          tenant_id: string
          user_id?: string | null
          version_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["usage_action"]
          duration_ms?: number | null
          id?: string
          node_id?: string | null
          occurred_at?: string
          protocol_id?: string
          tenant_id?: string
          user_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_usage_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_usage_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_usage_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_versions: {
        Row: {
          change_note: string | null
          graph: Json
          id: string
          is_current: boolean
          protocol_id: string
          published_at: string
          published_by: string | null
          tenant_id: string
          version_number: number
        }
        Insert: {
          change_note?: string | null
          graph: Json
          id?: string
          is_current?: boolean
          protocol_id: string
          published_at?: string
          published_by?: string | null
          tenant_id: string
          version_number: number
        }
        Update: {
          change_note?: string | null
          graph?: Json
          id?: string
          is_current?: boolean
          protocol_id?: string
          published_at?: string
          published_by?: string | null
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          active_version_id: string | null
          created_at: string
          created_by: string | null
          id: string
          owner_curator_id: string | null
          search_vector: unknown
          slug: string
          source_protocol_id: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["protocol_status"]
          summary: string | null
          tags: Json
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["protocol_type"]
          updated_at: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          owner_curator_id?: string | null
          search_vector?: unknown
          slug: string
          source_protocol_id?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          summary?: string | null
          tags?: Json
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          owner_curator_id?: string | null
          search_vector?: unknown
          slug?: string
          source_protocol_id?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          summary?: string | null
          tags?: Json
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["protocol_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_active_version"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_owner_curator_id_fkey"
            columns: ["owner_curator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_source_protocol_id_fkey"
            columns: ["source_protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          subdomain: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subdomain: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subdomain?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      audit_action:
        | "create"
        | "update"
        | "delete_node"
        | "publish"
        | "archive"
        | "fork"
        | "view"
      edge_style: "normal" | "urgente" | "condicional"
      node_type:
        | "ponto_atencao"
        | "decisao"
        | "conduta_intermediaria"
        | "conduta_terminal"
        | "encaminhamento"
        | "calculadora"
      protocol_status: "draft" | "published" | "archived"
      protocol_type:
        | "linha_cuidado"
        | "pcdt"
        | "encaminhamento"
        | "pop"
        | "diretriz"
      usage_action: "open_protocol" | "click_node" | "search" | "complete_flow"
      user_role: "admin" | "gestor" | "curador" | "publicador" | "profissional"
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
      audit_action: [
        "create",
        "update",
        "delete_node",
        "publish",
        "archive",
        "fork",
        "view",
      ],
      edge_style: ["normal", "urgente", "condicional"],
      node_type: [
        "ponto_atencao",
        "decisao",
        "conduta_intermediaria",
        "conduta_terminal",
        "encaminhamento",
        "calculadora",
      ],
      protocol_status: ["draft", "published", "archived"],
      protocol_type: [
        "linha_cuidado",
        "pcdt",
        "encaminhamento",
        "pop",
        "diretriz",
      ],
      usage_action: ["open_protocol", "click_node", "search", "complete_flow"],
      user_role: ["admin", "gestor", "curador", "publicador", "profissional"],
    },
  },
} as const
