export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      crew_members: {
        Row: {
          crew_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          crew_id: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          crew_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey";
            columns: ["crew_id"];
            isOneToOne: false;
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crew_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crews: {
        Row: {
          created_at: string;
          id: string;
          invite_code: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          invite_code?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crews_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          nickname: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          nickname: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nickname?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      run_details: {
        Row: {
          distance_meters: number;
          duration_seconds: number;
          workout_id: string;
        };
        ComputedFields: never;
        Insert: {
          distance_meters: number;
          duration_seconds: number;
          workout_id: string;
        };
        Update: {
          distance_meters?: number;
          duration_seconds?: number;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "run_details_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: true;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      strength_sets: {
        Row: {
          exercise_name: string;
          exercise_order: number;
          id: string;
          reps: number;
          set_order: number;
          weight_kg: number | null;
          workout_id: string;
        };
        ComputedFields: never;
        Insert: {
          exercise_name: string;
          exercise_order: number;
          id?: string;
          reps: number;
          set_order: number;
          weight_kg?: number | null;
          workout_id: string;
        };
        Update: {
          exercise_name?: string;
          exercise_order?: number;
          id?: string;
          reps?: number;
          set_order?: number;
          weight_kg?: number | null;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "strength_sets_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          user_id: string;
          workout_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          user_id?: string;
          workout_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_comments_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_companions: {
        Row: {
          user_id: string;
          workout_id: string;
        };
        ComputedFields: never;
        Insert: {
          user_id: string;
          workout_id: string;
        };
        Update: {
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_companions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_companions_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workouts: {
        Row: {
          created_at: string;
          crew_id: string | null;
          duration_seconds: number | null;
          id: string;
          kind: string;
          memo: string | null;
          place_name: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
          workout_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          crew_id?: string | null;
          duration_seconds?: number | null;
          id?: string;
          kind: string;
          memo?: string | null;
          place_name?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          workout_date: string;
        };
        Update: {
          created_at?: string;
          crew_id?: string | null;
          duration_seconds?: number | null;
          id?: string;
          kind?: string;
          memo?: string | null;
          place_name?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          workout_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_crew_id_fkey";
            columns: ["crew_id"];
            isOneToOne: false;
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_crew: {
        Args: { p_name: string };
        Returns: {
          created_at: string;
          id: string;
          invite_code: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "crews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_running_monthly_distance: {
        Args: { p_months?: number; p_today: string };
        Returns: {
          distance_meters: number;
          month: string;
          run_count: number;
        }[];
      };
      get_running_records: {
        Args: { p_today: string };
        Returns: {
          distance_meters: number;
          duration_seconds: number;
          record_type: string;
          workout_date: string;
          workout_id: string;
        }[];
      };
      get_workout_streak: { Args: { p_today: string }; Returns: number };
      join_crew_by_code: {
        Args: { p_invite_code: string };
        Returns: {
          created_at: string;
          id: string;
          invite_code: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "crews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      list_workouts: {
        Args: {
          p_crew_id?: string;
          p_cursor_created_at?: string;
          p_cursor_date?: string;
          p_cursor_id?: string;
          p_from?: string;
          p_kind?: string;
          p_to?: string;
        };
        Returns: {
          created_at: string;
          crew_id: string | null;
          duration_seconds: number | null;
          id: string;
          kind: string;
          memo: string | null;
          place_name: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
          workout_date: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "workouts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_workout: { Args: { p_input: Json }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
