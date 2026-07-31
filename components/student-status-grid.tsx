'use client'

import { useMemo, useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import type { Student } from '@/lib/types'

const field =
  'rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

  // Deterministic red/peach gradient per student so avatars stay stable across reloads.
const GRADIENTS = [
  'from-chart-1 to-chart-3',
  'from-chart-2 to-chart-4',
  'from-chart-1 to-chart-2',
  'from-chart-3 to-chart-5',
]

function gradientFor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function Avatar({ student, size = 'md' }: { student: Student; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm'
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-primary-foreground ${dims} ${gradientFor(student.id)}`}
      aria-hidden
    >
      {initials(student.full_name)}
    </div>
  )
}

function StatusPill({ status }: { status: Student['status'] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === 'voted' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
      }`}
    >
      {status === 'voted' ? 'Voted' : 'Pending'}
    </span>
  )
}

export function StudentStatusGrid({ students }: { students: Student[] }) {
  const [view, setView] = useState<'card' | 'list'>('list')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => s.full_name.toLowerCase().includes(q) || s.lrn.toLowerCase().includes(q))
  }, [students, search])

  const voted = students.filter((s) => s.status === 'voted').length

  return (
    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Students</h3>
          <p className="text-xs text-muted-foreground">
            {voted} of {students.length} voted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search name or Student ID…"
              className={`${field} w-48 pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl border border-input p-0.5">
            <button
              type="button"
              aria-pressed={view === 'list'}
              aria-label="List view"
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="size-4" /> List
            </button>
            <button
              type="button"
              aria-pressed={view === 'card'}
              aria-label="Card view"
              onClick={() => setView('card')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                view === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="size-4" /> Card
            </button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="mt-4 max-h-96 divide-y divide-border/50 overflow-y-auto">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2.5">
              <Avatar student={s} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.full_name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {s.lrn} · {s.grade_level} — {s.section}
                </p>
              </div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/40 p-4 text-center">
              <Avatar student={s} size="lg" />
              <p className="w-full truncate text-sm font-medium">{s.full_name}</p>
              <p className="w-full truncate font-mono text-xs text-muted-foreground">{s.lrn}</p>
              <p className="w-full truncate text-xs text-muted-foreground">
                {s.grade_level} — {s.section}
              </p>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No students found.</p>}
    </section>
  )
}
