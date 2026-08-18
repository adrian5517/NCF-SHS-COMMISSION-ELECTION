'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { EyeOff, LayoutGrid, List, Trophy, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'

/** Candidate names that represent an abstain slot — exclude from photo cards. */
const ABSTAIN_RE = /^abstain$/i

export interface LiveStats {
  ok: boolean
  election: { id: string; title: string; status: string; hide_live_results: boolean; end_date: string }
  turnout: {
    total: number
    voted: number
    groups: { grade_level: string; section: string; total: number; voted: number }[]
  }
  results:
    | {
        position_id: string
        position_name: string
        max_votes: number
        rank_order: number
        abstain_count: number
        candidates: {
          id: string
          candidate_name: string
          party_list: string
          party_color: string
          photo_url: string | null
          grade_level: string
          section: string
          votes: number
        }[]
      }[]
    | null
}

export function useLiveStats(electionId: string, pollMs?: number) {
  const [stats, setStats] = useState<LiveStats | null>(null)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_live_stats', { p_election_id: electionId })
    if (data?.ok) setStats(data as LiveStats)
  }, [electionId])

  useEffect(() => {
    refresh()
    if (!pollMs) return
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  // Realtime only works for authenticated staff; polling covers the projector.
  useRealtime(['votes', 'students', 'elections'], refresh)

  return stats
}

export function TurnoutMeter({ stats, big = false }: { stats: LiveStats; big?: boolean }) {
  const { total, voted, groups } = stats.turnout
  const pct = total ? Math.round((voted / total) * 100) : 0
  const donut = [
    { name: 'Voted', value: voted },
    { name: 'Not yet', value: Math.max(total - voted, 0) },
  ]

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className={`font-semibold ${big ? 'text-2xl' : 'text-lg'}`}>Live Turnout</h3>
      <div className="mt-2 flex flex-wrap items-center gap-8">
        <div className="relative" style={{ width: big ? 220 : 160, height: big ? 220 : 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                innerRadius="72%"
                outerRadius="100%"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
                isAnimationActive
              >
                <Cell fill="var(--chart-2)" />
                <Cell fill="var(--muted)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display font-bold ${big ? 'text-5xl' : 'text-3xl'}`}>{pct}%</span>
            <span className="text-xs text-muted-foreground">turnout</span>
          </div>
        </div>
        <div className="min-w-56 flex-1">
          <p className={`font-medium ${big ? 'text-2xl' : 'text-base'}`}>
            {voted.toLocaleString()} of {total.toLocaleString()} students voted
          </p>
          <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-2">
            {groups.map((g) => {
              const gp = g.total ? Math.round((g.voted / g.total) * 100) : 0
              return (
                <div key={`${g.grade_level}-${g.section}`}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {g.grade_level} — {g.section}
                    </span>
                    <span>
                      {g.voted}/{g.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-2 transition-all duration-700"
                      style={{ width: `${gp}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CandidateCard({
  candidate,
  leading,
  shareOfVotes,
  big,
  index,
}: {
  candidate: NonNullable<LiveStats['results']>[number]['candidates'][number]
  leading: boolean
  shareOfVotes: number
  big: boolean
  index: number
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut', layout: { duration: 0.4 } }}
      className={`flex flex-col items-center gap-2 rounded-2xl border bg-background/40 p-4 text-center ${
        leading ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      {candidate.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={candidate.photo_url}
          alt=""
          className={`rounded-2xl object-cover ${big ? 'size-28' : 'size-20'}`}
        />
      ) : (
        <div className={`flex items-center justify-center rounded-2xl bg-muted ${big ? 'size-28' : 'size-20'}`}>
          <UserRound className={big ? 'size-12 text-muted-foreground' : 'size-9 text-muted-foreground'} />
        </div>
      )}
      <p className={`w-full truncate font-semibold ${big ? 'text-lg' : 'text-sm'}`}>{candidate.candidate_name}</p>
      <p className="flex items-center gap-1.5 text-xs" style={{ color: candidate.party_color || 'var(--chart-1)' }}>
        <span className="inline-block size-2 rounded-full" style={{ background: candidate.party_color }} />
        {candidate.party_list || 'Independent'}
      </p>
      {(candidate.grade_level || candidate.section) && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 font-medium text-muted-foreground ${
            big ? 'text-sm' : 'text-xs'
          }`}
        >
          {[candidate.grade_level, candidate.section].filter(Boolean).join(' · ')}
        </span>
      )}
      <div className="w-full">
        <div className="flex items-baseline justify-center gap-1.5">
          <motion.span
            key={candidate.votes}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={`font-display font-bold ${big ? 'text-3xl' : 'text-xl'}`}
          >
            {candidate.votes}
          </motion.span>
          <span className="text-xs text-muted-foreground">votes</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${shareOfVotes}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: candidate.party_color || 'var(--chart-1)' }}
          />
        </div>
      </div>
      <AnimatePresence>
        {leading && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Trophy className="size-3" /> Leading
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ResultsBoard({
  stats,
  big = false,
  defaultView = 'bars',
}: {
  stats: LiveStats
  big?: boolean
  defaultView?: 'bars' | 'cards'
}) {
  const [view, setView] = useState<'bars' | 'cards'>(defaultView)

  if (!stats.results) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
        <EyeOff className="size-8 text-muted-foreground" />
        <p className="font-medium">Results are hidden until the election closes.</p>
        <p className="text-sm text-muted-foreground">Turnout stays visible above.</p>
      </div>
    )
  }

  const closed = stats.election.status === 'closed' || stats.election.status === 'archived'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="no-print flex rounded-xl border border-input p-0.5">
          <button
            type="button"
            aria-pressed={view === 'bars'}
            aria-label="Bar chart view"
            onClick={() => setView('bars')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              view === 'bars' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="size-4" /> Bars
          </button>
          <button
            type="button"
            aria-pressed={view === 'cards'}
            aria-label="Candidate card view"
            onClick={() => setView('cards')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              view === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-4" /> Candidates
          </button>
        </div>
      </div>

      <div className={view === 'bars' ? 'grid gap-5 lg:grid-cols-2' : 'space-y-5'}>
        {stats.results.map((pos) => {
          const topVotes = pos.candidates[0]?.votes ?? 0
          const totalVotes = pos.candidates.reduce((sum, c) => sum + c.votes, 0)

          if (view === 'cards') {
            const realCandidates = pos.candidates.filter((c) => !ABSTAIN_RE.test(c.candidate_name))
            const abstainCount = pos.abstain_count ?? 0
            const cardTotal = realCandidates.reduce((sum, c) => sum + c.votes, 0)
            const abstainShare = cardTotal + abstainCount > 0
              ? Math.round((abstainCount / (cardTotal + abstainCount)) * 100)
              : 0

            return (
              <div key={pos.position_id} className="glass rounded-2xl p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className={`font-semibold ${big ? 'text-2xl' : 'text-lg'}`}>{pos.position_name}</h3>
                  <span className="text-right text-xs text-muted-foreground">
                    vote for {pos.max_votes}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {realCandidates.map((c, i) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      leading={i < pos.max_votes && c.votes > 0}
                      shareOfVotes={cardTotal ? Math.round((c.votes / cardTotal) * 100) : 0}
                      big={big}
                      index={i}
                    />
                  ))}
                  {realCandidates.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">No candidates yet.</p>
                  )}
                </div>
                {/* Abstain progress bar */}
                {abstainCount > 0 && (
                  <div className="mt-4 rounded-xl bg-muted/30 px-4 py-2.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium uppercase tracking-wider">Abstain</span>
                      <span className="tabular-nums font-semibold">{abstainCount} · {abstainShare}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-muted-foreground/40"
                        initial={{ width: 0 }}
                        animate={{ width: `${abstainShare}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={pos.position_id} className="glass rounded-2xl p-6">
              <div className="flex items-baseline justify-between">
                <h3 className={`font-semibold ${big ? 'text-2xl' : 'text-lg'}`}>{pos.position_name}</h3>
                <span className="text-right text-xs text-muted-foreground">
                  vote for {pos.max_votes}
                  {pos.abstain_count > 0 && (
                    <>
                      <br />
                      {pos.abstain_count} abstained
                    </>
                  )}
                </span>
              </div>
              <div className="mt-3" style={{ height: Math.max(pos.candidates.length * (big ? 56 : 44), 80) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={pos.candidates}
                    margin={{ left: 8, right: 44, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide domain={[0, Math.max(topVotes, 1)]} />
                    <YAxis
                      type="category"
                      dataKey="candidate_name"
                      width={big ? 180 : 130}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: big ? 16 : 12 }}
                    />
                    <Bar dataKey="votes" radius={[4, 4, 4, 4]} isAnimationActive barSize={big ? 30 : 22}>
                      {pos.candidates.map((c) => (
                        <Cell key={c.id} fill={c.party_color || 'var(--chart-1)'} />
                      ))}
                      <LabelList
                        dataKey="votes"
                        position="right"
                        style={{ fill: 'var(--foreground)', fontSize: big ? 16 : 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {closed && pos.candidates.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-chart-4">
                  <Trophy className="size-4" />
                  Winner{pos.max_votes > 1 ? 's' : ''}:{' '}
                  {pos.candidates.slice(0, pos.max_votes).map((c) => c.candidate_name).join(', ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
