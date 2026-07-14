'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, LayoutDashboard, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ResultsBoard, TurnoutMeter, useLiveStats } from '@/components/live-results'
import { StudentStatusGrid } from '@/components/student-status-grid'
import { useRealtime } from '@/hooks/use-realtime'
import type { AuditLog, Student } from '@/lib/types'

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'results', label: 'Results', icon: Trophy },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const

type ViewId = (typeof VIEWS)[number]['id']
const VIEW_PREF_KEY = 'ncf-watch-view'

export default function WatchPage() {
  const [electionId, setElectionId] = useState('')

  useEffect(() => {
    createClient()
      .rpc('get_active_election')
      .then(({ data }) => data?.id && setElectionId(data.id))
  }, [])

  if (!electionId)
    return <div className="glass mx-auto max-w-3xl rounded-2xl p-10 text-center text-sm text-muted-foreground">No active election.</div>

  return <WatchDashboard electionId={electionId} />
}

function WatchDashboard({ electionId }: { electionId: string }) {
  const stats = useLiveStats(electionId)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [view, setView] = useState<ViewId>('overview')

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_PREF_KEY) as ViewId | null
    if (saved && VIEWS.some((v) => v.id === saved)) setView(saved)
  }, [])

  const changeView = (id: ViewId) => {
    setView(id)
    localStorage.setItem(VIEW_PREF_KEY, id)
  }

  const loadLogs = useCallback(async () => {
    const { data } = await createClient()
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs((data as AuditLog[]) ?? [])
  }, [])

  const loadStudents = useCallback(async () => {
    const { data } = await createClient().from('students').select('*').order('full_name')
    setStudents((data as Student[]) ?? [])
  }, [])

  useEffect(() => {
    loadLogs()
    loadStudents()
  }, [loadLogs, loadStudents])
  useRealtime(['audit_logs'], loadLogs)
  useRealtime(['students'], loadStudents)

  if (!stats) return null

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{stats.election.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live monitoring — updates in realtime</p>
        </div>
        <div className="glass no-print flex gap-0.5 rounded-xl p-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => changeView(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {view === 'overview' && (
            <div className="space-y-5">
              <TurnoutMeter stats={stats} />
              <ResultsBoard stats={stats} defaultView="cards" big />
            </div>
          )}
          {view === 'students' && <StudentStatusGrid students={students} />}
          {view === 'results' && <ResultsBoard stats={stats} />}
          {view === 'activity' && (
            <section className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold">Audit trail</h3>
              <div className="mt-3 max-h-[60vh] divide-y divide-border/50 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-baseline justify-between gap-2 py-2">
                    <div>
                      <p className="text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.actor}</p>
                    </div>
                    <time className="text-xs whitespace-nowrap text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </time>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
                )}
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
