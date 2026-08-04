'use client'

import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ResultsBoard, TurnoutMeter, useLiveStats, type LiveStats } from '@/components/live-results'
import { logAudit } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'

async function exportCsv(stats: LiveStats) {
  const lines = ['position,candidate,party_list,votes']
  for (const pos of stats.results ?? []) {
    for (const c of pos.candidates) {
      lines.push(
        [pos.position_name, c.candidate_name, c.party_list, c.votes]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(','),
      )
    }
  }
  lines.push('')
  lines.push(`"Turnout","${stats.turnout.voted} of ${stats.turnout.total}","",""`)
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${stats.election.title.replaceAll(' ', '-')}-results.csv`
  try {
    await logAudit('Results exported (CSV)', { election_id: stats.election.id })
  } catch {
    // Export should still work even if audit logging is temporarily unavailable.
  } finally {
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

export default function ResultsPage() {
  const [electionId, setElectionId] = useState('')

  useEffect(() => {
    createClient()
      .rpc('get_active_election')
      .then(({ data }) => data?.id && setElectionId(data.id))
  }, [])

  if (!electionId)
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Live Results</h1>
        <div className="glass mt-6 rounded-2xl p-10 text-center text-sm text-muted-foreground">No active election.</div>
      </div>
    )
  return <Dashboard electionId={electionId} />
}

function Dashboard({ electionId }: { electionId: string }) {
  const stats = useLiveStats(electionId)
  if (!stats) return null

  return (
    <div className="mx-auto max-w-6xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Live Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">{stats.election.title} — updates in realtime</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!stats.results} onClick={() => void exportCsv(stats)}>
            <Download data-icon="inline-start" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer data-icon="inline-start" /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <TurnoutMeter stats={stats} />
        <ResultsBoard stats={stats} />
      </div>
    </div>
  )
}
