'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, Printer, RefreshCw, RotateCcw, Search, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { bulkGenerateCodes, regenerateCode, resetElectionVotes } from '@/lib/actions/codes'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import type { Election, Student, VotingCode } from '@/lib/types'

const field =
  'rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = Math.floor((new Date(expiresAt).getTime() - now) / 1000)
  if (remaining <= 0) return <span className="text-xs font-medium text-destructive">expired</span>
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return (
    <span className={`font-mono text-xs tabular-nums ${remaining < 60 ? 'text-destructive' : 'text-chart-2'}`}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

type CodeStatus = 'no-code' | 'active' | 'expired' | 'voted'
type SortKey = 'name' | 'id' | 'newest'

export default function CodesPage() {
  const [election, setElection] = useState<Election | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [codes, setCodes] = useState<VotingCode[]>([])
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [search, setSearch] = useState('')
  const [codeStatus, setCodeStatus] = useState<CodeStatus | ''>('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [minutes, setMinutes] = useState(10)
  const [skipActive, setSkipActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: el } = await supabase
      .from('elections')
      .select('*')
      .in('status', ['upcoming', 'ongoing'])
      .order('created_at', { ascending: false })
      .limit(1)
    const active = (el?.[0] as Election) ?? null
    setElection(active)
    const [{ data: st }, { data: vc }] = await Promise.all([
      supabase.from('students').select('*').order('full_name'),
      active
        ? supabase.from('voting_codes').select('*').eq('election_id', active.id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])
    setStudents((st as Student[]) ?? [])
    setCodes((vc as VotingCode[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(id)
  }, [message])

  // The moment a student votes or a code is used, every row updates live.
  useRealtime(['students', 'voting_codes'], load)

  const grades = useMemo(() => [...new Set(students.map((s) => s.grade_level))], [students])
  const sections = useMemo(
    () => [...new Set(students.filter((s) => !grade || s.grade_level === grade).map((s) => s.section))],
    [students, grade],
  )

  const latestCode = useMemo(() => {
    const map = new Map<string, VotingCode>()
    for (const c of codes) if (!map.has(c.student_id)) map.set(c.student_id, c)
    return map
  }, [codes])

  function statusOf(s: Student): CodeStatus {
    if (s.status === 'voted') return 'voted'
    const code = latestCode.get(s.id)
    if (!code) return 'no-code'
    if (new Date(code.expires_at).getTime() < Date.now()) return 'expired'
    return 'active'
  }

  const filtered = students
    .filter(
      (s) =>
        (!grade || s.grade_level === grade) &&
        (!section || s.section === section) &&
        (!codeStatus || statusOf(s) === codeStatus) &&
        (!search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.lrn.includes(search)),
    )
    .sort((a, b) => {
      if (sortKey === 'id') return a.lrn.localeCompare(b.lrn)
      if (sortKey === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return a.full_name.localeCompare(b.full_name)
    })

  if (election === null)
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Voting Codes</h1>
        <div className="glass mt-6 rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No upcoming or ongoing election. Open one under Elections first.
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Voting Codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live token manager — {election.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer data-icon="inline-start" /> Print code list
          </Button>
          <Button
            variant="destructive"
            disabled={resetting}
            onClick={async () => {
              const typed = prompt(
                `This permanently deletes ALL cast votes and voting codes for "${election.title}", and puts every student who voted back to pending so the election can be re-run.\n\nThis cannot be undone.\n\nType the election title to confirm:`,
              )
              if (typed !== election.title) {
                if (typed !== null) alert('Title did not match — reset cancelled.')
                return
              }
              setResetting(true)
              const result = await resetElectionVotes(election.id)
              setResetting(false)
              setMessage(
                result.ok
                  ? `Reset complete: ${result.data?.votesDeleted} votes deleted, ${result.data?.studentsReset} students set back to pending.`
                  : result.error,
              )
              load()
            }}
          >
            <RotateCcw data-icon="inline-start" /> {resetting ? 'Resetting…' : 'Reset votes'}
          </Button>
        </div>
      </div>

      <div className="no-print mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Generate codes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Pick a grade level and section, then bulk-generate.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Grade level</label>
              <select className={field} value={grade} onChange={(e) => { setGrade(e.target.value); setSection('') }}>
                <option value="">All grades</option>
                {grades.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Section</label>
              <select className={field} value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Code lifetime</label>
              <select className={field} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {[5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button
              disabled={busy || !grade || !section}
              onClick={async () => {
                setBusy(true)
                const result = await bulkGenerateCodes({
                  electionId: election.id,
                  gradeLevel: grade,
                  section,
                  minutes,
                  force: !skipActive,
                })
                setBusy(false)
                setMessage(
                  result.ok
                    ? `Generated ${result.data?.count} code${result.data?.count === 1 ? '' : 's'} for ${grade} — ${section}${
                        result.data && result.data.skipped > 0
                          ? ` (${result.data.skipped} already had an active code, skipped).`
                          : '.'
                      }`
                    : result.error,
                )
                load()
              }}
            >
              <Zap data-icon="inline-start" /> {busy ? 'Generating…' : 'Bulk generate codes'}
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={skipActive} onChange={(e) => setSkipActive(e.target.checked)} />
              Skip students with an active code
            </label>
          </div>
          {(!grade || !section) && (
            <p className="mt-3 text-xs text-muted-foreground">Pick a grade level and section to bulk-generate codes.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Filter &amp; view</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Narrow the list below without changing what gets generated.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Code status</label>
              <select className={field} value={codeStatus} onChange={(e) => setCodeStatus(e.target.value as CodeStatus | '')}>
                <option value="">All statuses</option>
                <option value="no-code">No code yet (new students)</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="voted">Voted</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sort by</label>
              <select className={field} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="newest">Newest students first</option>
                <option value="name">Name</option>
                <option value="id">Student ID</option>
              </select>
            </div>
            <div className="relative min-w-40 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className={`${field} w-full pl-9`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="no-print mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-4 hidden print:block">
        <h2 className="text-xl font-bold">
          {election.title} — Voting codes {grade && `· ${grade}`} {section && `· ${section}`}
        </h2>
      </div>

      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Student ID</th>
              <th className="px-4 py-3 font-medium">Grade / Section</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="no-print px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const code = latestCode.get(s.id)
              return (
                <tr key={s.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{s.full_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.lrn}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {s.grade_level} — {s.section}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.status === 'voted' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : code ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 font-mono text-sm font-bold tracking-widest text-primary">
                        <KeyRound className="size-3.5" />
                        {code.code}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">no code</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.status !== 'voted' && code && !code.is_used ? <Countdown expiresAt={code.expires_at} /> : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === 'voted' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s.status === 'voted' ? 'VOTED' : 'pending'}
                    </span>
                  </td>
                  <td className="no-print px-4 py-2.5 text-right">
                    {s.status !== 'voted' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const result = await regenerateCode({ electionId: election.id, studentId: s.id, minutes })
                          setMessage(result.ok ? `New code generated for ${s.full_name}.` : result.error)
                          load()
                        }}
                      >
                        <RefreshCw data-icon="inline-start" /> Regenerate
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No students found — import the masterlist first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
