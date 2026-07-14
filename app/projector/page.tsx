'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLiveStats } from '@/components/live-results'
import { ProjectorGrid } from '@/components/projector-grid'
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

  const { total, voted } = stats.turnout
  const pct = total ? Math.round((voted / total) * 100) : 0

  return (
    <div className="bg-aurora dark relative flex h-screen flex-col overflow-hidden bg-background p-6 text-foreground sm:p-8">
      {/* Big centered school crest, watermarked behind the board. */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ncf-logo.webp" alt="" className="w-[68vmin] max-w-none opacity-[0.07] mix-blend-screen" />
      </div>
      <header className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* School crests, centered above the board. */}
        <div className="pointer-events-none absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gradeschool-logo.png" alt="Naga College Foundation" className="h-16 w-auto object-contain sm:h-20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dlssa-logo.png" alt="La Sallian Schools Supervision Services Association" className="h-16 w-auto object-contain sm:h-20" />
        </div>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold sm:text-4xl">{stats.election.title}</h1>
          <StatusPill status={stats.election.status as ElectionStatus} />
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">{pct}%</p>
            <p className="text-xs text-muted-foreground">
              {voted}/{total} voted
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl tabular-nums">{clock}</p>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">live · auto-refreshing</p>
          </div>
        </div>
      </header>
      <div className="relative z-10 min-h-0 flex-1">
        <ProjectorGrid stats={stats} />
      </div>
    </div>
  )
}
