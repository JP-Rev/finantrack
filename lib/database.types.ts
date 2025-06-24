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
      accounts: {
        Row: {
          id: string
          name: string
          type: 'efectivo' | 'tarjeta' | 'usd' | 'otro'
          currency: 'ARS' | 'USD'
          balance: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'efectivo' | 'tarjeta' | 'usd' | 'otro'
          currency: 'ARS' | 'USD'
          balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'efectivo' | 'tarjeta' | 'usd' | 'otro'
          currency?: 'ARS' | 'USD'
          balance?: number
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      subcategories: {
        Row: {
          id: string
          name: string
          category_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string
          created_at?: string
        }
      }
      movements: {
        Row: {
          id: string
          type: 'ingreso' | 'gasto'
          date: string
          amount: number
          description: string
          account_id: string
          subcategory_id: string | null
          installment_plan_id: string | null
          installment_number: number | null
          related_transfer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'ingreso' | 'gasto'
          date: string
          amount: number
          description?: string
          account_id: string
          subcategory_id?: string | null
          installment_plan_id?: string | null
          installment_number?: number | null
          related_transfer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'ingreso' | 'gasto'
          date?: string
          amount?: number
          description?: string
          account_id?: string
          subcategory_id?: string | null
          installment_plan_id?: string | null
          installment_number?: number | null
          related_transfer_id?: string | null
          created_at?: string
        }
      }
      installment_plans: {
        Row: {
          id: string
          start_date: string
          installment_amount: number
          number_of_installments: number
          description: string
          account_id: string
          created_at: string
        }
        Insert: {
          id?: string
          start_date: string
          installment_amount: number
          number_of_installments: number
          description: string
          account_id: string
          created_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          installment_amount?: number
          number_of_installments?: number
          description?: string
          account_id?: string
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}