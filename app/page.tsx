'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Menu, Search, X, Award, Loader2 } from 'lucide-react'

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

type Evaluation = {
  teamCode: string
  teamName: string
  evaluator: string
  role: string
  scores: number[]
  remarks: string
  problemNumber: string
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

  useEffect(() => {
    saveLS(LS_TEAMS, teams)
  }, [teams])

  useEffect(() => {
    saveLS(LS_EVALS, evaluations)
  }, [evaluations])

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as Team[]
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data)
          setSelectedTeam(data[0])
        }
      }
    } catch (e) {
      console.warn('fetch teams failed, using localStorage/fallback:', e)
    }
  }, [])

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch('/api/evaluations', { cache: 'no-store' })
      if (res.ok) {
        const rows = (await res.json()) as Array<{
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
        }>
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: Evaluation[] = rows.map((r) => ({
            teamCode: r.team_code,
            teamName: r.team_name,
            evaluator: r.evaluator,
            role: r.role,
            problemNumber: r.problem_number,
            remarks: r.remarks || '',
            scores: [
              r.innovation,
              r.problem_understanding,
              r.technical_feasibility,
              r.impact_scalability,
              r.presentation_demo,
              r.team_collaboration,
            ],
          }))
          setEvaluations(mapped)
        }
      }
    } catch (e) {
      console.warn('fetch evaluations failed, using localStorage:', e)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        await Promise.all([fetchTeams(), fetchEvaluations()])
      } catch {}
      setLoading(false)
    })()
  }, [fetchTeams, fetchEvaluations])

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
      setEvaluations((current) => [payload, ...current])
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

function TeamsView({
  teams: teamList,
  query,
  setQuery,
  evaluations,
  go,
}: {
  teams: Team[]
  query: string
  setQuery: (value: string) => void
  evaluations: Evaluation[]
  go: (view: ViewKey) => void
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
  return (
    <>
      <PageIntro
        eyebrow="Team result lookup"
        title="See how your team performed"
        subtitle="Enter your team name to view only your team's scores and suggestions."
      />
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
    </>
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
