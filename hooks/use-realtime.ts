'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to postgres_changes on the given tables and invoke the callback
 * (debounced) whenever any of them change. Used by the live dashboards.
 */
export function useRealtime(tables: string[], onChange: () => void, debounceMs = 400) {
  const callback = useRef(onChange)
  callback.current = onChange

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => callback.current(), debounceMs)
    }

    const channel = supabase.channel(`live:${tables.join(',')}`)
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
    }
    channel.subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), debounceMs])
}
