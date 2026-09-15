'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Menu, Search, X, Award, Loader2, Users, ChevronRight, RefreshCw } from 'lucide-react'

const UGI_LOGO = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-AeYJZHsxR9T5kbLeksrbKY5kp8f7Ux.png'
const SIH_LOGO = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Idsasyw4B47NFcq9s6h1KnM9ycbyRr.png'

type Team = {
  name: string
  code: string
  leader: string
  title: string
  domain: string
  status: string
}

const FALLBACK_TEAMS: Team[] = [
  {
    name: 'BidMinds',
    code: 'SIH26-001',
    leader: 'Shivam Srivastava',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
  {
    name: 'Binary Bandits',
    code: 'SIH26-002',
    leader: 'Prajjwal Jauhari',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
  {
    name: 'Venomatrix',
    code: 'SIH26-003',
    leader: 'Shreyansh Tripathi',
    title: 'Problem Statement - SIH26 (Fill by evaluator)',
    domain: 'Software & Digital Solutions',
    status: 'Pending',
  },
]

const criteria = [
  ['Innovation & Originality', 20, 'Uniqueness of the idea and creative approach'],
  ['Problem Understanding', 15, 'Clarity and depth of problem analysis'],
  ['Technical Feasibility', 20, 'Practicality and technical implementation'],
  ['Impact & Scalability', 20, 'Potential reach, value, and ability to scale'],
  ['Presentation & Demo', 15, 'Clarity, confidence, and quality of demonstration'],
  ['Team Collaboration', 10, 'Participation and coordination among members'],
] as const

const CRITERIA_MAX_TOTAL = 100

type Evaluation = {
  teamCode: string
  teamName: string
  evaluator: string
  role: string
  scores: number[]
  remarks: string
  problemNumber: string
  createdAt?: string
  dbId?: string | number
}

type ViewKey = 'evaluation' | 'history' | 'teams'

const LS_TEAMS = 'sih_portal_teams_v1'
const LS_EVALS = 'sih_portal_evals_v1'

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as unknown as T) : fallback
  } catch {
    return fallback
  }
}

function saveLS<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export default function Page() {
  const [view, setView] = useState<ViewKey>(() => {
    if (typeof window === 'undefined') return 'teams'
    const path = window.location.pathname
    if (path === '/score') return 'evaluation'
    if (path === '/my-scores') return 'history'
    return 'teams'
  })

  const [teams, setTeams] = useState<Team[]>(() => loadLS<Team[]>(LS_TEAMS, FALLBACK_TEAMS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitWarning, setSubmitWarning] = useState<string | null>(null)

  const [role, setRole] = useState<'SPOC' | 'Faculty' | null>(null)
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<Team>(() => loadLS<Team[]>(LS_TEAMS, FALLBACK_TEAMS)[0] ?? FALLBACK_TEAMS[0])
  const [search, setSearch] = useState('')
  const [problemNumber, setProblemNumber] = useState('SIH26-')
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0, 0])
  const [remarks, setRemarks] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [menu, setMenu] = useState(false)
  const [evaluations, setEvaluations] = useState<Evaluation[]>(() => loadLS<Evaluation[]>(LS_EVALS, []))
  const [teamQuery, setTeamQuery] = useState('')
  const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<Team | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const lastFetchedAtRef = useRef<number>(0)
  const teamsFetchedFromDBRef = useRef(false)
  const evalsFetchedFromDBRef = useRef(false)

  useEffect(() => {
    if (teamsFetchedFromDBRef.current) {
      saveLS(LS_TEAMS, teams)
    }
  }, [teams])

  useEffect(() => {
    if (evalsFetchedFromDBRef.current) {
      saveLS(LS_EVALS, evaluations)
    }
  }, [evaluations])

  function dedupeEvals(list: Evaluation[]): Evaluation[] {
    const seen = new Map<string, Evaluation>()
    for (const e of list) {
      const key =
        e.dbId !== undefined && e.dbId !== null && String(e.dbId).length > 0
          ? `id:${String(e.dbId)}`
          : `${e.teamCode}::${e.evaluator}::${e.createdAt ?? ''}::${e.scores.join(',')}`
      const prev = seen.get(key)
      if (!prev) {
        seen.set(key, e)
      } else if ((prev.createdAt ?? '') < (e.createdAt ?? '')) {
        seen.set(key, e)
      }
    }
    return Array.from(seen.values())
  }

  const fetchTeams = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/teams', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as Team[]
        if (Array.isArray(data)) {
          const safe = data.length > 0 ? data : FALLBACK_TEAMS
          setTeams(safe)
          if (safe.length > 0) {
            setSelectedTeam((prev) => {
              const stillExists = safe.find((t) => t.code === prev?.code)
              return stillExists ?? safe[0]
            })
          }
          teamsFetchedFromDBRef.current = true
          return
        }
      }
      if (!opts?.silent) {
        console.warn('fetch teams returned non-array, using localStorage/fallback')
      }
    } catch (e) {
      if (!opts?.silent) {
        console.warn('fetch teams failed, using localStorage/fallback:', e)
      }
    }
  }, [])

  const fetchEvaluations = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' })
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id?: string | number
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
          remarks?: string | null
          created_at?: string
        }>
        if (Array.isArray(rows)) {
          const mapped: Evaluation[] = rows.map((r) => ({
            teamCode: r.team_code,
            teamName: r.team_name,
            evaluator: r.evaluator,
            role: r.role,
            problemNumber: r.problem_number,
            remarks: r.remarks == null ? '' : String(r.remarks),
            scores: [
              Number(r.innovation) || 0,
              Number(r.problem_understanding) || 0,
              Number(r.technical_feasibility) || 0,
              Number(r.impact_scalability) || 0,
              Number(r.presentation_demo) || 0,
              Number(r.team_collaboration) || 0,
            ],
            createdAt: r.created_at,
            dbId: r.id,
          }))
          const deduped = dedupeEvals(mapped).sort((a, b) => {
            const ta = a.createdAt ?? ''
            const tb = b.createdAt ?? ''
            if (ta > tb) return -1
            if (ta < tb) return 1
            return 0
          })
          setEvaluations(deduped)
          evalsFetchedFromDBRef.current = true
          return
        }
      }
      if (!opts?.silent) {
        console.warn('fetch evaluations returned non-array, using localStorage')
      }
    } catch (e) {
      if (!opts?.silent) {
        console.warn('fetch evaluations failed, using localStorage:', e)
      }
    }
  }, [])

  const forceRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchTeams({ silent: true }), fetchEvaluations({ silent: true })])
      lastFetchedAtRef.current = Date.now()
    } finally {
      setRefreshing(false)
    }
  }, [fetchTeams, fetchEvaluations])

  useEffect(() => {
    let mounted = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    ;(async () => {
      setLoading(true)
      try {
        await Promise.all([fetchTeams(), fetchEvaluations()])
        lastFetchedAtRef.current = Date.now()
      } catch {}
      if (mounted) setLoading(false)
    })()

    pollTimer = setInterval(() => {
      void forceRefresh()
    }, 15_000)

    let realtimeUnsub: (() => void) | null = null
    if (typeof window !== 'undefined') {
      import('@/lib/supabase').then(({ supabase }) => {
        if (!mounted) return
        try {
          const c1 = supabase
            .channel('sih_evals_realtime')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'evaluations' },
              () => {
                void fetchEvaluations({ silent: true })
              },
            )
            .subscribe()
          const c2 = supabase
            .channel('sih_teams_realtime')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'teams' },
              () => {
                void fetchTeams({ silent: true })
              },
            )
            .subscribe()
          realtimeUnsub = () => {
            try {
              supabase.removeChannel(c1)
              supabase.removeChannel(c2)
            } catch {}
          }
        } catch {
          /* ignore realtime setup errors; polling is active */
        }
      }).catch(() => {})
    }

    const onFocus = () => {
      const now = Date.now()
      if (now - lastFetchedAtRef.current > 3000) {
        void forceRefresh()
      }
    }
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      if (pollTimer) clearInterval(pollTimer)
      window.removeEventListener('focus', onFocus)
      if (realtimeUnsub) realtimeUnsub()
    }
  }, [fetchTeams, fetchEvaluations, forceRefresh])

  useEffect(() => {
    const onPop = () => {
      if (typeof window === 'undefined') return
      const path = window.location.pathname
      if (path === '/score') setView('evaluation')
      else if (path === '/my-scores') setView('history')
      else setView('teams')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const evaluator = role === 'SPOC' ? 'Dr Syed Qamrul Kazmi' : name
  const total = scores.reduce((sum, score) => sum + score, 0)
  const filtered = teams.filter((team) =>
    `${team.name} ${team.code} ${team.leader} ${team.title}`.toLowerCase().includes(search.toLowerCase()),
  )
  const teamResults = evaluations.filter((item) =>
    `${item.teamName} ${item.teamCode}`.toLowerCase().includes(teamQuery.toLowerCase()),
  )

  type TeamEval = Evaluation & { totalObtained: number }

  type TeamStat = {
    team: Team
    evals: TeamEval[]
    memberCount: number
    totalMaxMarks: number
    totalObtainedMarks: number
    average: number
  }

  const teamStats = useMemo<TeamStat[]>(() => {
    // Normalise team name for grouping (trim + lowercase)
    const normName = (n: string) => n.trim().toLowerCase()

    // Group ALL evaluations by normalised team name (ignores different team codes for the same team)
    const byName = new Map<string, TeamEval[]>()
    for (const ev of evaluations) {
      const key = normName(ev.teamName)
      const totalObtained = ev.scores.reduce((a, b) => a + b, 0)
      const rec: TeamEval = { ...ev, totalObtained }
      const arr = byName.get(key)
      if (arr) arr.push(rec)
      else byName.set(key, [rec])
    }

    // Build a lookup from normalised name → best registered team metadata
    // Prefer teams table entries that have a proper SIH-UIM-2026-XXXX code
    const teamMetaByName = new Map<string, Team>()
    for (const t of teams) {
      const key = normName(t.name)
      const existing = teamMetaByName.get(key)
      // Prefer the entry whose code looks like the "real" event code (SIH-UIM-2026-*)
      if (!existing || t.code.startsWith('SIH-UIM-2026-')) {
        teamMetaByName.set(key, t)
      }
    }

    // Also collect team names that appear only in evaluations (not in teams table)
    const allNames = new Set<string>([
      ...Array.from(byName.keys()),
      ...teams.map((t) => normName(t.name)),
    ])

    const stats: TeamStat[] = Array.from(allNames).map((nameKey) => {
      const evals = byName.get(nameKey) ?? []
      // Pick best code from evaluations: prefer SIH-UIM-2026-* over SIH26-*
      const bestCode = evals.reduce<string | null>((best, ev) => {
        if (!best) return ev.teamCode
        if (ev.teamCode.startsWith('SIH-UIM-2026-')) return ev.teamCode
        return best
      }, null)

      const registeredMeta = teamMetaByName.get(nameKey)
      const firstEval = evals[0]
      const team: Team = registeredMeta
        ? {
            ...registeredMeta,
            // Use the best code found (SIH-UIM-2026-* preferred)
            code: bestCode ?? registeredMeta.code,
          }
        : {
            code: bestCode ?? nameKey,
            name: firstEval?.teamName ?? nameKey,
            leader: '—',
            title: '—',
            domain: '—',
            status: 'Pending',
          }

      const memberCount = evals.length
      const totalObtainedMarks = evals.reduce((s, e) => s + e.totalObtained, 0)
      const totalMaxMarks = memberCount * CRITERIA_MAX_TOTAL
      const average = memberCount > 0 ? totalObtainedMarks / memberCount : 0
      return { team, evals, memberCount, totalMaxMarks, totalObtainedMarks, average }
    })

    // Sort: evaluated teams first by average desc, then unevaluated teams alphabetically
    stats.sort((a, b) => {
      if (a.memberCount === 0 && b.memberCount === 0) return a.team.name.localeCompare(b.team.name)
      if (a.memberCount === 0) return 1
      if (b.memberCount === 0) return -1
      return b.average - a.average
    })
    return stats
  }, [teams, evaluations])

  const go = (next: ViewKey) => {
    setView(next)
    setMenu(false)
    if (typeof window !== 'undefined') {
      let url = '/'
      if (next === 'evaluation') url = '/score'
      else if (next === 'history') url = '/my-scores'
      else if (next === 'teams') url = '/teams'
      window.history.pushState({}, '', url)
    }
  }

  const reset = () => {
    setStep(0)
    setRole(null)
    setName('')
    setSubmitted(false)
    setRemarks('')
    setScores([0, 0, 0, 0, 0, 0])
    setProblemNumber('SIH26-')
    setSubmitError(null)
  }

  const submit = async () => {
    setSaving(true)
    setSubmitError(null)
    const payload: Evaluation = {
      teamCode: selectedTeam.code,
      teamName: selectedTeam.name,
      evaluator,
      role: role ?? 'Faculty',
      scores,
      remarks,
      problemNumber,
    }
    try {
      let res: Response
      try {
        res = await fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (netErr: any) {
        throw new Error(
          'Network error: Server response nahi mila. Dev server restart karein ya tables Supabase me banayein.',
        )
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.details || err?.error || 'Request failed'
        if (
          msg.toLowerCase().includes('relation') ||
          msg.toLowerCase().includes('table') ||
          msg.toLowerCase().includes('does not exist') ||
          String(res.status) === '404'
        ) {
          throw new Error(
            `Supabase me "evaluations" table nahi bana. Pehle SQL Editor me woh table banayein (Step 1 ki query). Details: ${msg}`,
          )
        }
        throw new Error(msg)
      }
      const savedRow: any = await res.json().catch(() => payload)
      const savedEval: Evaluation = {
        teamCode: savedRow?.team_code ?? payload.teamCode,
        teamName: savedRow?.team_name ?? payload.teamName,
        evaluator: savedRow?.evaluator ?? payload.evaluator,
        role: savedRow?.role ?? payload.role,
        problemNumber: savedRow?.problem_number ?? payload.problemNumber,
        remarks: savedRow?.remarks == null ? payload.remarks : String(savedRow.remarks),
        scores: [
          Number(savedRow?.innovation ?? payload.scores[0]),
          Number(savedRow?.problem_understanding ?? payload.scores[1]),
          Number(savedRow?.technical_feasibility ?? payload.scores[2]),
          Number(savedRow?.impact_scalability ?? payload.scores[3]),
          Number(savedRow?.presentation_demo ?? payload.scores[4]),
          Number(savedRow?.team_collaboration ?? payload.scores[5]),
        ],
        createdAt: savedRow?.created_at,
        dbId: savedRow?.id,
      }
      setEvaluations((current) => dedupeEvals([savedEval, ...current]))
      setTimeout(() => {
        void fetchEvaluations({ silent: true })
      }, 300)
      setSubmitted(true)
    } catch (e: any) {
      console.error('submit failed:', e)
      setSubmitError(e?.message || 'Failed to save evaluation to database')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fa] text-[#183040]">
      <header className="sticky top-0 z-30 border-b border-[#dce5ea] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
              className="rounded-lg p-2 text-[#55707c] hover:bg-[#eef3f5] lg:hidden"
            >
              <Menu />
            </button>
            <img src={UGI_LOGO} alt="United Group of Institutions" className="h-12 w-auto object-contain" />
            <div className="hidden h-9 w-px bg-[#dbe4e8] sm:block" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ea6a1d]">
                Official Evaluation Portal
              </p>
              <p className="text-sm font-semibold text-[#234554]">SIH 2026 · Internal Hackathon</p>
            </div>
          </div>
          <img src={SIH_LOGO} alt="Smart India Hackathon" className="hidden h-14 w-auto object-contain sm:block" />
        </div>
      </header>

      {menu && (
        <div className="border-b border-[#dce5ea] bg-white px-5 py-3 lg:hidden">
          <MobileNav go={go} view={view} />
        </div>
      )}

      <div className="mx-auto flex max-w-[1440px]">
        <section className="min-w-0 flex-1 px-5 py-7 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-[1010px]">
            {loading ? (
              <LoadingState />
            ) : view === 'history' ? (
              <ScoreView evaluations={evaluations} go={go} />
            ) : view === 'teams' ? (
              <TeamsView
                teams={teams}
                query={teamQuery}
                setQuery={setTeamQuery}
                evaluations={teamResults}
                go={go}
                teamStats={teamStats}
                onSelectTeam={setSelectedTeamForDetail}
                onRefresh={forceRefresh}
                refreshing={refreshing}
                totalEvaluationsCount={evaluations.length}
              />
            ) : (
              <EvaluationView
                {...{
                  role,
                  setRole,
                  name,
                  setName,
                  step,
                  setStep,
                  selectedTeam,
                  setSelectedTeam,
                  search,
                  setSearch,
                  problemNumber,
                  setProblemNumber,
                  scores,
                  setScores,
                  remarks,
                  setRemarks,
                  submitted,
                  submit,
                  total,
                  evaluator,
                  reset,
                  filtered,
                  saving,
                  submitError,
                }}
              />
            )}
          </div>
        </section>
      </div>

      {selectedTeamForDetail && (
        <TeamDetailModal
          team={selectedTeamForDetail}
          teamStats={teamStats}
          onClose={() => setSelectedTeamForDetail(null)}
        />
      )}
    </main>
  )
}

function LoadingState() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 p-12 text-[#77909a]">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-sm">Loading data from database...</p>
      </div>
    </Card>
  )
}

function MobileNav({ go, view }: { go: (view: ViewKey) => void; view: string }) {
  return (
    <nav className="flex flex-col gap-1 text-sm font-semibold">
      <button
        onClick={() => go('evaluation')}
        className={`rounded-md px-3 py-2 text-left ${
          view === 'evaluation' ? 'bg-[#eff6f3] text-[#13834a]' : 'text-[#5c737d]'
        }`}
      >
        Judge Workspace (/score)
      </button>
      <button
        onClick={() => go('history')}
        className={`rounded-md px-3 py-2 text-left ${
          view === 'history' ? 'bg-[#eff6f3] text-[#13834a]' : 'text-[#5c737d]'
        }`}
      >
        My Scores (/my-scores)
      </button>
      <button
        onClick={() => go('teams')}
        className={`rounded-md px-3 py-2 text-left ${
          view === 'teams' ? 'bg-[#eff6f3] text-[#13834a]' : 'text-[#5c737d]'
        }`}
      >
        Team Results (/teams)
      </button>
    </nav>
  )
}

function ScoreView({ evaluations, go }: { evaluations: Evaluation[]; go: (view: ViewKey) => void }) {
  return (
    <>
      <PageIntro
        eyebrow="My score history"
        title="Scores I have submitted"
        subtitle="Review every team you evaluated, the criterion breakdown, and the suggestions you recorded."
      />
      {evaluations.length === 0 ? (
        <Empty text="No evaluations submitted yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {evaluations.map((item, index) => (
            <ScoreCard item={item} key={`${item.teamCode}-${item.evaluator}-${index}`} />
          ))}
        </div>
      )}
    </>
  )
}

function ScoreCard({ item }: { item: Evaluation }) {
  const total = item.scores.reduce((a, b) => a + b, 0)
  return (
    <Card>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">
              {item.teamCode} · {item.role}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#244958]">{item.teamName}</h2>
            <p className="mt-1 text-sm text-[#77909a]">
              Evaluator: {item.evaluator} · {item.problemNumber}
            </p>
          </div>
          <div className="rounded-xl bg-[#f2faf6] px-5 py-3 text-right">
            <p className="text-xs font-semibold text-[#78909a]">Total score</p>
            <p className="text-2xl font-bold text-[#16834c]">
              {total}
              <span className="text-sm text-[#709286]"> / 100</span>
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {criteria.map(([label, max], i) => (
            <div className="flex justify-between rounded-lg bg-[#f8fafb] px-3 py-2 text-xs" key={label}>
              <span className="text-[#72868e]">{label}</span>
              <span className="font-bold text-[#36535e]">
                {item.scores[i]} / {max}
              </span>
            </div>
          ))}
        </div>
        {item.remarks && (
          <div className="rounded-xl border border-[#e4ecee] bg-white p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#84979e]">Suggestion given</p>
            <p className="text-sm leading-6 text-[#5d747d]">{item.remarks}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

type TeamStatType = {
  team: Team
  evals: Array<Evaluation & { totalObtained: number }>
  memberCount: number
  totalMaxMarks: number
  totalObtainedMarks: number
  average: number
}

function TeamsView({
  teams: teamList,
  query,
  setQuery,
  evaluations,
  go,
  teamStats,
  onSelectTeam,
  onRefresh,
  refreshing,
  totalEvaluationsCount,
}: {
  teams: Team[]
  query: string
  setQuery: (value: string) => void
  evaluations: Evaluation[]
  go: (view: ViewKey) => void
  teamStats: TeamStatType[]
  onSelectTeam: (team: Team) => void
  onRefresh?: () => void
  refreshing?: boolean
  totalEvaluationsCount?: number
}) {
  const grouped = useMemo(
    () =>
      Object.values(
        evaluations.reduce<Record<string, Evaluation[]>>((acc, item) => {
          ;(acc[item.teamCode] ||= []).push(item)
          return acc
        }, {}),
      ),
    [evaluations],
  )
  const visible = query.trim()
    ? grouped.filter((items) =>
        `${items[0].teamName} ${items[0].teamCode}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : []

  const evaluatorsSeen = useMemo(() => {
    const uniq = new Set<string>()
    for (const s of teamStats) for (const e of s.evals) uniq.add(`${s.team.code}::${e.evaluator}`)
    return uniq.size
  }, [teamStats])

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e16c25]">Live leaderboard</p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe3ce] bg-[#eaf7f0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#16834c]"
              title="Auto-updates via polling + Supabase realtime"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16834c]/50 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-[#16834c]"></span>
              </span>
              Live
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#193d4d] sm:text-3xl">Teams Leaderboard</h1>
          <p className="mt-2 text-sm text-[#71858d]">
            All teams with their average score. Click any team to see teacher-wise details.
          </p>
          <p className="mt-1 text-[11px] text-[#8a9da4]">
            <Users size={11} className="-mt-0.5 mr-1 inline" />
            {teamStats.length} teams · {evaluatorsSeen} team × evaluator submissions · {totalEvaluationsCount ?? 0}{' '}
            total evaluations stored
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-[#cfe3d7] bg-[#f2faf6] px-3.5 py-2 text-sm font-bold text-[#16834c] disabled:opacity-60 hover:bg-[#e7f5ed]"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing with DB…' : 'Refresh from DB'}
          </button>
        )}
      </div>
      <TeamsLeaderboard teamStats={teamStats} onSelectTeam={onSelectTeam} />

      <div className="mt-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#e16c25]">Team result lookup</p>
        <h3 className="text-lg font-bold text-[#193d4d]">See how your team performed</h3>
        <p className="mt-1 mb-5 text-sm text-[#71858d]">
          Enter your team name to view only your team's scores and suggestions.
        </p>
        <div className="mb-5 relative">
          <Search className="absolute left-3 top-3.5 text-[#8da1a8]" size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your team name"
            className="field pl-10"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-[#8da1a8]">
              <X size={17} />
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <Empty
            text={query.trim() ? 'No team results found for that search.' : 'Enter your team name to see your results.'}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((items) => (
              <TeamResultCard items={items} teamList={teamList} key={items[0].teamCode} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function TeamsLeaderboard({
  teamStats,
  onSelectTeam,
}: {
  teamStats: TeamStatType[]
  onSelectTeam: (team: Team) => void
}) {
  if (!teamStats || teamStats.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center text-sm text-[#77909a]">No data available</div>
      </Card>
    )
  }

  return (
    <>
      <div className="hidden md:block">
        <TeamsDesktopTable teamStats={teamStats} onSelectTeam={onSelectTeam} />
      </div>
      <div className="md:hidden">
        <TeamsMobileCards teamStats={teamStats} onSelectTeam={onSelectTeam} />
      </div>
    </>
  )
}

function TeamsDesktopTable({
  teamStats,
  onSelectTeam,
}: {
  teamStats: TeamStatType[]
  onSelectTeam: (team: Team) => void
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e4ecee] bg-[#f7fafb] text-left text-xs font-bold uppercase tracking-wider text-[#73878e]">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Team Name</th>
              <th className="px-6 py-4">Leader Name</th>
              <th className="px-6 py-4 text-right">Evaluators</th>
              <th className="px-6 py-4 text-right">Marks</th>
              <th className="px-6 py-4 text-right">Average</th>
              <th className="px-6 py-4" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {teamStats.map((stat, idx) => (
              <tr
                key={stat.team.code}
                onClick={() => onSelectTeam(stat.team)}
                className="group cursor-pointer border-b border-[#eef3f4] last:border-b-0 transition-colors hover:bg-[#f3faf6]"
              >
                <td className="px-6 py-4 align-middle">
                  <RankBadge index={idx} average={stat.average} />
                </td>
                <td className="px-6 py-4 align-middle">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">{stat.team.code}</p>
                    <p className="mt-0.5 font-bold text-[#244958]">{stat.team.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#36535e]">
                    <Award size={14} className="text-[#c58633]" /> {stat.team.leader}
                  </span>
                </td>
                <td className="px-6 py-4 align-middle text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3f5] px-3 py-1 text-xs font-bold text-[#49606a]">
                    <Users size={12} /> {stat.memberCount}
                  </span>
                </td>
                <td className="px-6 py-4 align-middle text-right font-bold text-[#36535e]">
                  {stat.totalObtainedMarks}
                  <span className="text-xs font-medium text-[#8399a0]"> / {stat.totalMaxMarks}</span>
                </td>
                <td className="px-6 py-4 align-middle text-right">
                  <AverageValue value={stat.average} />
                </td>
                <td className="px-4 py-4 align-middle text-right text-[#16834c] opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronRight size={18} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function TeamsMobileCards({
  teamStats,
  onSelectTeam,
}: {
  teamStats: TeamStatType[]
  onSelectTeam: (team: Team) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {teamStats.map((stat, idx) => (
        <button
          key={stat.team.code}
          onClick={() => onSelectTeam(stat.team)}
          className="rounded-xl border border-[#dce5e8] bg-white p-4 text-left shadow-[0_4px_20px_rgba(32,71,84,0.04)] active:bg-[#f3faf6]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <RankBadge index={idx} average={stat.average} small />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">
                  {stat.team.code}
                </span>
              </div>
              <p className="mt-1.5 truncate text-base font-bold text-[#244958]">{stat.team.name}</p>
              <p className="mt-1 truncate text-xs font-semibold text-[#5c727b]">
                Leader: <span className="text-[#8a5d1c]">{stat.team.leader}</span>
              </p>
            </div>
            <div className="text-right">
              <AverageValue value={stat.average} small />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#eef3f4] pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#49606a]">
              <Users size={12} /> {stat.memberCount} evaluator{stat.memberCount === 1 ? '' : 's'}
            </span>
            <span className="font-bold text-[#36535e]">
              {stat.totalObtainedMarks}
              <span className="font-medium text-[#8399a0]"> / {stat.totalMaxMarks}</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

function RankBadge({ index, average, small = false }: { index: number; average: number; small?: boolean }) {
  const isTop = index < 3 && average > 0
  const base = small ? 'size-5 text-[10px]' : 'size-7 text-xs'
  const color =
    index === 0 && average > 0
      ? 'bg-[#f5d27b] text-[#6b4e05]'
      : index === 1 && average > 0
        ? 'bg-[#dce4ea] text-[#3a4a55]'
        : index === 2 && average > 0
          ? 'bg-[#e8c09a] text-[#6b3a14]'
          : 'bg-[#eef3f5] text-[#5d727b]'
  return (
    <span
      className={`inline-flex ${base} items-center justify-center rounded-full font-bold ${isTop ? color : 'bg-[#eef3f5] text-[#5d727b]'}`}
    >
      {index + 1}
    </span>
  )
}

function AverageValue({ value, small = false }: { value: number; small?: boolean }) {
  const display = Number.isFinite(value) ? value.toFixed(2) : '0.00'
  const tone =
    value >= 80 ? 'text-[#16834c]' : value >= 60 ? 'text-[#216595]' : value >= 40 ? 'text-[#a76a17]' : 'text-[#9a3b2a]'
  return (
    <div className={`font-extrabold ${small ? 'text-lg' : 'text-xl'} ${tone}`}>
      {display}
      <span className={`font-medium ${small ? 'text-[10px]' : 'text-xs'} text-[#8399a0]`}></span>
    </div>
  )
}

function TeamDetailModal({
  team,
  teamStats,
  onClose,
}: {
  team: Team
  teamStats: TeamStatType[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const stat = teamStats.find((s) => s.team.code === team.code)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-[#0c222c]/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[#dce5e8] bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e4ecee] px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">{team.code}</p>
            <h2 className="mt-1 text-xl font-bold text-[#244958] sm:text-2xl">{team.name}</h2>
            <p className="mt-1 text-xs sm:text-sm text-[#77909a]">
              <Award size={12} className="mr-1 inline" /> Leader: {team.leader}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-[#70868e] hover:bg-[#eef3f5]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {!stat || stat.evals.length === 0 ? (
            <Empty text="No data available" />
          ) : (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <StatBox label="Total Marks" value={`${stat.totalMaxMarks}`} tone="neutral" />
                <StatBox label="Marks Obtained" value={`${stat.totalObtainedMarks}`} tone="primary" />
                <StatBox
                  label="Average"
                  value={Number.isFinite(stat.average) ? stat.average.toFixed(2) : '0.00'}
                  tone="accent"
                />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#73878e]">Teacher / Evaluator Breakdown</h3>
                <span className="text-[11px] font-semibold text-[#5d747d]">
                  ({stat.evals.length} member{stat.evals.length === 1 ? '' : 's'})
                </span>
              </div>

              <div className="hidden sm:block">
                <div className="overflow-hidden rounded-xl border border-[#dce5e8]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f7fafb] text-left text-xs font-bold uppercase tracking-wider text-[#73878e]">
                        <th className="px-4 py-3">Teacher / Evaluator</th>
                        <th className="px-4 py-3 text-right">Total Marks</th>
                        <th className="px-4 py-3 text-right">Marks Obtained</th>
                        <th className="px-4 py-3 text-right">Score %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.evals.map((ev, i) => {
                        const pct = CRITERIA_MAX_TOTAL > 0 ? (ev.totalObtained / CRITERIA_MAX_TOTAL) * 100 : 0
                        return (
                          <tr
                            key={`${ev.evaluator}-${i}`}
                            className="border-t border-[#eef3f4] last:border-b-0"
                          >
                            <td className="px-4 py-3 align-middle">
                              <p className="font-semibold text-[#244958]">{ev.evaluator}</p>
                              <p className="text-xs text-[#8a9ba2]">{ev.role}</p>
                            </td>
                            <td className="px-4 py-3 align-middle text-right font-bold text-[#546c74]">
                              {CRITERIA_MAX_TOTAL}
                            </td>
                            <td className="px-4 py-3 align-middle text-right font-bold text-[#244958]">
                              {ev.totalObtained}
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <PercentageBadge value={pct} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#d5e4da] bg-[#f3faf7]">
                        <td className="px-4 py-3 font-bold text-[#244958]">Team Totals</td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#546c74]">{stat.totalMaxMarks}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#16834c]">{stat.totalObtainedMarks}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-extrabold text-[#16834c]">
                            Avg {Number.isFinite(stat.average) ? stat.average.toFixed(2) : '0.00'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="sm:hidden flex flex-col gap-3">
                {stat.evals.map((ev, i) => {
                  const pct = CRITERIA_MAX_TOTAL > 0 ? (ev.totalObtained / CRITERIA_MAX_TOTAL) * 100 : 0
                  return (
                    <div key={`${ev.evaluator}-${i}`} className="rounded-xl border border-[#e1e9eb] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#244958]">{ev.evaluator}</p>
                          <p className="text-xs text-[#8a9ba2]">{ev.role}</p>
                        </div>
                        <PercentageBadge value={pct} />
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#edf1f2] pt-3 text-sm">
                        <span className="text-[#70868e]">
                          Obtained: <b className="text-[#244958]">{ev.totalObtained}</b>
                        </span>
                        <span className="text-[#70868e]">
                          Total: <b className="text-[#546c74]">{CRITERIA_MAX_TOTAL}</b>
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div className="rounded-xl border-2 border-[#d5e4da] bg-[#f3faf7] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#16834c]">Team Summary</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-[#70868e]">Total Marks</p>
                      <p className="font-bold text-[#546c74]">{stat.totalMaxMarks}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#70868e]">Obtained</p>
                      <p className="font-bold text-[#244958]">{stat.totalObtainedMarks}</p>
                    </div>
                    <div className="col-span-2 border-t border-[#dce5ea] pt-2">
                      <p className="text-[11px] text-[#70868e]">Average</p>
                      <p className="text-xl font-extrabold text-[#16834c]">
                        {Number.isFinite(stat.average) ? stat.average.toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'primary' | 'accent' | 'neutral'
}) {
  const styles =
    tone === 'primary'
      ? 'border-[#cfe7d9] bg-[#f2faf6] text-[#16834c]'
      : tone === 'accent'
        ? 'border-[#e4ddd0] bg-[#faf6ef] text-[#9a6513]'
        : 'border-[#dce5ea] bg-[#f7fafb] text-[#36535e]'
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  )
}

function PercentageBadge({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? value : 0
  const tone =
    safe >= 80
      ? 'bg-[#dff4e8] text-[#16834c]'
      : safe >= 60
        ? 'bg-[#dbebf7] text-[#1c5f8f]'
        : safe >= 40
          ? 'bg-[#f6ebd8] text-[#8c5e16]'
          : 'bg-[#f4ded9] text-[#8a2d1d]'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${tone}`}>
      {safe.toFixed(2)}%
    </span>
  )
}

function TeamResultCard({ items, teamList }: { items: Evaluation[]; teamList: Team[] }) {
  const total = items.reduce((sum, item) => sum + item.scores.reduce((a, b) => a + b, 0), 0)
  const teamInfo = teamList.find((team) => team.code === items[0].teamCode)
  return (
    <Card>
      <div className="border-b border-[#e4ecee] px-6 py-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">{items[0].teamCode}</p>
            <h2 className="mt-1 text-xl font-bold text-[#244958]">{items[0].teamName}</h2>
            {teamInfo && (
              <p className="mt-1 text-xs text-[#77909a]">
                <Award size={12} className="mr-1 inline" /> Leader: {teamInfo.leader}
              </p>
            )}
          </div>
          <div className="rounded-full bg-[#f2faf6] px-4 py-2 text-xs font-bold text-[#16834c]">
            {items.length} evaluator{items.length > 1 ? 's' : ''} responded
          </div>
        </div>
        <p className="mt-2 text-sm text-[#77909a]">
          {items[0].problemNumber} · {teamList.find((team) => team.code === items[0].teamCode)?.title}
        </p>
      </div>
      <div className="p-6">
        <div className="mb-5 rounded-xl border border-[#dcebe3] bg-[#f4faf7] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#789b8b]">Combined score</p>
          <p className="mt-1 text-2xl font-bold text-[#16834c]">
            {total}
            <span className="text-sm font-medium text-[#709286]"> / {items.length * 100}</span>
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div className="rounded-xl border border-[#e1e9eb] p-4" key={`${item.evaluator}-${item.role}`}>
              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                <div>
                  <p className="font-bold text-[#31505b]">{item.evaluator}</p>
                  <p className="text-xs text-[#8a9ba2]">{item.role} evaluator</p>
                </div>
                <p className="text-lg font-bold text-[#16834c]">
                  {item.scores.reduce((a, b) => a + b, 0)} / 100
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {criteria.map(([label, max], i) => (
                  <div className="flex justify-between text-xs" key={label}>
                    <span className="text-[#72868e]">{label}</span>
                    <span className="font-bold text-[#36535e]">
                      {item.scores[i]} / {max}
                    </span>
                  </div>
                ))}
              </div>
              {item.remarks && (
                <div className="mt-4 border-t border-[#edf1f2] pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#84979e]">Suggestion</p>
                  <p className="mt-1 text-sm leading-6 text-[#5d747d]">{item.remarks}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function EvaluationView(props: any) {
  const {
    role,
    setRole,
    name,
    setName,
    step,
    setStep,
    selectedTeam,
    setSelectedTeam,
    search,
    setSearch,
    problemNumber,
    setProblemNumber,
    scores,
    setScores,
    remarks,
    setRemarks,
    submitted,
    submit,
    total,
    evaluator,
    reset,
    filtered,
    saving,
    submitError,
  } = props
  return (
    <>
      <PageIntro
        eyebrow="Judge workspace"
        title="Team Evaluation"
        subtitle="Complete each section carefully before submitting your assessment."
      />
      {submitted ? (
        <SuccessState team={selectedTeam} evaluator={evaluator} total={total} onReset={reset} />
      ) : (
        <>
          <div className="mb-8 flex items-center">
            <Step number={1} label="Evaluator" active={step >= 0} current={step === 0} />
            <StepLine active={step >= 1} />
            <Step number={2} label="Team & problem" active={step >= 1} current={step === 1} />
            <StepLine active={step >= 2} />
            <Step number={3} label="Scoring" active={step >= 2} current={step === 2} />
            <StepLine active={step >= 3} />
            <Step number={4} label="Review" active={step >= 3} current={step === 3} />
          </div>
          {submitError && (
            <div className="mb-4 rounded-lg border border-[#eac2c2] bg-[#fdf1f1] px-4 py-3 text-sm font-semibold text-[#9a2424]">
              ⚠️ {submitError}
            </div>
          )}
          <Card>
            {step === 0 ? (
              <>
                <SectionHead
                  title="Welcome, Evaluator"
                  subtitle="SIH 2026 Internal Hackathon · United Institute of Management (FUGS)"
                />
                <div className="p-6">
                  <p className="mb-4 text-sm font-bold text-[#36535e]">Select your role</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RoleCard
                      title="SPOC"
                      subtitle="Single Point of Contact"
                      selected={role === 'SPOC'}
                      onClick={() => setRole('SPOC')}
                    />
                    <RoleCard
                      title="Faculty"
                      subtitle="Faculty Judge"
                      selected={role === 'Faculty'}
                      onClick={() => setRole('Faculty')}
                    />
                  </div>
                  <div className="mt-8 flex justify-end">
                    <PrimaryButton disabled={!role} onClick={() => setStep(1)}>
                      Continue <ArrowRight size={16} />
                    </PrimaryButton>
                  </div>
                </div>
              </>
            ) : step === 1 ? (
              <>
                <SectionHead
                  title="Evaluator details"
                  subtitle="Confirm the details that will be attached to this evaluation."
                />
                <div className="p-6">
                  <div className="mb-6 rounded-lg border border-[#dce9e5] bg-[#f1faf5] px-4 py-3 text-sm font-bold text-[#277351]">
                    <CheckCircle2 size={18} className="mr-2 inline" /> {role}
                  </div>
                  {role === 'SPOC' ? (
                    <p className="rounded-lg bg-[#f8fafb] p-4 font-bold text-[#234958]">Dr Syed Qamrul Kazmi</p>
                  ) : (
                    <input
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="field"
                    />
                  )}
                  <div className="mt-8 flex justify-between">
                    <BackButton onClick={() => setStep(0)} />
                    <PrimaryButton
                      disabled={role === 'Faculty' && !name.trim()}
                      onClick={() => setStep(2)}
                    >
                      Confirm & Continue <ArrowRight size={16} />
                    </PrimaryButton>
                  </div>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <SectionHead
                  title="Select team & problem"
                  subtitle="Choose the team you are evaluating and verify their problem statement."
                />
                <div className="flex flex-col gap-6 p-6">
                  <div className="relative">
                    <label className="mb-2 block text-sm font-bold text-[#36535e]">Search team</label>
                    <Search className="absolute left-3 top-10 text-[#8da1a8]" size={17} />
                    <input
                      value={search}
                      onChange={(e: any) => setSearch(e.target.value)}
                      placeholder="Search by team name, code, or leader"
                      className="field pl-10"
                    />
                    {search && (
                      <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border bg-white shadow-lg">
                        {filtered.map((team: Team) => (
                          <button
                            key={team.code}
                            onClick={() => {
                              setSelectedTeam(team)
                              setSearch('')
                            }}
                            className="flex w-full justify-between border-b px-4 py-3 text-left hover:bg-[#f3f8f6]"
                          >
                            <span>
                              <b>{team.name}</b>
                              <small className="block text-xs text-[#82959d]">
                                {team.code} · Leader: {team.leader}
                              </small>
                            </span>
                            <span className="text-xs text-[#16834c]">{team.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-[#dcebe3] bg-[#f4faf7] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c9481]">Selected team</p>
                    <h3 className="mt-1 text-lg font-bold text-[#214a58]">{selectedTeam.name}</h3>
                    <p className="mt-2 text-xs font-semibold text-[#3a6955]">
                      <Award size={12} className="mr-1 inline" /> Leader: {selectedTeam.leader}
                    </p>
                    <p className="mt-4 border-t border-[#dbeae1] pt-4 text-sm font-semibold leading-6 text-[#36535e]">
                      {selectedTeam.title}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#36535e]">
                      Problem Statement ID (SIH26-xxx format)
                    </label>
                    <input
                      value={problemNumber}
                      onChange={(e: any) => setProblemNumber(e.target.value)}
                      placeholder="e.g. SIH26-AG-004 or SIH26-1023"
                      className="field"
                    />
                  </div>
                  <div className="flex justify-between">
                    <BackButton onClick={() => setStep(1)} />
                    <PrimaryButton onClick={() => setStep(3)}>
                      Start scoring <ArrowRight size={16} />
                    </PrimaryButton>
                  </div>
                </div>
              </>
            ) : step === 3 ? (
              <>
                <SectionHead
                  title="Evaluation scoring"
                  subtitle="Assign marks based on the team's performance across each criterion."
                />
                <div className="p-6">
                  <div className="mb-6 flex justify-between rounded-xl bg-[#f4faf7] px-5 py-4">
                    <b>{selectedTeam.name}</b>
                    <b className="text-[#16834c]">{total} / 100</b>
                  </div>
                  <div className="flex flex-col gap-4">
                    {criteria.map(([label, max, hint], i) => (
                      <div key={label} className="rounded-xl border p-4">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#31505b]">{label}</p>
                            <p className="mt-1 text-xs text-[#8a9ba2]">{hint}</p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={max}
                            value={scores[i]}
                            onChange={(e: any) =>
                              setScores(
                                scores.map((score: number, j: number) =>
                                  j === i ? Math.min(max, Math.max(0, Number(e.target.value))) : score,
                                ),
                              )
                            }
                            className="score-field"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={remarks}
                    onChange={(e: any) => setRemarks(e.target.value)}
                    rows={4}
                    placeholder="Share constructive feedback for the team..."
                    className="field mt-6 resize-none"
                  />
                  <div className="mt-8 flex justify-between">
                    <BackButton onClick={() => setStep(2)} />
                    <PrimaryButton onClick={() => setStep(4)}>
                      Review evaluation <ArrowRight size={16} />
                    </PrimaryButton>
                  </div>
                </div>
              </>
            ) : (
              <>
                <SectionHead title="Review & submit" subtitle="Verify the information before submitting." />
                <div className="flex flex-col gap-4 p-6">
                  <ReviewRow label="Evaluator" value={`${evaluator} · ${role}`} />
                  <ReviewRow label="Team" value={`${selectedTeam.name} (${selectedTeam.code})`} />
                  <ReviewRow label="Team Leader" value={selectedTeam.leader} />
                  <ReviewRow label="Problem statement" value={`${problemNumber} · ${selectedTeam.title}`} />
                  <div className="rounded-xl border p-4">
                    <div className="mb-3 flex justify-between">
                      <b>Score breakdown</b>
                      <b className="text-[#16834c]">{total} / 100</b>
                    </div>
                    {criteria.map(([label, max], i) => (
                      <div className="flex justify-between text-xs" key={label}>
                        <span>{label}</span>
                        <b>
                          {scores[i]} / {max}
                        </b>
                      </div>
                    ))}
                  </div>
                  {remarks && <p className="rounded-xl bg-[#f7f9fa] p-4 text-sm text-[#5d747d]">{remarks}</p>}
                  <div className="flex justify-between">
                    <BackButton onClick={() => setStep(3)} />
                    <button
                      onClick={submit}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-[#16834c] px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="animate-spin" size={17} /> Saving...
                        </>
                      ) : (
                        <>
                          <Check size={17} /> Confirm & submit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </>
  )
}

function PageIntro({ eyebrow, title, subtitle }: any) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e16c25]">{eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#193d4d] sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-[#71858d]">{subtitle}</p>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <div className="p-12 text-center text-sm text-[#77909a]">{text}</div>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dce5e8] bg-white shadow-[0_4px_20px_rgba(32,71,84,0.04)]">
      {children}
    </div>
  )
}

function SectionHead({ title, subtitle }: any) {
  return (
    <div className="border-b border-[#e4ecee] px-6 py-5">
      <h2 className="text-lg font-bold text-[#244958]">{title}</h2>
      <p className="mt-1 text-sm text-[#77909a]">{subtitle}</p>
    </div>
  )
}

function Step({ number, label, active, current }: any) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          current
            ? 'bg-[#16834c] text-white'
            : active
              ? 'bg-[#dff1e7] text-[#16834c]'
              : 'bg-[#e7edef] text-[#84969d]'
        }`}
      >
        {active && !current && number < 4 ? <Check size={15} /> : number}
      </div>
      <span
        className={`hidden text-xs font-bold sm:block ${
          current ? 'text-[#245464]' : 'text-[#84969d]'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function StepLine({ active }: any) {
  return <div className={`mx-2 h-px min-w-4 flex-1 ${active ? 'bg-[#78c596]' : 'bg-[#dce5e8]'}`} />
}

function RoleCard({ title, subtitle, selected, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left ${
        selected ? 'border-[#16834c] bg-[#f1faf5]' : 'border-[#e0e8ea]'
      }`}
    >
      <span className="size-5 rounded-full border-2 p-1">
        {selected && <span className="block size-2.5 rounded-full bg-[#16834c]" />}
      </span>
      <span>
        <b className="block text-[#284c59]">{title}</b>
        <small className="mt-1 block text-xs text-[#80949b]">{subtitle}</small>
      </span>
    </button>
  )
}

function PrimaryButton({ children, disabled, onClick }: any) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg bg-[#16834c] px-5 py-3 text-sm font-bold text-white disabled:bg-[#b7cbc1]"
    >
      {children}
    </button>
  )
}

function BackButton({ onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-[#70868e]">
      <ArrowLeft size={16} />Back
    </button>
  )
}

function ReviewRow({ label, value }: any) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#edf1f2] pb-4 sm:flex-row sm:justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-[#8a9da4]">{label}</span>
      <span className="text-sm font-semibold text-[#36535e] sm:text-right">{value}</span>
    </div>
  )
}

function SuccessState({ team, evaluator, total, onReset }: any) {
  return (
    <Card>
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#e2f5e9] text-[#16834c]">
          <CheckCircle2 size={34} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e16c25]">Evaluation submitted</p>
        <h2 className="mt-2 text-2xl font-bold text-[#244958]">Assessment recorded successfully</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#77909a]">
          Thank you, {evaluator}. Your evaluation for <strong>{team.name}</strong> has been saved to the database.
        </p>
        <p className="mt-6 font-bold text-[#16834c]">
          {team.code} · {total} / 100
        </p>
        <button onClick={onReset} className="mt-8 text-sm font-bold text-[#16834c]">
          Start another evaluation
        </button>
      </div>
    </Card>
  )
}
