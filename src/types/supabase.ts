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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_inventory: {
        Row: {
          created_at: string
          date: string
          id: string
          placement: string
          reserved_slots: number
          total_slots: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          placement: string
          reserved_slots?: number
          total_slots?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          placement?: string
          reserved_slots?: number
          total_slots?: number
        }
        Relationships: []
      }
      ad_inventory_caps: {
        Row: {
          active: boolean
          daily_slots: number
          description: string | null
          id: string
          placement: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          daily_slots?: number
          description?: string | null
          id?: string
          placement: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          daily_slots?: number
          description?: string | null
          id?: string
          placement?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_marketing_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          type?: string
        }
        Relationships: []
      }
      admin_team: {
        Row: {
          active: boolean
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          permissions?: Json
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_team_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          brand_values: string[]
          categories: string[]
          certifications: string[]
          channels: string[]
          country: string
          created_at: string
          description: string | null
          email: string
          export_countries: string[]
          facebook: string
          founding_year: number | null
          gallery: string[]
          id: string
          initials: string | null
          instagram: string
          is_active: boolean
          is_featured: boolean
          is_verified: boolean
          keywords: string
          linkedin: string
          logo_url: string | null
          meta_desc: string
          meta_title: string
          moq: string
          name: string
          payment_conditions: string
          phone: string
          price_segment: string
          primary_color: string
          tagline: string | null
          target_market: string
          tiktok: string
          video_url: string
          visibility: string
          website: string
          youtube: string
        }
        Insert: {
          brand_values?: string[]
          categories?: string[]
          certifications?: string[]
          channels?: string[]
          country?: string
          created_at?: string
          description?: string | null
          email?: string
          export_countries?: string[]
          facebook?: string
          founding_year?: number | null
          gallery?: string[]
          id?: string
          initials?: string | null
          instagram?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          keywords?: string
          linkedin?: string
          logo_url?: string | null
          meta_desc?: string
          meta_title?: string
          moq?: string
          name: string
          payment_conditions?: string
          phone?: string
          price_segment?: string
          primary_color?: string
          tagline?: string | null
          target_market?: string
          tiktok?: string
          video_url?: string
          visibility?: string
          website?: string
          youtube?: string
        }
        Update: {
          brand_values?: string[]
          categories?: string[]
          certifications?: string[]
          channels?: string[]
          country?: string
          created_at?: string
          description?: string | null
          email?: string
          export_countries?: string[]
          facebook?: string
          founding_year?: number | null
          gallery?: string[]
          id?: string
          initials?: string | null
          instagram?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          keywords?: string
          linkedin?: string
          logo_url?: string | null
          meta_desc?: string
          meta_title?: string
          moq?: string
          name?: string
          payment_conditions?: string
          phone?: string
          price_segment?: string
          primary_color?: string
          tagline?: string | null
          target_market?: string
          tiktok?: string
          video_url?: string
          visibility?: string
          website?: string
          youtube?: string
        }
        Relationships: []
      }
      business_categories: {
        Row: {
          active: boolean
          actor_type: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          actor_type: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          actor_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      buyer_delivery_addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          organisation_id: string
          phone: string
          region: string
          street: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label: string
          organisation_id: string
          phone?: string
          region?: string
          street: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          organisation_id?: string
          phone?: string
          region?: string
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_delivery_addresses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contact_referent: string | null
          created_at: string
          credit_limit: number | null
          default_payment_terms: string | null
          delivery_zone: string | null
          interest_categories: string[] | null
          organisation_id: string
          phone_secondary: string | null
          points_of_sale: number | null
          store_surface_m2: number | null
          website: string | null
          years_active: number | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contact_referent?: string | null
          created_at?: string
          credit_limit?: number | null
          default_payment_terms?: string | null
          delivery_zone?: string | null
          interest_categories?: string[] | null
          organisation_id: string
          phone_secondary?: string | null
          points_of_sale?: number | null
          store_surface_m2?: number | null
          website?: string | null
          years_active?: number | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contact_referent?: string | null
          created_at?: string
          credit_limit?: number | null
          default_payment_terms?: string | null
          delivery_zone?: string | null
          interest_categories?: string[] | null
          organisation_id?: string
          phone_secondary?: string | null
          points_of_sale?: number | null
          store_surface_m2?: number | null
          website?: string | null
          years_active?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_subscriptions: {
        Row: {
          campaigns_used_this_month: number
          created_at: string
          end_date: string | null
          id: string
          loyalty_points: number
          requests_used_this_month: number
          rfq_used_this_month: number
          samples_used_this_month: number
          start_date: string
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaigns_used_this_month?: number
          created_at?: string
          end_date?: string | null
          id?: string
          loyalty_points?: number
          requests_used_this_month?: number
          rfq_used_this_month?: number
          samples_used_this_month?: number
          start_date?: string
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaigns_used_this_month?: number
          created_at?: string
          end_date?: string | null
          id?: string
          loyalty_points?: number
          requests_used_this_month?: number
          rfq_used_this_month?: number
          samples_used_this_month?: number
          start_date?: string
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget_credits: number
          cancellation_reason: string | null
          clicks: number
          created_at: string
          daily_credits: number | null
          end_date: string | null
          id: string
          impressions: number
          metadata: Json
          name: string
          orders_attributed: number
          placement: string
          scope_type: string | null
          scope_value: string | null
          seller_id: string
          spent_credits: number
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          budget_credits?: number
          cancellation_reason?: string | null
          clicks?: number
          created_at?: string
          daily_credits?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          metadata?: Json
          name?: string
          orders_attributed?: number
          placement?: string
          scope_type?: string | null
          scope_value?: string | null
          seller_id: string
          spent_credits?: number
          start_date?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          budget_credits?: number
          cancellation_reason?: string | null
          clicks?: number
          created_at?: string
          daily_credits?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          metadata?: Json
          name?: string
          orders_attributed?: number
          placement?: string
          scope_type?: string | null
          scope_value?: string | null
          seller_id?: string
          spent_credits?: number
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          active: boolean
          avg_days: number
          cold_chain: boolean
          created_at: string
          driver_name: string | null
          id: string
          name: string
          phone: string | null
          price_per_kg: number
          regions: string[]
          type: string
          urgent: boolean
          vehicle: string | null
        }
        Insert: {
          active?: boolean
          avg_days?: number
          cold_chain?: boolean
          created_at?: string
          driver_name?: string | null
          id?: string
          name: string
          phone?: string | null
          price_per_kg?: number
          regions?: string[]
          type?: string
          urgent?: boolean
          vehicle?: string | null
        }
        Update: {
          active?: boolean
          avg_days?: number
          cold_chain?: boolean
          created_at?: string
          driver_name?: string | null
          id?: string
          name?: string
          phone?: string | null
          price_per_kg?: number
          regions?: string[]
          type?: string
          urgent?: boolean
          vehicle?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          promotion_id: string | null
          quantity: number
          unit_price_computed: number | null
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          promotion_id?: string | null
          quantity?: number
          unit_price_computed?: number | null
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          promotion_id?: string | null
          quantity?: number
          unit_price_computed?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          buyer_org_id: string
          created_at: string
          id: string
          is_template: boolean
          last_ordered_at: string | null
          name: string | null
          order_count: number
          promo_code_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_org_id: string
          created_at?: string
          id?: string
          is_template?: boolean
          last_ordered_at?: string | null
          name?: string | null
          order_count?: number
          promo_code_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_org_id?: string
          created_at?: string
          id?: string
          is_template?: boolean
          last_ordered_at?: string | null
          name?: string | null
          order_count?: number
          promo_code_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          name_i18n: Json | null
          parent_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_i18n?: Json | null
          parent_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_i18n?: Json | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          display_order: number
          id: string
          image_url: string | null
          subtitle: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_costs: {
        Row: {
          action_type: string
          credits_per_unit: number
          description: string | null
          id: string
          unit: string
          updated_at: string
        }
        Insert: {
          action_type: string
          credits_per_unit: number
          description?: string | null
          id?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          credits_per_unit?: number
          description?: string | null
          id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          active: boolean
          bonus_credits: number
          created_at: string
          credits: number
          currency: string
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          bonus_credits?: number
          created_at?: string
          credits: number
          currency?: string
          id?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean
          bonus_credits?: number
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      credit_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          id: string
          monthly_credits: number
          monthly_price: number
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          monthly_credits: number
          monthly_price: number
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          monthly_credits?: number
          monthly_price?: number
          name?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          buyer_org_id: string
          created_at: string
          currency: string
          id: string
          order_id: string | null
          reason: string | null
          seller_org_id: string
          used: boolean
        }
        Insert: {
          amount: number
          buyer_org_id: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          seller_org_id: string
          used?: boolean
        }
        Update: {
          amount?: number
          buyer_org_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          seller_org_id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "credits_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_rules: {
        Row: {
          active: boolean
          campaign_id: string | null
          created_at: string
          credits_bid: number | null
          id: string
          recommended_product_id: string
          rule_type: string
          seller_paid: boolean
          trigger_category_id: string | null
          trigger_product_id: string | null
        }
        Insert: {
          active?: boolean
          campaign_id?: string | null
          created_at?: string
          credits_bid?: number | null
          id?: string
          recommended_product_id: string
          rule_type?: string
          seller_paid?: boolean
          trigger_category_id?: string | null
          trigger_product_id?: string | null
        }
        Update: {
          active?: boolean
          campaign_id?: string | null
          created_at?: string
          credits_bid?: number | null
          id?: string
          recommended_product_id?: string
          rule_type?: string
          seller_paid?: boolean
          trigger_category_id?: string | null
          trigger_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_rules_recommended_product_id_fkey"
            columns: ["recommended_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_rules_trigger_category_id_fkey"
            columns: ["trigger_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_rules_trigger_product_id_fkey"
            columns: ["trigger_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_capabilities: {
        Row: {
          ambient: boolean
          cold_chain: boolean
          created_at: string
          fragile: boolean
          frozen: boolean
          last_mile: boolean
          max_volume_m3: number | null
          max_weight_kg: number | null
          organisation_id: string
        }
        Insert: {
          ambient?: boolean
          cold_chain?: boolean
          created_at?: string
          fragile?: boolean
          frozen?: boolean
          last_mile?: boolean
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          organisation_id: string
        }
        Update: {
          ambient?: boolean
          cold_chain?: boolean
          created_at?: string
          fragile?: boolean
          frozen?: boolean
          last_mile?: boolean
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_capabilities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_profiles: {
        Row: {
          avg_rating: number | null
          base_rate: number | null
          created_at: string
          delivery_type: string
          fleet_size: number | null
          organisation_id: string
          parent_org_id: string | null
          phone: string | null
          rejection_reason: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          validation_status: string
          vehicle_types: string[] | null
        }
        Insert: {
          avg_rating?: number | null
          base_rate?: number | null
          created_at?: string
          delivery_type?: string
          fleet_size?: number | null
          organisation_id: string
          parent_org_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          validation_status?: string
          vehicle_types?: string[] | null
        }
        Update: {
          avg_rating?: number | null
          base_rate?: number | null
          created_at?: string
          delivery_type?: string
          fleet_size?: number | null
          organisation_id?: string
          parent_org_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          validation_status?: string
          vehicle_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_profiles_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_reviews: {
        Row: {
          comment: string | null
          created_at: string
          delivery_org_id: string
          id: string
          rating_communication: number | null
          rating_global: number
          rating_punctuality: number | null
          ticket_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_org_id: string
          id?: string
          rating_communication?: number | null
          rating_global: number
          rating_punctuality?: number | null
          ticket_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_org_id?: string
          id?: string
          rating_communication?: number | null
          rating_global?: number
          rating_punctuality?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_reviews_delivery_org_id_fkey"
            columns: ["delivery_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_reviews_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "delivery_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tickets: {
        Row: {
          accepted_price: number | null
          assigned_at: string | null
          assigned_delivery_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          delivery_address: Json
          id: string
          insured: boolean
          insured_value: number | null
          order_id: string | null
          parcel_details: Json | null
          pickup_address: Json
          priority: string
          proof_url: string | null
          proposed_price: number | null
          requester_org_id: string
          status: string
          ticket_number: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          accepted_price?: number | null
          assigned_at?: string | null
          assigned_delivery_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          delivery_address?: Json
          id?: string
          insured?: boolean
          insured_value?: number | null
          order_id?: string | null
          parcel_details?: Json | null
          pickup_address?: Json
          priority?: string
          proof_url?: string | null
          proposed_price?: number | null
          requester_org_id: string
          status?: string
          ticket_number: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          accepted_price?: number | null
          assigned_at?: string | null
          assigned_delivery_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delivery_address?: Json
          id?: string
          insured?: boolean
          insured_value?: number | null
          order_id?: string | null
          parcel_details?: Json | null
          pickup_address?: Json
          priority?: string
          proof_url?: string | null
          proposed_price?: number | null
          requester_org_id?: string
          status?: string
          ticket_number?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tickets_assigned_delivery_id_fkey"
            columns: ["assigned_delivery_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tickets_requester_org_id_fkey"
            columns: ["requester_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_validation_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          organisation_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organisation_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organisation_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_validation_audit_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          id: string
          lead_days_max: number | null
          lead_days_min: number | null
          organisation_id: string
          postal_codes: string[] | null
          region: string | null
          surcharge: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_days_max?: number | null
          lead_days_min?: number | null
          organisation_id: string
          postal_codes?: string[] | null
          region?: string | null
          surcharge?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_days_max?: number | null
          lead_days_min?: number | null
          organisation_id?: string
          postal_codes?: string[] | null
          region?: string | null
          surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_resolution_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          label: string
          verdict: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          label: string
          verdict: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          label?: string
          verdict?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          attachments: string[] | null
          buyer_description: string | null
          closed_at: string | null
          credit_id: string | null
          dispute_type: string
          id: string
          opened_at: string
          order_id: string
          refund_amount: number | null
          resolution: string | null
          seller_response: string | null
          status: string
          verdict: string | null
        }
        Insert: {
          attachments?: string[] | null
          buyer_description?: string | null
          closed_at?: string | null
          credit_id?: string | null
          dispute_type: string
          id?: string
          opened_at?: string
          order_id: string
          refund_amount?: number | null
          resolution?: string | null
          seller_response?: string | null
          status?: string
          verdict?: string | null
        }
        Update: {
          attachments?: string[] | null
          buyer_description?: string | null
          closed_at?: string | null
          credit_id?: string | null
          dispute_type?: string
          id?: string
          opened_at?: string
          order_id?: string
          refund_amount?: number | null
          resolution?: string | null
          seller_response?: string | null
          status?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ean_references: {
        Row: {
          allergens: string[]
          brand_id: string | null
          category_id: string | null
          certifications: string[]
          created_at: string
          created_by_org_id: string | null
          ean: string
          hs_code: string | null
          id: string
          images: string[]
          manufacturer_name: string | null
          name: string
          net_weight: number | null
          nutri_score: string | null
          origin_country: string | null
          pack_size: number | null
          packaging_type: string | null
          physical_form: string | null
          shelf_life_days: number | null
          short_description: string | null
          source: string
          status: string
          temperature: string
          updated_at: string
          weight_unit: string | null
        }
        Insert: {
          allergens?: string[]
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[]
          created_at?: string
          created_by_org_id?: string | null
          ean: string
          hs_code?: string | null
          id?: string
          images?: string[]
          manufacturer_name?: string | null
          name: string
          net_weight?: number | null
          nutri_score?: string | null
          origin_country?: string | null
          pack_size?: number | null
          packaging_type?: string | null
          physical_form?: string | null
          shelf_life_days?: number | null
          short_description?: string | null
          source?: string
          status?: string
          temperature?: string
          updated_at?: string
          weight_unit?: string | null
        }
        Update: {
          allergens?: string[]
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[]
          created_at?: string
          created_by_org_id?: string | null
          ean?: string
          hs_code?: string | null
          id?: string
          images?: string[]
          manufacturer_name?: string | null
          name?: string
          net_weight?: number | null
          nutri_score?: string | null
          origin_country?: string | null
          pack_size?: number | null
          packaging_type?: string | null
          physical_form?: string | null
          shelf_life_days?: number | null
          short_description?: string | null
          source?: string
          status?: string
          temperature?: string
          updated_at?: string
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ean_references_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ean_references_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ean_references_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_content: {
        Row: {
          content: string | null
          id: string
          lang: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          lang?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          lang?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_ht: number
          amount_paid: number
          amount_tax: number
          amount_ttc: number
          created_at: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          pdf_url: string | null
          status: string
        }
        Insert: {
          amount_ht: number
          amount_paid?: number
          amount_tax?: number
          amount_ttc: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          order_id: string
          pdf_url?: string | null
          status?: string
        }
        Update: {
          amount_ht?: number
          amount_paid?: number
          amount_tax?: number
          amount_ttc?: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          pdf_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidation_bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string
          id: string
          is_winning: boolean
          lot_id: string
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string
          id?: string
          is_winning?: boolean
          lot_id: string
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          is_winning?: boolean
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidation_bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidation_bids_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "liquidation_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidation_lots: {
        Row: {
          auction_end_at: string | null
          bid_count: number
          buy_now_price: number | null
          campaign_id: string | null
          created_at: string
          currency: string
          current_bid: number | null
          description: string | null
          id: string
          images: string[] | null
          platform_fee_pct: number
          product_ids: string[] | null
          quantity: number
          reserve_price: number | null
          sale_type: string
          scope: string
          seller_id: string
          start_price: number | null
          status: string
          title: string
          updated_at: string
          winner_buyer_id: string | null
        }
        Insert: {
          auction_end_at?: string | null
          bid_count?: number
          buy_now_price?: number | null
          campaign_id?: string | null
          created_at?: string
          currency?: string
          current_bid?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          platform_fee_pct?: number
          product_ids?: string[] | null
          quantity?: number
          reserve_price?: number | null
          sale_type?: string
          scope?: string
          seller_id: string
          start_price?: number | null
          status?: string
          title: string
          updated_at?: string
          winner_buyer_id?: string | null
        }
        Update: {
          auction_end_at?: string | null
          bid_count?: number
          buy_now_price?: number | null
          campaign_id?: string | null
          created_at?: string
          currency?: string
          current_bid?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          platform_fee_pct?: number
          product_ids?: string[] | null
          quantity?: number
          reserve_price?: number | null
          sale_type?: string
          scope?: string
          seller_id?: string
          start_price?: number | null
          status?: string
          title?: string
          updated_at?: string
          winner_buyer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidation_lots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidation_lots_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidation_lots_winner_buyer_id_fkey"
            columns: ["winner_buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number | null
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_config: {
        Row: {
          buyer_points_per_dollar: number
          default_platform_fee_pct: number
          flash_sale_request_threshold: number
          id: string
          inventory_alert_pct: number
          max_campaign_duration_days: number
          min_campaign_duration_days: number
          promotion_stacking_allowed: boolean
          seller_low_credits_pct: number
          updated_at: string
        }
        Insert: {
          buyer_points_per_dollar?: number
          default_platform_fee_pct?: number
          flash_sale_request_threshold?: number
          id?: string
          inventory_alert_pct?: number
          max_campaign_duration_days?: number
          min_campaign_duration_days?: number
          promotion_stacking_allowed?: boolean
          seller_low_credits_pct?: number
          updated_at?: string
        }
        Update: {
          buyer_points_per_dollar?: number
          default_platform_fee_pct?: number
          flash_sale_request_threshold?: number
          id?: string
          inventory_alert_pct?: number
          max_campaign_duration_days?: number
          min_campaign_duration_days?: number
          promotion_stacking_allowed?: boolean
          seller_low_credits_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      mission_expenses: {
        Row: {
          amount_ht: number
          created_at: string
          created_by: string | null
          delivery_ticket_id: string
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          receipt_ref: string | null
          tva_rate: number
        }
        Insert: {
          amount_ht?: number
          created_at?: string
          created_by?: string | null
          delivery_ticket_id: string
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          receipt_ref?: string | null
          tva_rate?: number
        }
        Update: {
          amount_ht?: number
          created_at?: string
          created_by?: string | null
          delivery_ticket_id?: string
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          receipt_ref?: string | null
          tva_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "mission_expenses_delivery_ticket_id_fkey"
            columns: ["delivery_ticket_id"]
            isOneToOne: false
            referencedRelation: "delivery_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_documents: {
        Row: {
          admin_notes: string | null
          document_label: string
          document_type: string
          file_name: string | null
          file_url: string | null
          id: string
          organisation_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          uploaded_at: string
        }
        Insert: {
          admin_notes?: string | null
          document_label: string
          document_type: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          organisation_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
        }
        Update: {
          admin_notes?: string | null
          document_label?: string
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          organisation_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string
          id: string
          line_total_ht: number
          order_id: string
          product_id: string
          product_name_snap: string
          quantity: number
          unit_price_ht: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_ht: number
          order_id: string
          product_id: string
          product_name_snap: string
          quantity: number
          unit_price_ht: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total_ht?: number
          order_id?: string
          product_id?: string
          product_name_snap?: string
          quantity?: number
          unit_price_ht?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          approved_at: string | null
          buyer_org_id: string
          created_at: string
          id: string
          notes: string | null
          order_id: string
          reason: string
          received_at: string | null
          refund_type: string
          requested_at: string
          return_number: string
          seller_org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          buyer_org_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          reason?: string
          received_at?: string | null
          refund_type?: string
          requested_at?: string
          return_number: string
          seller_org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          buyer_org_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          reason?: string
          received_at?: string | null
          refund_type?: string
          requested_at?: string
          return_number?: string
          seller_org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          buyer_org_id: string
          carrier_org_id: string | null
          cart_id: string | null
          created_at: string
          currency: string
          delivery_address: Json | null
          delivery_fee_mad: number
          delivery_method: string
          delivery_preference: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_terms: string | null
          quote_id: string | null
          seller_org_id: string
          status: string
          total_ht: number
          total_taxes: number
          total_ttc: number
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          buyer_org_id: string
          carrier_org_id?: string | null
          cart_id?: string | null
          created_at?: string
          currency?: string
          delivery_address?: Json | null
          delivery_fee_mad?: number
          delivery_method?: string
          delivery_preference?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_org_id: string
          status?: string
          total_ht?: number
          total_taxes?: number
          total_ttc?: number
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          buyer_org_id?: string
          carrier_org_id?: string | null
          cart_id?: string | null
          created_at?: string
          currency?: string
          delivery_address?: Json | null
          delivery_fee_mad?: number
          delivery_method?: string
          delivery_preference?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_org_id?: string
          status?: string
          total_ht?: number
          total_taxes?: number
          total_ttc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_carrier_org_id_fkey"
            columns: ["carrier_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subtypes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_type?: string
        }
        Relationships: []
      }
      organisation_members: {
        Row: {
          active: boolean
          id: string
          joined_at: string
          organisation_id: string
          team_role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          joined_at?: string
          organisation_id: string
          team_role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          joined_at?: string
          organisation_id?: string
          team_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          cnss: string | null
          country: string
          created_at: string
          ice: string | null
          id: string
          name: string
          org_type: string
          patente: string | null
          phone: string | null
          postal_code: string | null
          rc: string | null
          region: string | null
          siret: string | null
          sub_type: string | null
          validation_status: string
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          cnss?: string | null
          country?: string
          created_at?: string
          ice?: string | null
          id?: string
          name: string
          org_type: string
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          rc?: string | null
          region?: string | null
          siret?: string | null
          sub_type?: string | null
          validation_status?: string
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          cnss?: string | null
          country?: string
          created_at?: string
          ice?: string | null
          id?: string
          name?: string
          org_type?: string
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          rc?: string | null
          region?: string | null
          siret?: string | null
          sub_type?: string | null
          validation_status?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          external_ref: string | null
          id: string
          invoice_id: string
          paid_at: string
          payment_method: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_ref?: string | null
          id?: string
          invoice_id: string
          paid_at?: string
          payment_method?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_ref?: string | null
          id?: string
          invoice_id?: string
          paid_at?: string
          payment_method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          audit_logs_enabled: boolean
          audit_retention_days: number
          available_languages: string[] | null
          bank_bic: string | null
          bank_iban: string | null
          buyer_manual_validation: boolean
          buyer_max_active_quotes: number
          buyer_min_order_for_tiers: number
          cart_ttl_days: number | null
          commission_negotiated_pct: number
          created_at: string
          default_currency: string
          default_language: string
          default_payment_terms: number
          delivery_default_days: number
          delivery_default_fee: number
          delivery_free_from: number
          delivery_validation_days: number
          global_moq: number
          id: string
          intraeu_vat_enabled: boolean
          invoice_footer: string | null
          invoice_prefix: string
          maintenance_mode: boolean
          min_order_amount: number
          notif_admin_email: string | null
          notif_alert_disputes: boolean
          notif_alert_registrations: boolean
          notif_push_enabled: boolean
          notif_support_email: string | null
          notif_weekly_report: boolean
          payment_methods: string[] | null
          platform_commission_pct: number
          platform_name: string
          platform_tagline: string | null
          public_url: string | null
          quote_validity_days: number
          security_2fa_required: boolean
          security_lockout_minutes: number
          security_max_attempts: number
          security_session_hours: number
          stripe_mode: string
          support_email: string | null
          support_phone: string | null
          updated_at: string
          vat_default_rate: number
          vat_rules: Json | null
          vendor_confirmation_hours: number
          vendor_invoice_day: number
          vendor_manual_validation: boolean
          vendor_max_dispute_pct: number
          vendor_max_products: number
          vendor_min_score: number
          vendor_required_docs: string[] | null
        }
        Insert: {
          audit_logs_enabled?: boolean
          audit_retention_days?: number
          available_languages?: string[] | null
          bank_bic?: string | null
          bank_iban?: string | null
          buyer_manual_validation?: boolean
          buyer_max_active_quotes?: number
          buyer_min_order_for_tiers?: number
          cart_ttl_days?: number | null
          commission_negotiated_pct?: number
          created_at?: string
          default_currency?: string
          default_language?: string
          default_payment_terms?: number
          delivery_default_days?: number
          delivery_default_fee?: number
          delivery_free_from?: number
          delivery_validation_days?: number
          global_moq?: number
          id?: string
          intraeu_vat_enabled?: boolean
          invoice_footer?: string | null
          invoice_prefix?: string
          maintenance_mode?: boolean
          min_order_amount?: number
          notif_admin_email?: string | null
          notif_alert_disputes?: boolean
          notif_alert_registrations?: boolean
          notif_push_enabled?: boolean
          notif_support_email?: string | null
          notif_weekly_report?: boolean
          payment_methods?: string[] | null
          platform_commission_pct?: number
          platform_name?: string
          platform_tagline?: string | null
          public_url?: string | null
          quote_validity_days?: number
          security_2fa_required?: boolean
          security_lockout_minutes?: number
          security_max_attempts?: number
          security_session_hours?: number
          stripe_mode?: string
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          vat_default_rate?: number
          vat_rules?: Json | null
          vendor_confirmation_hours?: number
          vendor_invoice_day?: number
          vendor_manual_validation?: boolean
          vendor_max_dispute_pct?: number
          vendor_max_products?: number
          vendor_min_score?: number
          vendor_required_docs?: string[] | null
        }
        Update: {
          audit_logs_enabled?: boolean
          audit_retention_days?: number
          available_languages?: string[] | null
          bank_bic?: string | null
          bank_iban?: string | null
          buyer_manual_validation?: boolean
          buyer_max_active_quotes?: number
          buyer_min_order_for_tiers?: number
          cart_ttl_days?: number | null
          commission_negotiated_pct?: number
          created_at?: string
          default_currency?: string
          default_language?: string
          default_payment_terms?: number
          delivery_default_days?: number
          delivery_default_fee?: number
          delivery_free_from?: number
          delivery_validation_days?: number
          global_moq?: number
          id?: string
          intraeu_vat_enabled?: boolean
          invoice_footer?: string | null
          invoice_prefix?: string
          maintenance_mode?: boolean
          min_order_amount?: number
          notif_admin_email?: string | null
          notif_alert_disputes?: boolean
          notif_alert_registrations?: boolean
          notif_push_enabled?: boolean
          notif_support_email?: string | null
          notif_weekly_report?: boolean
          payment_methods?: string[] | null
          platform_commission_pct?: number
          platform_name?: string
          platform_tagline?: string | null
          public_url?: string | null
          quote_validity_days?: number
          security_2fa_required?: boolean
          security_lockout_minutes?: number
          security_max_attempts?: number
          security_session_hours?: number
          stripe_mode?: string
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          vat_default_rate?: number
          vat_rules?: Json | null
          vendor_confirmation_hours?: number
          vendor_invoice_day?: number
          vendor_manual_validation?: boolean
          vendor_max_dispute_pct?: number
          vendor_max_products?: number
          vendor_min_score?: number
          vendor_required_docs?: string[] | null
        }
        Relationships: []
      }
      price_tiers: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          qty_min: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          qty_min?: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          qty_min?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_tiers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lots: {
        Row: {
          active: boolean
          created_at: string
          expiry_date: string | null
          id: string
          lot_number: string
          product_id: string
          qty_available: number
          specific_price: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number: string
          product_id: string
          qty_available?: number
          specific_price?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string
          product_id?: string
          qty_available?: number
          specific_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_returns: {
        Row: {
          authorized_at: string | null
          carrier_org_id: string | null
          dispute_id: string | null
          id: string
          order_id: string
          received_at: string | null
          requested_at: string
          return_address: Json | null
          status: string
        }
        Insert: {
          authorized_at?: string | null
          carrier_org_id?: string | null
          dispute_id?: string | null
          id?: string
          order_id: string
          received_at?: string | null
          requested_at?: string
          return_address?: Json | null
          status?: string
        }
        Update: {
          authorized_at?: string | null
          carrier_org_id?: string | null
          dispute_id?: string | null
          id?: string
          order_id?: string
          received_at?: string | null
          requested_at?: string
          return_address?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_carrier_org_id_fkey"
            columns: ["carrier_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_org_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          rating: number
          rating_delivery: number | null
          rating_quality: number | null
          reviewer_name: string | null
          verified: boolean
        }
        Insert: {
          buyer_org_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          rating: number
          rating_delivery?: number | null
          rating_quality?: number | null
          reviewer_name?: string | null
          verified?: boolean
        }
        Update: {
          buyer_org_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          rating?: number
          rating_delivery?: number | null
          rating_quality?: number | null
          reviewer_name?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          dimensions: Json | null
          ean: string | null
          id: string
          image_url: string | null
          name: string
          product_id: string
          stock_qty: number | null
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          ean?: string | null
          id?: string
          image_url?: string | null
          name: string
          product_id: string
          stock_qty?: number | null
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          ean?: string | null
          id?: string
          image_url?: string | null
          name?: string
          product_id?: string
          stock_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          after_opening_days: number | null
          allergens: string[] | null
          avg_rating: number | null
          brand_id: string | null
          category_id: string | null
          certifications: string[] | null
          cold_chain_required: boolean | null
          created_at: string
          currency: string
          delivery_methods: string[] | null
          dimensions_carton: Json | null
          dimensions_pallet: Json | null
          dimensions_unit: Json | null
          distribution_channels: string[] | null
          dlc_type: string | null
          document_urls: Json | null
          ean: string | null
          eco_score: string | null
          estimated_lead_days: number | null
          exclusive_dist: boolean | null
          export_countries: string[] | null
          fifo_required: boolean | null
          fragility_level: string | null
          gross_weight: number | null
          haccp_compliant: boolean | null
          hazard_class: string | null
          hs_code: string | null
          humidity_sensitive: boolean | null
          id: string
          images: string[] | null
          incoterms: string[] | null
          ingredients: string | null
          is_new: boolean
          is_on_promotion: boolean
          is_sponsored: boolean
          light_sensitive: boolean | null
          long_description: string | null
          manufacturer_country: string | null
          manufacturer_name: string | null
          max_shelf_temp: number | null
          min_shelf_temp: number | null
          moq: number
          msds_available: boolean | null
          name: string
          net_weight: number | null
          nutri_score: string | null
          nutritional_info: string | null
          nutritional_values: Json | null
          origin_country: string | null
          pack_size: number | null
          packaging_material: string | null
          packaging_type: string | null
          palettisation: Json | null
          pallet_weight_kg: number | null
          physical_form: string | null
          production_method: string | null
          recyclable: boolean | null
          related_product_ids: string[] | null
          review_count: number | null
          seller_org_id: string
          shelf_life_days: number | null
          short_description: string | null
          stackability_max: number | null
          status: string
          stock_qty: number | null
          supplier_id: string | null
          target_segment: string | null
          temperature: string | null
          territory_allocation: string | null
          traceability_level: string | null
          units_per_inner: number | null
          updated_at: string
          usp: string | null
          value_proposition: string | null
          videos: string[] | null
          volume_cbm_carton: number | null
          weight_unit: string | null
        }
        Insert: {
          after_opening_days?: number | null
          allergens?: string[] | null
          avg_rating?: number | null
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[] | null
          cold_chain_required?: boolean | null
          created_at?: string
          currency?: string
          delivery_methods?: string[] | null
          dimensions_carton?: Json | null
          dimensions_pallet?: Json | null
          dimensions_unit?: Json | null
          distribution_channels?: string[] | null
          dlc_type?: string | null
          document_urls?: Json | null
          ean?: string | null
          eco_score?: string | null
          estimated_lead_days?: number | null
          exclusive_dist?: boolean | null
          export_countries?: string[] | null
          fifo_required?: boolean | null
          fragility_level?: string | null
          gross_weight?: number | null
          haccp_compliant?: boolean | null
          hazard_class?: string | null
          hs_code?: string | null
          humidity_sensitive?: boolean | null
          id?: string
          images?: string[] | null
          incoterms?: string[] | null
          ingredients?: string | null
          is_new?: boolean
          is_on_promotion?: boolean
          is_sponsored?: boolean
          light_sensitive?: boolean | null
          long_description?: string | null
          manufacturer_country?: string | null
          manufacturer_name?: string | null
          max_shelf_temp?: number | null
          min_shelf_temp?: number | null
          moq?: number
          msds_available?: boolean | null
          name: string
          net_weight?: number | null
          nutri_score?: string | null
          nutritional_info?: string | null
          nutritional_values?: Json | null
          origin_country?: string | null
          pack_size?: number | null
          packaging_material?: string | null
          packaging_type?: string | null
          palettisation?: Json | null
          pallet_weight_kg?: number | null
          physical_form?: string | null
          production_method?: string | null
          recyclable?: boolean | null
          related_product_ids?: string[] | null
          review_count?: number | null
          seller_org_id: string
          shelf_life_days?: number | null
          short_description?: string | null
          stackability_max?: number | null
          status?: string
          stock_qty?: number | null
          supplier_id?: string | null
          target_segment?: string | null
          temperature?: string | null
          territory_allocation?: string | null
          traceability_level?: string | null
          units_per_inner?: number | null
          updated_at?: string
          usp?: string | null
          value_proposition?: string | null
          videos?: string[] | null
          volume_cbm_carton?: number | null
          weight_unit?: string | null
        }
        Update: {
          after_opening_days?: number | null
          allergens?: string[] | null
          avg_rating?: number | null
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[] | null
          cold_chain_required?: boolean | null
          created_at?: string
          currency?: string
          delivery_methods?: string[] | null
          dimensions_carton?: Json | null
          dimensions_pallet?: Json | null
          dimensions_unit?: Json | null
          distribution_channels?: string[] | null
          dlc_type?: string | null
          document_urls?: Json | null
          ean?: string | null
          eco_score?: string | null
          estimated_lead_days?: number | null
          exclusive_dist?: boolean | null
          export_countries?: string[] | null
          fifo_required?: boolean | null
          fragility_level?: string | null
          gross_weight?: number | null
          haccp_compliant?: boolean | null
          hazard_class?: string | null
          hs_code?: string | null
          humidity_sensitive?: boolean | null
          id?: string
          images?: string[] | null
          incoterms?: string[] | null
          ingredients?: string | null
          is_new?: boolean
          is_on_promotion?: boolean
          is_sponsored?: boolean
          light_sensitive?: boolean | null
          long_description?: string | null
          manufacturer_country?: string | null
          manufacturer_name?: string | null
          max_shelf_temp?: number | null
          min_shelf_temp?: number | null
          moq?: number
          msds_available?: boolean | null
          name?: string
          net_weight?: number | null
          nutri_score?: string | null
          nutritional_info?: string | null
          nutritional_values?: Json | null
          origin_country?: string | null
          pack_size?: number | null
          packaging_material?: string | null
          packaging_type?: string | null
          palettisation?: Json | null
          pallet_weight_kg?: number | null
          physical_form?: string | null
          production_method?: string | null
          recyclable?: boolean | null
          related_product_ids?: string[] | null
          review_count?: number | null
          seller_org_id?: string
          shelf_life_days?: number | null
          short_description?: string | null
          stackability_max?: number | null
          status?: string
          stock_qty?: number | null
          supplier_id?: string | null
          target_segment?: string | null
          temperature?: string | null
          territory_allocation?: string | null
          traceability_level?: string | null
          units_per_inner?: number | null
          updated_at?: string
          usp?: string | null
          value_proposition?: string | null
          videos?: string[] | null
          volume_cbm_carton?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          gdpr_consent: boolean
          id: string
          is_admin: boolean
          last_seen: string | null
          onboarding_done: boolean
          preferred_currency: string
          preferred_lang: string
          seller_credits_balance: number
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          gdpr_consent?: boolean
          id: string
          is_admin?: boolean
          last_seen?: string | null
          onboarding_done?: boolean
          preferred_currency?: string
          preferred_lang?: string
          seller_credits_balance?: number
        }
        Update: {
          created_at?: string
          full_name?: string | null
          gdpr_consent?: boolean
          id?: string
          is_admin?: boolean
          last_seen?: string | null
          onboarding_done?: boolean
          preferred_currency?: string
          preferred_lang?: string
          seller_credits_balance?: number
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          application: string
          category_id: string | null
          code: string
          created_at: string
          current_uses: number
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number | null
          min_qty: number | null
          product_ids: string[] | null
          promo_type: string
          seller_org_id: string
          starts_at: string | null
          value: number
        }
        Insert: {
          application?: string
          category_id?: string | null
          code: string
          created_at?: string
          current_uses?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          min_qty?: number | null
          product_ids?: string[] | null
          promo_type?: string
          seller_org_id: string
          starts_at?: string | null
          value: number
        }
        Update: {
          application?: string
          category_id?: string | null
          code?: string
          created_at?: string
          current_uses?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          min_qty?: number | null
          product_ids?: string[] | null
          promo_type?: string
          seller_org_id?: string
          starts_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_requests: {
        Row: {
          buyer_id: string
          created_at: string
          desired_discount: number | null
          id: string
          notes: string | null
          product_id: string
          status: string
          type: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          desired_discount?: number | null
          id?: string
          notes?: string | null
          product_id: string
          status?: string
          type: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          desired_discount?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          application: string
          category_id: string | null
          created_at: string
          discount_value: number
          ends_at: string | null
          id: string
          min_qty: number | null
          name: string
          product_ids: string[] | null
          promo_type: string
          seller_org_id: string
          stackable: boolean
          starts_at: string | null
        }
        Insert: {
          active?: boolean
          application?: string
          category_id?: string | null
          created_at?: string
          discount_value: number
          ends_at?: string | null
          id?: string
          min_qty?: number | null
          name: string
          product_ids?: string[] | null
          promo_type?: string
          seller_org_id: string
          stackable?: boolean
          starts_at?: string | null
        }
        Update: {
          active?: boolean
          application?: string
          category_id?: string | null
          created_at?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          min_qty?: number | null
          name?: string
          product_ids?: string[] | null
          promo_type?: string
          seller_org_id?: string
          stackable?: boolean
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          id: string
          product_description: string | null
          product_id: string
          proposed_price: number | null
          quantity: number
          quote_id: string
          requested_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_id: string
          proposed_price?: number | null
          quantity: number
          quote_id: string
          requested_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_id?: string
          proposed_price?: number | null
          quantity?: number
          quote_id?: string
          requested_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_messages: {
        Row: {
          attachment_url: string | null
          id: string
          message: string
          quote_id: string
          sender_id: string
          sent_at: string
        }
        Insert: {
          attachment_url?: string | null
          id?: string
          message: string
          quote_id: string
          sender_id: string
          sent_at?: string
        }
        Update: {
          attachment_url?: string | null
          id?: string
          message?: string
          quote_id?: string
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          buyer_org_id: string
          created_at: string
          desired_delivery_date: string | null
          expires_at: string | null
          id: string
          incoterm: string | null
          loading_port: string | null
          notes: string | null
          order_id: string | null
          quote_number: string
          requested_at: string
          responded_at: string | null
          seller_org_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          buyer_org_id: string
          created_at?: string
          desired_delivery_date?: string | null
          expires_at?: string | null
          id?: string
          incoterm?: string | null
          loading_port?: string | null
          notes?: string | null
          order_id?: string | null
          quote_number: string
          requested_at?: string
          responded_at?: string | null
          seller_org_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          buyer_org_id?: string
          created_at?: string
          desired_delivery_date?: string | null
          expires_at?: string | null
          id?: string
          incoterm?: string | null
          loading_port?: string | null
          notes?: string | null
          order_id?: string | null
          quote_number?: string
          requested_at?: string
          responded_at?: string | null
          seller_org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      return_lines: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty_returned: number
          reason: string | null
          return_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty_returned: number
          reason?: string | null
          return_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty_returned?: number
          reason?: string | null
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "product_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_bids: {
        Row: {
          bid_price: number
          boost_credits_paid: number | null
          created_at: string
          id: string
          is_boosted: boolean
          notes: string | null
          rfq_id: string
          seller_id: string
          status: string
        }
        Insert: {
          bid_price: number
          boost_credits_paid?: number | null
          created_at?: string
          id?: string
          is_boosted?: boolean
          notes?: string | null
          rfq_id: string
          seller_id: string
          status?: string
        }
        Update: {
          bid_price?: number
          boost_credits_paid?: number | null
          created_at?: string
          id?: string
          is_boosted?: boolean
          notes?: string | null
          rfq_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_bids_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_bids_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_posts: {
        Row: {
          boost_expires_at: string | null
          buyer_id: string
          category_id: string | null
          created_at: string
          description: string | null
          desired_price: number | null
          expires_at: string | null
          id: string
          is_boosted: boolean
          product_name: string
          quantity: number
          status: string
        }
        Insert: {
          boost_expires_at?: string | null
          buyer_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          desired_price?: number | null
          expires_at?: string | null
          id?: string
          is_boosted?: boolean
          product_name: string
          quantity: number
          status?: string
        }
        Update: {
          boost_expires_at?: string | null
          buyer_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          desired_price?: number | null
          expires_at?: string | null
          id?: string
          is_boosted?: boolean
          product_name?: string
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_posts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sampling_campaigns: {
        Row: {
          auto_approve: boolean
          campaign_id: string
          created_at: string
          id: string
          max_samples: number
          product_id: string
          sample_price: number
          samples_sent: number
          shipping_cost: number
        }
        Insert: {
          auto_approve?: boolean
          campaign_id: string
          created_at?: string
          id?: string
          max_samples?: number
          product_id: string
          sample_price?: number
          samples_sent?: number
          shipping_cost?: number
        }
        Update: {
          auto_approve?: boolean
          campaign_id?: string
          created_at?: string
          id?: string
          max_samples?: number
          product_id?: string
          sample_price?: number
          samples_sent?: number
          shipping_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sampling_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sampling_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sampling_requests: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          notes: string | null
          sampling_campaign_id: string
          shipping_address: Json | null
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          notes?: string | null
          sampling_campaign_id: string
          shipping_address?: Json | null
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          sampling_campaign_id?: string
          shipping_address?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sampling_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sampling_requests_sampling_campaign_id_fkey"
            columns: ["sampling_campaign_id"]
            isOneToOne: false
            referencedRelation: "sampling_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          alias: string
          city: string | null
          country: string
          created_at: string
          id: string
          is_default_billing: boolean
          is_default_delivery: boolean
          organisation_id: string
          postal_code: string | null
          region: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          alias: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default_billing?: boolean
          is_default_delivery?: boolean
          organisation_id: string
          postal_code?: string | null
          region?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          alias?: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default_billing?: boolean
          is_default_delivery?: boolean
          organisation_id?: string
          postal_code?: string | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_enabled: boolean
          created_at: string
          filters: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_credit_subscriptions: {
        Row: {
          created_at: string
          external_sub_id: string | null
          id: string
          next_renewal_at: string | null
          plan_id: string
          seller_id: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          external_sub_id?: string | null
          id?: string
          next_renewal_at?: string | null
          plan_id: string
          seller_id: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          external_sub_id?: string | null
          id?: string
          next_renewal_at?: string | null
          plan_id?: string
          seller_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_credit_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "credit_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_credit_subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          accepted_payment_terms: string[] | null
          avg_rating: number | null
          bank_bic: string | null
          bank_iban: string | null
          brands_represented: string | null
          certifications: string[] | null
          contact_email: string | null
          contact_phone: string | null
          contact_referent: string | null
          created_at: string
          default_delivery_methods: string[] | null
          default_export_countries: string[] | null
          default_franco_eur: number | null
          default_incoterms: string[] | null
          default_moq: number | null
          default_prep_days: number | null
          delivery_zones: string[] | null
          description: string | null
          exclusive_distribution: boolean
          halal_certified: boolean
          halal_certifying_body: string | null
          iso22000_certified: boolean
          iso9001_certified: boolean
          lot_traceability: boolean
          onssa_approved: boolean
          onssa_number: string | null
          organisation_id: string
          product_categories: string[] | null
          production_capacity: string | null
          review_count: number | null
          shipping_fee_mode: string | null
          shipping_flat_fee: number | null
          shipping_max_fee: number | null
          shipping_min_fee: number | null
          shipping_percentage_rate: number | null
          trade_name: string | null
          website: string | null
          years_active: number | null
        }
        Insert: {
          accepted_payment_terms?: string[] | null
          avg_rating?: number | null
          bank_bic?: string | null
          bank_iban?: string | null
          brands_represented?: string | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_referent?: string | null
          created_at?: string
          default_delivery_methods?: string[] | null
          default_export_countries?: string[] | null
          default_franco_eur?: number | null
          default_incoterms?: string[] | null
          default_moq?: number | null
          default_prep_days?: number | null
          delivery_zones?: string[] | null
          description?: string | null
          exclusive_distribution?: boolean
          halal_certified?: boolean
          halal_certifying_body?: string | null
          iso22000_certified?: boolean
          iso9001_certified?: boolean
          lot_traceability?: boolean
          onssa_approved?: boolean
          onssa_number?: string | null
          organisation_id: string
          product_categories?: string[] | null
          production_capacity?: string | null
          review_count?: number | null
          shipping_fee_mode?: string | null
          shipping_flat_fee?: number | null
          shipping_max_fee?: number | null
          shipping_min_fee?: number | null
          shipping_percentage_rate?: number | null
          trade_name?: string | null
          website?: string | null
          years_active?: number | null
        }
        Update: {
          accepted_payment_terms?: string[] | null
          avg_rating?: number | null
          bank_bic?: string | null
          bank_iban?: string | null
          brands_represented?: string | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_referent?: string | null
          created_at?: string
          default_delivery_methods?: string[] | null
          default_export_countries?: string[] | null
          default_franco_eur?: number | null
          default_incoterms?: string[] | null
          default_moq?: number | null
          default_prep_days?: number | null
          delivery_zones?: string[] | null
          description?: string | null
          exclusive_distribution?: boolean
          halal_certified?: boolean
          halal_certifying_body?: string | null
          iso22000_certified?: boolean
          iso9001_certified?: boolean
          lot_traceability?: boolean
          onssa_approved?: boolean
          onssa_number?: string | null
          organisation_id?: string
          product_categories?: string[] | null
          production_capacity?: string | null
          review_count?: number | null
          shipping_fee_mode?: string | null
          shipping_flat_fee?: number | null
          shipping_max_fee?: number | null
          shipping_min_fee?: number | null
          shipping_percentage_rate?: number | null
          trade_name?: string | null
          website?: string | null
          years_active?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          contact?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          contact?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachment_url: string | null
          id: string
          internal: boolean
          message: string
          sender_id: string
          sent_at: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          id?: string
          internal?: boolean
          message: string
          sender_id: string
          sent_at?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          id?: string
          internal?: boolean
          message?: string
          sender_id?: string
          sent_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "delivery_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          active: boolean
          analytics_access: boolean
          created_at: string
          display_order: number
          id: string
          max_active_campaigns: number
          max_requests_per_month: number
          max_rfq_per_month: number
          max_samples_per_month: number
          monthly_price: number
          name: string
          priority_queue: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          analytics_access?: boolean
          created_at?: string
          display_order?: number
          id?: string
          max_active_campaigns?: number
          max_requests_per_month?: number
          max_rfq_per_month?: number
          max_samples_per_month?: number
          monthly_price?: number
          name: string
          priority_queue?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          analytics_access?: boolean
          created_at?: string
          display_order?: number
          id?: string
          max_active_campaigns?: number
          max_requests_per_month?: number
          max_rfq_per_month?: number
          max_samples_per_month?: number
          monthly_price?: number
          name?: string
          priority_queue?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      vendor_delivery_config: {
        Row: {
          delivery_mode: string
          flat_rate_mad: number
          free_threshold_mad: number | null
          id: string
          max_charge_mad: number | null
          min_charge_mad: number | null
          notes: string | null
          percentage_rate: number | null
          seller_org_id: string
          updated_at: string
        }
        Insert: {
          delivery_mode?: string
          flat_rate_mad?: number
          free_threshold_mad?: number | null
          id?: string
          max_charge_mad?: number | null
          min_charge_mad?: number | null
          notes?: string | null
          percentage_rate?: number | null
          seller_org_id: string
          updated_at?: string
        }
        Update: {
          delivery_mode?: string
          flat_rate_mad?: number
          free_threshold_mad?: number | null
          id?: string
          max_charge_mad?: number | null
          min_charge_mad?: number | null
          notes?: string | null
          percentage_rate?: number | null
          seller_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_delivery_config_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reviews: {
        Row: {
          buyer_org_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating_conformity: number | null
          rating_global: number
          rating_service: number | null
          seller_org_id: string
        }
        Insert: {
          buyer_org_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating_conformity?: number | null
          rating_global: number
          rating_service?: number | null
          seller_org_id: string
        }
        Update: {
          buyer_org_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating_conformity?: number | null
          rating_global?: number
          rating_service?: number | null
          seller_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reviews_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reviews_seller_org_id_fkey"
            columns: ["seller_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      get_user_org_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
