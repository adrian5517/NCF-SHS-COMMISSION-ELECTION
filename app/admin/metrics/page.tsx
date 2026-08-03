import Link from 'next/link'
import { Activity, AlertTriangle, CheckCircle2, Clock3, RotateCcw, ShieldCheck } from 'lucide-react'
import { getVoteSubmitMetrics } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  )
}

export default async function AdminMetricsPage() {
  const metrics = await getVoteSubmitMetrics()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Submission Metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Realtime snapshot of ballot submit protections and outcomes.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/metrics" />}>
          <RotateCcw data-icon="inline-start" /> Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Successful submits" value={metrics.successful} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Failed submits" value={metrics.failed} icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Prevented: in-flight" value={metrics.preventedInFlight} icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Prevented: recent replay" value={metrics.preventedRecent} icon={<Activity className="size-4" />} />
        <StatCard label="Active in-flight" value={metrics.activeInFlight} icon={<Clock3 className="size-4" />} />
        <StatCard label="Recent dedupe cache" value={metrics.recentCacheSize} icon={<Activity className="size-4" />} />
      </div>

      <div className="glass mt-5 rounded-2xl p-5 text-sm text-muted-foreground">
        <p>
          This page reads in-memory counters from the running app instance. Values reset when the server restarts.
        </p>
        <p className="mt-1">
          Last metrics log at:{' '}
          {metrics.lastLoggedAt ? new Date(metrics.lastLoggedAt).toLocaleString() : 'No log emitted yet'}
        </p>
      </div>
    </div>
  )
}