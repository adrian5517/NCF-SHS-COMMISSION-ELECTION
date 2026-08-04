'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Upload, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteCandidate, deletePosition, saveCandidate, savePosition } from '@/lib/actions/elections'
import { uploadImage } from '@/lib/upload'
import { Button } from '@/components/ui/button'
import type { Candidate, Election, Position } from '@/lib/types'

const field =
  'w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

const emptyCandidate = {
  candidate_name: '',
  grade_level: '',
  section: '',
  party_list: '',
  party_color: '#16a34a',
  photo_url: '',
  motto: '',
  display_order: 0,
}

export default function CandidatesPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [electionId, setElectionId] = useState('')
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [posForm, setPosForm] = useState<{ id?: string; position_name: string; max_votes: number; rank_order: number; eligible_grade_levels: string[]; plurality_at_large: boolean } | null>(null)
  const [candForm, setCandForm] = useState<(typeof emptyCandidate & { id?: string; position_id: string }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')

  useEffect(() => {
    createClient()
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Election[]) ?? []
        setElections(list)
        if (list[0]) setElectionId(list[0].id)
      })
  }, [])

  const load = useCallback(async () => {
    if (!electionId) return
    const supabase = createClient()
    const [{ data: pos }, { data: cand }] = await Promise.all([
      supabase.from('positions').select('*').eq('election_id', electionId).order('rank_order'),
      supabase.from('candidates').select('*, positions!inner(election_id)').eq('positions.election_id', electionId).order('display_order'),
    ])
    setPositions((pos as Position[]) ?? [])
    setCandidates((cand as Candidate[]) ?? [])
  }, [electionId])

  useEffect(() => {
    load()
  }, [load])

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true)
    setError('')
    const result = await fn()
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong')
      return false
    }
    load()
    return true
  }

  function setEligibleGrades(eligible_grade_levels: string[]) {
    if (!posForm) return
    setPosForm({ ...posForm, eligible_grade_levels })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Positions & Candidates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build the ballot for an election</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${field} w-auto`} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="all">All grades</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
          <select className={`${field} w-auto`} value={electionId} onChange={(e) => setElectionId(e.target.value)}>
            {elections.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {electionId && (
        <div className="mt-6 space-y-6">
          <Button
            variant="outline"
            onClick={() => setPosForm({ position_name: '', max_votes: 1, rank_order: positions.length + 1, eligible_grade_levels: [], plurality_at_large: false })}
          >
            <Plus data-icon="inline-start" /> Add position
          </Button>

          {posForm && (
            <form
              className="glass grid gap-4 rounded-2xl p-6 sm:grid-cols-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (await run(() => savePosition({ ...posForm, election_id: electionId }))) setPosForm(null)
              }}
            >
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Position name</label>
                <input
                  required
                  className={field}
                  placeholder="e.g., President"
                  value={posForm.position_name}
                  onChange={(e) => setPosForm({ ...posForm, position_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Max votes</label>
                <input
                  type="number"
                  min={1}
                  required
                  className={field}
                  value={posForm.max_votes}
                  onChange={(e) => setPosForm({ ...posForm, max_votes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ballot order</label>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={posForm.rank_order}
                  onChange={(e) => setPosForm({ ...posForm, rank_order: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1.5 block text-sm font-medium">Who can vote in this position?</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={posForm.eligible_grade_levels.length === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEligibleGrades([])}
                  >
                    All grades
                  </Button>
                  <Button
                    type="button"
                    variant={posForm.eligible_grade_levels.length === 1 && posForm.eligible_grade_levels[0] === 'Grade 11' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEligibleGrades(['Grade 11'])}
                  >
                    Grade 11 only
                  </Button>
                  <Button
                    type="button"
                    variant={posForm.eligible_grade_levels.length === 1 && posForm.eligible_grade_levels[0] === 'Grade 12' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEligibleGrades(['Grade 12'])}
                  >
                    Grade 12 only
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      posForm.eligible_grade_levels.length === 0 ? 'border-ring bg-primary/10 font-medium' : 'border-border bg-background/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={posForm.eligible_grade_levels.length === 0}
                      onChange={() => setEligibleGrades([])}
                      className="size-4"
                    />
                    All grade levels
                  </label>
                  {['Grade 11', 'Grade 12'].map((g) => (
                    <label
                      key={g}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                        posForm.eligible_grade_levels.includes(g) ? 'border-ring bg-primary/10 font-medium' : 'border-border bg-background/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={posForm.eligible_grade_levels.includes(g)}
                        onChange={() =>
                          setPosForm({
                            ...posForm,
                            eligible_grade_levels: posForm.eligible_grade_levels.includes(g)
                              ? posForm.eligible_grade_levels.filter((x) => x !== g)
                              : [...posForm.eligible_grade_levels, g],
                          })
                        }
                        className="size-4"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm sm:col-span-4">
                <input
                  type="checkbox"
                  checked={posForm.plurality_at_large}
                  onChange={(e) => setPosForm({ ...posForm, plurality_at_large: e.target.checked })}
                  className="size-4"
                />
                <span>
                  <span className="font-medium">Plurality-at-large voting</span>
                  <span className="block text-xs text-muted-foreground">
                    Voters may choose up to all candidates (no max-votes cap). Use for multi-seat positions like Councilors.
                  </span>
                </span>
              </label>
              <div className="flex gap-2 sm:col-span-4">
                <Button type="submit" disabled={busy}>
                  Save position
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPosForm(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {positions
            .filter(
              (pos) =>
                gradeFilter === 'all' ||
                (pos.eligible_grade_levels ?? []).length === 0 ||
                (pos.eligible_grade_levels ?? []).includes(gradeFilter),
            )
            .map((pos) => {
              const list = candidates.filter((c) => c.position_id === pos.id)
            return (
              <section key={pos.id} className="glass rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{pos.position_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {pos.plurality_at_large ? 'Plurality-at-large' : `Vote for ${pos.max_votes}`} · ballot order {pos.rank_order} ·{' '}
                      {(pos.eligible_grade_levels ?? []).length === 0
                        ? 'open to all grades'
                        : `voters: ${(pos.eligible_grade_levels ?? []).join(', ')}`}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCandForm({ ...emptyCandidate, position_id: pos.id, display_order: list.length + 1 })}
                    >
                      <Plus data-icon="inline-start" /> Candidate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPosForm({
                          id: pos.id,
                          position_name: pos.position_name,
                          max_votes: pos.max_votes,
                          rank_order: pos.rank_order,
                          eligible_grade_levels: pos.eligible_grade_levels ?? [],
                          plurality_at_large: pos.plurality_at_large ?? false,
                        })
                      }
                    >
                      <Pencil data-icon="inline-start" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Delete position "${pos.position_name}" and its candidates?`)) return
                        run(() => deletePosition(pos.id))
                      }}
                    >
                      <Trash2 data-icon="inline-start" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo_url} alt={c.candidate_name} className="size-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                          <UserRound className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.candidate_name}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <span className="inline-block size-2 rounded-full" style={{ background: c.party_color }} />
                          {c.party_list || 'Independent'} · {c.grade_level} {c.section}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${c.candidate_name}`}
                          onClick={() =>
                            setCandForm({
                              id: c.id,
                              position_id: c.position_id,
                              candidate_name: c.candidate_name,
                              grade_level: c.grade_level,
                              section: c.section,
                              party_list: c.party_list,
                              party_color: c.party_color,
                              photo_url: c.photo_url ?? '',
                              motto: c.motto,
                              display_order: c.display_order,
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${c.candidate_name}`}
                          onClick={() => {
                            if (!confirm(`Delete candidate "${c.candidate_name}"?`)) return
                            run(() => deleteCandidate(c.id))
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <p className="text-sm text-muted-foreground">No candidates yet.</p>}
                </div>
              </section>
            )
          })}
          {positions.length > 0 && gradeFilter !== 'all' && positions.every(
            (pos) =>
              (pos.eligible_grade_levels ?? []).length > 0 &&
              !(pos.eligible_grade_levels ?? []).includes(gradeFilter),
          ) && (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              No positions for {gradeFilter} — set a grade eligibility on a position to see it here.
            </div>
          )}
          {positions.length === 0 && !posForm && (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              No positions yet — add President, Vice President, Councilors…
            </div>
          )}
        </div>
      )}

      {candForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCandForm(null)}>
          <form
            className="glass max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-popover p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault()
              if (await run(() => saveCandidate({ ...candForm, photo_url: candForm.photo_url || null }))) setCandForm(null)
            }}
          >
            <h2 className="text-lg font-semibold">{candForm.id ? 'Edit candidate' : 'New candidate'}</h2>
            <div className="flex items-center gap-4">
              {candForm.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candForm.photo_url} alt="Candidate preview" className="size-20 rounded-2xl object-cover" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
                  <UserRound className="size-8 text-muted-foreground" />
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm hover:bg-muted">
                <Upload className="size-4" /> Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    try {
                      setCandForm({ ...candForm, photo_url: await uploadImage(f, 'candidates') })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed')
                    }
                  }}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Full name</label>
                <input
                  required
                  className={field}
                  value={candForm.candidate_name}
                  onChange={(e) => setCandForm({ ...candForm, candidate_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Grade level</label>
                <select
                  className={field}
                  value={candForm.grade_level}
                  onChange={(e) => setCandForm({ ...candForm, grade_level: e.target.value })}
                >
                  <option value="">No grade level</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Section</label>
                <input
                  className={field}
                  value={candForm.section}
                  onChange={(e) => setCandForm({ ...candForm, section: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Party list</label>
                <input
                  className={field}
                  placeholder="Party Matatag"
                  value={candForm.party_list}
                  onChange={(e) => setCandForm({ ...candForm, party_list: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Party color</label>
                <input
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-xl border border-input bg-background/60"
                  value={candForm.party_color}
                  onChange={(e) => setCandForm({ ...candForm, party_color: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Motto</label>
                <input
                  className={field}
                  placeholder="A short campaign motto"
                  value={candForm.motto}
                  onChange={(e) => setCandForm({ ...candForm, motto: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save candidate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCandForm(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
