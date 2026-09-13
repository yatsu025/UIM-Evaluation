import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: Request) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)
    const teamCode = searchParams.get('team_code')
    const evaluator = searchParams.get('evaluator')

    let query = supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false })
    if (teamCode) query = query.eq('team_code', teamCode)
    if (evaluator) query = query.ilike('evaluator', `%${evaluator}%`)

    const { data, error } = await query
    if (error) {
      console.warn('GET /api/evaluations supabase error:', error.message)
      return NextResponse.json([])
    }
    return NextResponse.json(data || [])
  } catch (e: any) {
    console.warn('GET /api/evaluations crashed:', e?.message || e)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Invalid JSON body', details: e?.message || String(e) },
      { status: 400 },
    )
  }

  try {
    const supabase = getServiceSupabase()

    const row = {
      team_code: String(body.teamCode ?? ''),
      team_name: String(body.teamName ?? ''),
      evaluator: String(body.evaluator ?? ''),
      role: String(body.role ?? 'Faculty'),
      problem_number: String(body.problemNumber ?? 'SIH26-'),
      innovation: Number(body.scores?.[0] ?? 0),
      problem_understanding: Number(body.scores?.[1] ?? 0),
      technical_feasibility: Number(body.scores?.[2] ?? 0),
      impact_scalability: Number(body.scores?.[3] ?? 0),
      presentation_demo: Number(body.scores?.[4] ?? 0),
      team_collaboration: Number(body.scores?.[5] ?? 0),
      remarks: body.remarks ? String(body.remarks) : null,
    }

    const { data, error } = await supabase.from('evaluations').insert(row).select()

    if (error) {
      console.error('POST /api/evaluations supabase error:', error.message, error.code, error.details, error.hint)
      return NextResponse.json(
        {
          error: 'Database error. Ensure "evaluations" table exists in Supabase.',
          details: `${error.message}${error.code ? ` (code: ${error.code})` : ''}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(data?.[0] || row, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/evaluations crashed:', e?.message || e)
    return NextResponse.json(
      {
        error: 'Server error. Check Supabase setup.',
        details: e?.message || String(e),
      },
      { status: 500 },
    )
  }
}
