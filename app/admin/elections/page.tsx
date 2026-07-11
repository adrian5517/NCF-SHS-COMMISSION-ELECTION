'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, EyeOff, Pencil, Play, Plus, Square, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteElection, saveElection, setElectionStatus, toggleHideResults } from '@/lib/actions/elections'
import { uploadImage } from '@/lib/upload'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import type { Election } from '@/lib/types'

const field =
  'w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time
function toLocalInput(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const emptyForm = { title: '', description: '', logo_url: '', start_date: '', end_date: '' }

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [form, setForm] = useState<typeof emptyForm & { id?: string }>(emptyForm)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('elections').select('*').order('created_at', { ascending: false })
    setElections((data as Election[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!actionError) return
    const id = setTimeout(() => setActionError(''), 4000)
    return () => clearTimeout(id)
  }, [actionError])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result = await saveElection({
      ...form,
      logo_url: form.logo_url || null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    })
    setBusy(false)
    if (!result.ok) return setError(result.error)
    setForm(emptyForm)
    setEditing(false)
    load()
  }

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError('')
    const result = await fn()
    if (!result.ok) setActionError(result.error ?? 'Something went wrong.')
    load()
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Elections</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, schedule, open, and close elections</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setEditing(true)
          }}
        >
          <Plus data-icon="inline-start" /> New election
        </Button>
      </div>

      <AnimatePresence>
        {actionError && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive"
          >
            <TriangleAlert className="size-4 shrink-0" /> {actionError}
          </motion.p>
        )}
      </AnimatePresence>

      {editing && (
        <form onSubmit={submit} className="glass mt-6 space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit election' : 'New election'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input
                required
                className={field}
                placeholder="e.g., SSG Election 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                className={field}
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Starts</label>
              <input
                required
                type="datetime-local"
                className={field}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ends</label>
              <input
                required
                type="datetime-local"
                className={field}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Logo (optional)</label>
              <div className="flex items-center gap-3">
                {form.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Election logo preview" className="size-12 rounded-xl object-cover" />
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="size-4" /> Upload logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try {
                        setForm({ ...form, logo_url: await uploadImage(f, 'logos') })
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Upload failed')
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save election'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {elections.map((el) => (
          <div key={el.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {el.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={el.logo_url} alt="" className="size-10 rounded-lg object-cover" />
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-semibold">{el.title}</h3>
                    <StatusPill status={el.status} />
                    {el.hide_live_results && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <EyeOff className="size-3" /> results hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(el.start_date).toLocaleString()} — {new Date(el.end_date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {el.status !== 'ongoing' && el.status !== 'archived' && (
                  <Button size="sm" onClick={() => act(() => setElectionStatus(el.id, 'ongoing'))}>
                    <Play data-icon="inline-start" /> Open
                  </Button>
                )}
                {el.status === 'ongoing' && (
                  <Button size="sm" variant="destructive" onClick={() => act(() => setElectionStatus(el.id, 'closed'))}>
                    <Square data-icon="inline-start" /> Close
                  </Button>
                )}
                {el.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => act(() => setElectionStatus(el.id, 'upcoming'))}>
                    Publish
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(() => toggleHideResults(el.id, !el.hide_live_results))}
                >
                  <EyeOff data-icon="inline-start" /> {el.hide_live_results ? 'Show results' : 'Hide results'}
                </Button>
                {el.status === 'closed' && (
                  <Button size="sm" variant="ghost" onClick={() => act(() => setElectionStatus(el.id, 'archived'))}>
                    <Archive data-icon="inline-start" /> Archive
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForm({
                      id: el.id,
                      title: el.title,
                      description: el.description,
                      logo_url: el.logo_url ?? '',
                      start_date: toLocalInput(el.start_date),
                      end_date: toLocalInput(el.end_date),
                    })
                    setEditing(true)
                  }}
                >
                  <Pencil data-icon="inline-start" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete "${el.title}" and ALL of its ballots and votes? This cannot be undone.`)) return
                    act(() => deleteElection(el.id))
                  }}
                >
                  <Trash2 data-icon="inline-start" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {elections.length === 0 && !editing && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No elections yet — create your first one.
          </div>
        )}
      </div>
    </div>
  )
}
