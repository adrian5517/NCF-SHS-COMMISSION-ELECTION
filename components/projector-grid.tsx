'use client'

import { motion } from 'motion/react'
import { Trophy, UserRound } from 'lucide-react'
import type { LiveStats } from './live-results'

// Broadcast-style board for the big screen: every race is a panel, and each
// candidate is a photo card with a lower-third overlay (name + party) and a
// live vote count. Cards flex to fill their panel, so the whole board sizes to
// the screen with no scrolling regardless of how many races there are.
export function ProjectorGrid({ stats }: { stats: LiveStats }) {
  if (!stats.results) {
    return (
      <div className="glass flex h-full flex-col items-center justify-center gap-3 rounded-2xl p-10 text-center">
        <p className="text-lg font-medium">Results are hidden until the election closes.</p>
      </div>
    )
  }

  const positions = stats.results

  return (
    <div className="grid h-full gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gridAutoRows: 'minmax(0, 1fr)' }}>
      {positions.map((pos) => {
        const totalVotes = pos.candidates.reduce((sum, c) => sum + c.votes, 0)
        const topVotes = pos.candidates[0]?.votes ?? 0

        return (
          <section key={pos.position_id} className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl p-3">
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-[clamp(0.875rem,0.95vw,1.3rem)] font-semibold tracking-tight text-muted-foreground uppercase">
                {pos.position_name}
              </h3>
              <span className="shrink-0 text-[clamp(0.65rem,0.72vw,0.9rem)] tracking-wider text-muted-foreground/70 uppercase">
                {pos.plurality_at_large ? `Pick up to ${pos.candidates.length}` : `Pick ${pos.max_votes}`}
              </span>
            </header>

            <div
              className="mt-2 grid min-h-0 flex-1 gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gridAutoRows: 'minmax(0, 1fr)' }}
            >
              {pos.candidates.map((c, i) => {
                const share = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0
                const leading = i < pos.max_votes && c.votes > 0 && c.votes === topVotes

                return (
                  <article
                    key={c.id}
                    className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background/40 ${
                      leading ? 'border-primary ring-2 ring-primary/40' : 'border-border/60'
                    }`}
                  >
                    <div className="relative min-h-0 flex-1 bg-gradient-to-b from-slate-200 to-slate-400">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo_url} alt="" className="absolute inset-0 size-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <UserRound className="size-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Lower third: name + party read clearly over any photo. */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pt-6 pb-1.5">
                        <p className="truncate text-[clamp(0.875rem,1vw,1.4rem)] leading-tight font-semibold text-white">{c.candidate_name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: c.party_color || 'var(--chart-1)' }}
                          />
                          <span className="truncate text-[clamp(0.7rem,0.78vw,1rem)] text-white/70">{c.party_list || 'Independent'}</span>
                        </div>
                        {(c.grade_level || c.section) && (
                          <p className="truncate text-[clamp(0.65rem,0.72vw,0.9rem)] text-white/60">
                            {[c.grade_level, c.section].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>

                      {leading && (
                        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                          <Trophy className="size-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <motion.span
                        key={c.votes}
                        initial={{ scale: 1.25 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                        className="font-display text-[clamp(1.125rem,1.4vw,2.1rem)] font-bold tabular-nums"
                      >
                        {c.votes}
                      </motion.span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{ background: c.party_color || 'var(--chart-1)' }}
                        />
                      </div>
                      <span className="shrink-0 text-[clamp(0.7rem,0.75vw,0.95rem)] tabular-nums text-muted-foreground">{share}%</span>
                    </div>
                  </article>
                )
              })}
              {pos.candidates.length === 0 && (
                <p className="col-span-full self-center text-center text-xs text-muted-foreground">No candidates.</p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
