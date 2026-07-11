'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResultsBoard, TurnoutMeter, useLiveStats } from '@/components/live-results'
import { StatusPill } from '@/components/status-pill'
import type { ElectionStatus } from '@/lib/types'

// Public big-screen view. Anonymous viewers can't use realtime (RLS),
// so it polls the aggregate RPC every 5 seconds.
export default function ProjectorPage() {
  const [election, setElection] = useState<{ id: string; title: string; status: ElectionStatus } | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    createClient()
      .rpc('get_active_election')
      .then(({ data }) => {
        setElection(data ?? null)
        setChecked(true)
      })
  }, [])

  if (!checked) return null
  if (!election)
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        No active election to display.
      </div>
    )

  return <ProjectorBoard electionId={election.id} />
}

function ProjectorBoard({ electionId }: { electionId: string }) {
  const stats = useLiveStats(electionId, 5000)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!stats) return null

  return (
    <div className="bg-aurora dark min-h-screen bg-background p-8 text-foreground sm:p-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold sm:text-5xl">{stats.election.title}</h1>
          <StatusPill status={stats.election.status as ElectionStatus} />
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl tabular-nums">{clock}</p>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">live · auto-refreshing</p>
        </div>
      </header>
      <div className="space-y-6">
        <TurnoutMeter stats={stats} big />
        <ResultsBoard stats={stats} big />
      </div>
    </div>
  )
}
