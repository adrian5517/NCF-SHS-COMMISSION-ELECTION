'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setElectionStatus } from '@/lib/actions/elections'
import { useLiveStats, TurnoutMeter } from '@/components/live-results'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/skeleton'
import type { Election } from '@/lib/types'

export default function AdminOverview() {
  const [election, setElection] = useState<Election | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('elections')
      .select('*')
      .in('status', ['upcoming', 'ongoing', 'closed'])
      .order('created_at', { ascending: false })
      .limit(1)
    setElection((data?.[0] as Election) ?? null)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Election command center</p>

      {!loaded && (
        <div className="mt-8 space-y-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {loaded && !election && (
        <div className="glass mt-8 rounded-2xl p-10 text-center">
          <CalendarClock className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">No active election yet.</p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/admin/elections" />}>
            Create an election <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}

      {election && (
        <>
          <div className="glass mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{election.title}</h2>
                <StatusPill status={election.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(election.start_date).toLocaleString()} —{' '}
                {new Date(election.end_date).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {election.status === 'ongoing' && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Emergency close this election? Students will no longer be able to vote.')) return
                    await setElectionStatus(election.id, 'closed')
                    load()
                  }}
                >
                  <AlertTriangle data-icon="inline-start" /> Emergency Close
                </Button>
              )}
              <Button variant="outline" nativeButton={false} render={<Link href="/admin/elections" />}>
                Manage
              </Button>
            </div>
          </div>
          <div className="mt-5">
            <OverviewStats electionId={election.id} />
          </div>
        </>
      )}
    </div>
  )
}

function OverviewStats({ electionId }: { electionId: string }) {
  const stats = useLiveStats(electionId)
  if (!stats) return <Skeleton className="h-48 w-full" />
  return <TurnoutMeter stats={stats} />
}
