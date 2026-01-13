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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          remaining_units: number
          total_cost_brl: number
          total_units: number
          unit_cost_brl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          remaining_units: number
          total_cost_brl: number
          total_units: number
          unit_cost_brl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          remaining_units?: number
          total_cost_brl?: number
          total_units?: number
          unit_cost_brl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_lots: {
        Row: {
          cost_pending_tax: boolean
          created_at: string
          id: string
          purchase_item_id: string
          purchase_order_id: string
          qty_received: number
          qty_remaining: number
          received_at: string
          unit_cost_brl: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          cost_pending_tax?: boolean
          created_at?: string
          id?: string
          purchase_item_id: string
          purchase_order_id: string
          qty_received: number
          qty_remaining: number
          received_at?: string
          unit_cost_brl: number
          updated_at?: string
          user_id: string
          variant_id: string
        }
        Update: {
          cost_pending_tax?: boolean
          created_at?: string
          id?: string
          purchase_item_id?: string
          purchase_order_id?: string
          qty_received?: number
          qty_remaining?: number
          received_at?: string
          unit_cost_brl?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: []
      }
      payment_fees: {
        Row: {
          created_at: string
          fee_fixed_brl: number
          fee_percent: number
          id: string
          installments: number | null
          payment_method: string
          payment_method_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_fixed_brl?: number
          fee_percent?: number
          id?: string
          installments?: number | null
          payment_method: string
          payment_method_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_fixed_brl?: number
          fee_percent?: number
          id?: string
          installments?: number | null
          payment_method?: string
          payment_method_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_fees_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          product_id: string
          size: string | null
          uniform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          size?: string | null
          uniform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          size?: string | null
          uniform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          country: string | null
          created_at: string
          id: string
          label: string
          season: string | null
          team: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          label: string
          season?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          label?: string
          season?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          purchase_order_id: string
          qty: number
          unit_cost_currency: string
          unit_cost_value: number
          updated_at: string
          usd_to_brl_rate: number | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_order_id: string
          qty: number
          unit_cost_currency?: string
          unit_cost_value: number
          updated_at?: string
          usd_to_brl_rate?: number | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          purchase_order_id?: string
          qty?: number
          unit_cost_currency?: string
          unit_cost_value?: number
          updated_at?: string
          usd_to_brl_rate?: number | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          arrival_tax_brl: number | null
          created_at: string
          extra_fees_brl: number
          freight_brl: number
          id: string
          notes: string | null
          order_date: string
          shipping_mode: string | null
          source: string
          status: string
          stock_posted: boolean
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_tax_brl?: number | null
          created_at?: string
          extra_fees_brl?: number
          freight_brl?: number
          id?: string
          notes?: string | null
          order_date?: string
          shipping_mode?: string | null
          source: string
          status?: string
          stock_posted?: boolean
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_tax_brl?: number | null
          created_at?: string
          extra_fees_brl?: number
          freight_brl?: number
          id?: string
          notes?: string | null
          order_date?: string
          shipping_mode?: string | null
          source?: string
          status?: string
          stock_posted?: boolean
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_fixed_costs: {
        Row: {
          created_at: string
          fixed_cost_id: string
          id: string
          sale_id: string
          unit_cost_applied: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fixed_cost_id: string
          id?: string
          sale_id: string
          unit_cost_applied: number
          user_id: string
        }
        Update: {
          created_at?: string
          fixed_cost_id?: string
          id?: string
          sale_id?: string
          unit_cost_applied?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_fixed_costs_fixed_cost_id_fkey"
            columns: ["fixed_cost_id"]
            isOneToOne: false
            referencedRelation: "fixed_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_fixed_costs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_item_lots: {
        Row: {
          created_at: string
          id: string
          inventory_lot_id: string
          qty_consumed: number
          sale_item_id: string
          unit_cost_brl: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_lot_id: string
          qty_consumed: number
          sale_item_id: string
          unit_cost_brl: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_lot_id?: string
          qty_consumed?: number
          sale_item_id?: string
          unit_cost_brl?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_lots_inventory_lot_id_fkey"
            columns: ["inventory_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_lots_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_label_snapshot: string
          qty: number
          sale_id: string
          size_snapshot: string | null
          uniform_snapshot: string | null
          unit_price_brl: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_label_snapshot: string
          qty: number
          sale_id: string
          size_snapshot?: string | null
          uniform_snapshot?: string | null
          unit_price_brl: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_label_snapshot?: string
          qty?: number
          sale_id?: string
          size_snapshot?: string | null
          uniform_snapshot?: string | null
          unit_price_brl?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: string | null
          cogs_pending: boolean
          created_at: string
          customer_id: string | null
          discount_percent: number
          discount_value_brl: number
          fees_brl: number
          fixed_costs_brl: number | null
          gross_after_discount_brl: number | null
          gross_brl: number
          id: string
          installments: number | null
          is_preorder: boolean
          margin_percent: number | null
          net_profit_brl: number | null
          notes: string | null
          payment_method: string
          payment_method_id: string | null
          product_costs_brl: number | null
          sale_date: string
          sales_channel_id: string | null
          shipping_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          cogs_pending?: boolean
          created_at?: string
          customer_id?: string | null
          discount_percent?: number
          discount_value_brl?: number
          fees_brl?: number
          fixed_costs_brl?: number | null
          gross_after_discount_brl?: number | null
          gross_brl: number
          id?: string
          installments?: number | null
          is_preorder?: boolean
          margin_percent?: number | null
          net_profit_brl?: number | null
          notes?: string | null
          payment_method: string
          payment_method_id?: string | null
          product_costs_brl?: number | null
          sale_date?: string
          sales_channel_id?: string | null
          shipping_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          cogs_pending?: boolean
          created_at?: string
          customer_id?: string | null
          discount_percent?: number
          discount_value_brl?: number
          fees_brl?: number
          fixed_costs_brl?: number | null
          gross_after_discount_brl?: number | null
          gross_brl?: number
          id?: string
          installments?: number | null
          is_preorder?: boolean
          margin_percent?: number | null
          net_profit_brl?: number | null
          notes?: string | null
          payment_method?: string
          payment_method_id?: string | null
          product_costs_brl?: number | null
          sale_date?: string
          sales_channel_id?: string | null
          shipping_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sales_channel_id_fkey"
            columns: ["sales_channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_date: string
          qty: number
          ref_id: string | null
          ref_type: string | null
          type: string
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_date?: string
          qty: number
          ref_id?: string | null
          ref_type?: string | null
          type: string
          user_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_date?: string
          qty?: number
          ref_id?: string | null
          ref_type?: string | null
          type?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          league: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          league?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          league?: string | null
          name?: string
          user_id?: string | null
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
