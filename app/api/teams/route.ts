import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { TeamRow } from '@/lib/supabase'

function getEnv(key: string, fallback = '') {
  const v = process.env[key]
  return v && v.trim() ? v : fallback
}

function getServiceSupabase() {
  const url =
    getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    'https://qmehbqccogndirolttxy.supabase.co'
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey =
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZWhicWNjb2duZGlyb2x0dHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODg3NjgsImV4cCI6MjEwNDc2NDc2OH0.pdot88WbswwEFJT-pBltUG2dzZEQF3Y3hD6kfFFLLXo'
  const key = serviceKey || anonKey
  return createClient(url, key)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FALLBACK_TEAMS: TeamRow[] = [
  {
    code: 'SIH26-001',
    name: 'BidMinds',
    leader: 'Shivam Srivastava',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
  {
    code: 'SIH26-002',
    name: 'Binary Bandits',
    leader: 'Prajjwal Jauhari',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
  {
    code: 'SIH26-003',
    name: 'Venomatrix',
    leader: 'Shreyansh Tripathi',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
]

export async function GET() {
  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('code', { ascending: true })

    if (error) {
      console.warn('GET /api/teams supabase error (using fallback):', error.message)
      return NextResponse.json(FALLBACK_TEAMS)
    }

    if (!data || data.length === 0) {
      return NextResponse.json(FALLBACK_TEAMS)
    }

    return NextResponse.json(data)
  } catch (e: any) {
    console.warn('GET /api/teams crashed (using fallback):', e?.message || e)
    return NextResponse.json(FALLBACK_TEAMS)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase()
    const body = (await request.json()) as TeamRow | TeamRow[]
    const rows: TeamRow[] = Array.isArray(body) ? body : [body]

    const { data, error } = await supabase.from('teams').insert(rows).select()
    if (error) {
      return NextResponse.json(
        { error: 'Failed to insert teams', details: error.message },
        { status: 500 },
      )
    }
    return NextResponse.json(data || rows, { status: 201 })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to insert teams', details: e?.message || String(e) },
      { status: 500 },
    )
  }
}
