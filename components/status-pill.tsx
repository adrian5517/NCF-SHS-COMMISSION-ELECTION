import type { ElectionStatus } from '@/lib/types'

const styles: Record<ElectionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  upcoming: 'bg-chart-4/15 text-chart-4',
  ongoing: 'bg-success/15 text-success',
  closed: 'bg-destructive/15 text-destructive',
  archived: 'bg-muted text-muted-foreground',
}

export function StatusPill({ status }: { status: ElectionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status === 'ongoing' && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
      {status}
    </span>
  )
}
