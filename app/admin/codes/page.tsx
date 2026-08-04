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
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  // Long-lived codes (hours/days) read better as "5h 03m" than a huge m:ss.
  const label = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(s).padStart(2, '0')}`
  return (
    <span className={`font-mono text-xs tabular-nums ${remaining < 60 ? 'text-destructive' : 'text-chart-2'}`}>
      {label}
    </span>
  )
}

type CodeStatus = 'no-code' | 'active' | 'expired' | 'voted'
type SortKey = 'name' | 'id' | 'newest'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

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
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [typedTitle, setTypedTitle] = useState('')
  const [page, setPage] = useState(0)
  const rowsPerPage = 50

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
    if (active) {
      const allCodes: VotingCode[] = []
      const VC_CHUNK = 1000
      let vcFrom = 0
      let vcHasMore = true
      while (vcHasMore) {
        const { data: chunk } = await supabase
          .from('voting_codes')
          .select('*')
          .eq('election_id', active.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(vcFrom, vcFrom + VC_CHUNK - 1)
        if (!chunk?.length) { vcHasMore = false; break }
        allCodes.push(...(chunk as VotingCode[]))
        if (chunk.length < VC_CHUNK) vcHasMore = false
        vcFrom += VC_CHUNK
      }
      setCodes(allCodes)
    }

    // Fetch students in chunks to work around PostgREST's default row limit.
    const allStudents: Student[] = []
    const CHUNK = 1000
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: chunk, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name')
        .range(from, from + CHUNK - 1)
      if (error) break
      if (!chunk?.length) { hasMore = false; break }
      allStudents.push(...(chunk as Student[]))
      if (chunk.length < CHUNK) hasMore = false
      from += CHUNK
    }
    setStudents(allStudents)
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

  function printAllCodes() {
    const byGrade: Record<string, Record<string, Student[]>> = {}
    for (const s of students) {
      if (s.status === 'voted') continue
      if (grade && s.grade_level !== grade) continue
      if (section && s.section !== section) continue
      const code = latestCode.get(s.id)
      if (!code) continue
      if (!byGrade[s.grade_level]) byGrade[s.grade_level] = {}
      if (!byGrade[s.grade_level][s.section]) byGrade[s.grade_level][s.section] = []
      byGrade[s.grade_level][s.section].push(s)
    }

    const rows: string[] = []
    for (const grade of Object.keys(byGrade).sort()) {
      rows.push(`<section style="page-break-before:auto;margin-bottom:1.5rem">`)
      for (const section of Object.keys(byGrade[grade]).sort()) {
        const list = byGrade[grade][section].sort((a, b) => a.full_name.localeCompare(b.full_name))
        rows.push(`<h3 style="font-size:1rem;font-weight:600;margin:1rem 0 0.25rem;color:#555">Grade ${escapeHtml(grade)} — Section ${escapeHtml(section)} <span style="font-weight:400;color:#999">(${list.length} students)</span></h3>`)
        rows.push(`<table style="width:100%;border-collapse:collapse;font-size:0.8rem">`)
        rows.push(`<thead><tr style="border-bottom:2px solid #222;text-align:left">`)
        rows.push(`<th style="padding:4px 8px">#</th>`)
        rows.push(`<th style="padding:4px 8px">Student</th>`)
        rows.push(`<th style="padding:4px 8px">Student ID</th>`)
        rows.push(`<th style="padding:4px 8px">Code</th>`)
        rows.push(`<th style="padding:4px 8px">Status</th>`)
        rows.push(`</tr></thead><tbody>`)
        list.forEach((s, i) => {
          const code = latestCode.get(s.id)!
          rows.push(`<tr style="border-bottom:1px solid #ddd">`)
          rows.push(`<td style="padding:3px 8px;color:#888;width:2rem">${i + 1}</td>`)
          rows.push(`<td style="padding:3px 8px">${escapeHtml(s.full_name)}</td>`)
          rows.push(`<td style="padding:3px 8px;font-family:monospace;font-size:0.75rem">${escapeHtml(s.lrn)}</td>`)
          rows.push(`<td style="padding:3px 8px;font-family:monospace;font-weight:700;letter-spacing:0.08em">${escapeHtml(code.code)}</td>`)
          rows.push(`<td style="padding:3px 8px;font-size:0.7rem;color:${s.status === 'voted' ? '#16a34a' : '#888'}">${s.status === 'voted' ? 'VOTED' : 'pending'}</td>`)
          rows.push(`</tr>`)
        })
        rows.push(`</tbody></table>`)
      }
      rows.push(`</section>`)
    }

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html>
<html>
<head><title>Voting Codes — ${escapeHtml(election?.title ?? '')}</title>
<style>
  @page { margin: 1.5cm }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#222; padding:0 }
  header { display:flex; align-items:center; gap:12px; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:2px solid #222 }
  header img { height:44px; width:44px; border-radius:50%; object-fit:contain }
  header h1 { font-size:1.4rem }
  header p { font-size:0.75rem; color:#777 }
  @media print {
    button { display:none }
    section { page-break-inside:avoid }
  }
</style></head>
<body>
<header>
  <img src="/ncf-shs.png" alt="" />
  <div>
    <h1>Voting Codes — ${escapeHtml(election?.title ?? '')}</h1>
    <p>Generated ${new Date().toLocaleString()} &middot; ${Object.values(byGrade).reduce((s, sections) => s + Object.values(sections).reduce((a, l) => a + l.length, 0), 0)} students${grade ? ` &middot; Grade ${grade}` : ''}${section ? ` &middot; ${section}` : ''}</p>
  </div>
</header>
${rows.join('\n')}
<div style="margin-top:2rem;padding-top:0.75rem;border-top:1px solid #ccc;font-size:0.7rem;color:#999;text-align:center">
  NCF SHS Commission on Elections &middot; Printed ${new Date().toLocaleString()}
</div>
<script>document.addEventListener('DOMContentLoaded',()=>{window.print()})<${''}/script>
</body></html>`)
    w.document.close()
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
  const pageCount = Math.ceil(filtered.length / rowsPerPage)
  const safePage = Math.min(page, Math.max(pageCount - 1, 0))
  const paginated = filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage)
  useEffect(() => { setPage(0) }, [grade, section, codeStatus, search, sortKey])

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
          <Button variant="outline" onClick={printAllCodes}>
            <Printer data-icon="inline-start" /> Print all codes
          </Button>
          <Button
            variant="destructive"
            disabled={resetting}
            onClick={() => {
              setTypedTitle('')
              setConfirmingReset(true)
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
                {[
                  { m: -1, label: 'Never (no expiry)' },
                  { m: 5, label: '5 minutes' },
                  { m: 10, label: '10 minutes' },
                  { m: 15, label: '15 minutes' },
                  { m: 30, label: '30 minutes' },
                  { m: 60, label: '1 hour' },
                  { m: 1440, label: '1 day (24 hours)' },
                ].map(({ m, label }) => (
                  <option key={m} value={m}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button
              disabled={busy}
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
                const scope = grade && section ? `${grade} — ${section}` : grade || section || 'all pending students'
                setMessage(
                  result.ok
                    ? `Generated ${result.data?.count} code${result.data?.count === 1 ? '' : 's'} for ${scope}${
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
          {!grade && !section && (
            <p className="mt-3 text-xs text-muted-foreground">Leave both empty to generate codes for all pending students across all grades and sections.</p>
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
            {paginated.map((s) => {
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

      <div className="no-print mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {filtered.length > 0
            ? `${safePage * rowsPerPage + 1}–${Math.min((safePage + 1) * rowsPerPage, filtered.length)} of ${filtered.length}`
            : '0 students'}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {confirmingReset && election && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !resetting && setConfirmingReset(false)}
            />
            <motion.div
              className="glass relative w-full max-w-md rounded-3xl p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
            >
              <h2 className="text-lg font-semibold text-destructive">Reset votes?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This permanently deletes ALL votes, abstentions, tallies, and voting codes, then sets
                EVERY student back to pending. This cannot be undone.
              </p>
              <label className="mt-4 block text-xs font-medium text-muted-foreground">
                Type <span className="font-semibold text-foreground">{election.title}</span> to confirm
              </label>
              <input
                autoFocus
                disabled={resetting}
                className={`${field} mt-1.5 w-full`}
                value={typedTitle}
                onChange={(e) => setTypedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setConfirmingReset(false)
                }}
                placeholder={election.title}
              />
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" disabled={resetting} onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={typedTitle.trim() !== election.title || resetting}
                  onClick={async () => {
                    setResetting(true)
                    const result = await resetElectionVotes(election.id)
                    setResetting(false)
                    setMessage(
                      result.ok
                        ? `Reset complete: ${result.data?.votesDeleted} votes deleted, ${result.data?.studentsReset} students set back to pending.`
                        : result.error,
                    )
                    setConfirmingReset(false)
                    load()
                  }}
                >
                  <RotateCcw data-icon="inline-start" /> {resetting ? 'Resetting…' : 'Reset everything'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
