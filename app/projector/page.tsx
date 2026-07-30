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
      {/* 3-column grid keeps the crests centered without ever overlapping the
          title or stats, and every size scales with the viewport (laptop → big TV). */}
      <header className="relative z-10 mb-[clamp(0.75rem,1.5vh,1.5rem)] grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[clamp(1.25rem,2.4vw,3.25rem)] font-bold">{stats.election.title}</h1>
          <div className="shrink-0">
            <StatusPill status={stats.election.status as ElectionStatus} />
          </div>
        </div>
        <div className="flex items-center justify-self-center gap-[clamp(0.75rem,1.5vw,1.75rem)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ncf-shs.png" alt="Naga College Foundation" className="h-[clamp(2.75rem,4.5vw,5.5rem)] w-auto object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dlssa-logo.png" alt="La Sallian Schools Supervision Services Association" className="h-[clamp(2.75rem,4.5vw,5.5rem)] w-auto object-contain" />
        </div>
        <div className="flex items-center justify-self-end gap-[clamp(1rem,2vw,2.25rem)]">
          <div className="text-right">
            <p className="font-display text-[clamp(1.25rem,1.9vw,2.5rem)] leading-none font-bold tabular-nums">{pct}%</p>
            <p className="mt-1 text-[clamp(0.6rem,0.8vw,0.95rem)] text-muted-foreground">
              {voted}/{total} voted
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[clamp(1.25rem,1.9vw,2.5rem)] leading-none tabular-nums">{clock}</p>
            <p className="mt-1 text-[clamp(0.55rem,0.7vw,0.85rem)] tracking-widest text-muted-foreground uppercase">live · auto-refreshing</p>
          </div>
        </div>
      </header>
      <div className="relative z-10 min-h-0 flex-1">
        <ProjectorGrid stats={stats} />
      </div>
    </div>
  )
}
