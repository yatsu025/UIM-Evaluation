import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qmehbqccogndirolttxy.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZWhicWNjb2duZGlyb2x0dHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODg3NjgsImV4cCI6MjEwNDc2NDc2OH0.pdot88WbswwEFJT-pBltUG2dzZEQF3Y3hD6kfFFLLXo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TeamRow = {
  id?: string
  code: string
  name: string
  leader: string
  title?: string
  domain?: string
  status?: string
}

export type EvaluationRow = {
  id?: string
  team_code: string
  team_name: string
  evaluator: string
  role: string
  problem_number: string
  innovation: number
  problem_understanding: number
  technical_feasibility: number
  impact_scalability: number
  presentation_demo: number
  team_collaboration: number
  remarks?: string
  created_at?: string
}
