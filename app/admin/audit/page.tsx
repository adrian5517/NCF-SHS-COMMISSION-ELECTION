'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/lib/types'

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    setLogs((data as AuditLog[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every sensitive action, for transparency</p>

      <div className="glass mt-6 divide-y divide-border/50 rounded-2xl">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
            <div>
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {log.actor}
                {Object.keys(log.details ?? {}).length > 0 && (
                  <span className="ml-2 font-mono">{JSON.stringify(log.details)}</span>
                )}
              </p>
            </div>
            <time className="text-xs whitespace-nowrap text-muted-foreground">
              {new Date(log.created_at).toLocaleString()}
            </time>
          </div>
        ))}
        {logs.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity yet.</p>}
      </div>
    </div>
  )
}
