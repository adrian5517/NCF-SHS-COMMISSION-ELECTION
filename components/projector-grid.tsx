'use client'

import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import type { LiveStats } from './live-results'

/** Candidate names that represent an abstain slot — exclude from photo cards. */
const ABSTAIN_RE = /^abstain$/i

// ---------------------------------------------------------------------------
// Broadcast-style board for the big screen.
//
// Each candidate card is a flex-column article:
//   ┌──────────────────┐
//   │   photo-section  │  ← flex-1, only visible in photo-card tier
//   ├──────────────────┤
//   │   vote-bar-row   │  ← always at bottom, hidden in compact tier
//   └──────────────────┘
//
// Container-query tiers (keyed to the article's rendered height × width):
//   • ≥ 80 px tall & ≥ 120 px wide  → photo-card  (photo + lower-third + bar below)
//   • ≥ 40 px tall & ≥ 70 px wide   → compact     (thumbnail left + name + bar)
//   • everything else               → minimal     (name text + bar, no image)
// ---------------------------------------------------------------------------

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
    <div
      className="grid h-full gap-[clamp(0.375rem,0.6vw,0.75rem)]"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(160px,18vw,340px), 1fr))',
        gridAutoRows: 'minmax(0, 1fr)',
      }}
    >
      {positions.map((pos) => {
        const realCandidates = pos.candidates.filter((c) => !ABSTAIN_RE.test(c.candidate_name))
        const abstainCount = pos.abstain_count ?? 0
        const totalVotes = realCandidates.reduce((sum, c) => sum + c.votes, 0)
        const topVotes = realCandidates[0]?.votes ?? 0
        const abstainShare =
          totalVotes + abstainCount > 0
            ? Math.round((abstainCount / (totalVotes + abstainCount)) * 100)
            : 0

        return (
          <section
            key={pos.position_id}
            className="glass flex min-h-0 flex-col overflow-hidden rounded-[clamp(0.75rem,1vw,1.25rem)] p-[clamp(0.375rem,0.5vw,0.625rem)]"
          >
            {/* ── Position header ─────────────────────────── */}
            <header className="flex shrink-0 items-baseline justify-between gap-1">
              <h3
                className="truncate font-semibold tracking-tight text-muted-foreground uppercase"
                style={{ fontSize: 'clamp(0.55rem, 0.8vw, 1rem)' }}
              >
                {pos.position_name}
              </h3>
              <span
                className="shrink-0 text-muted-foreground/60 uppercase tracking-wider"
                style={{ fontSize: 'clamp(0.5rem, 0.58vw, 0.75rem)' }}
              >
                Pick {pos.max_votes}
              </span>
            </header>

            {/* ── Candidate list ───────────────────────────── */}
            <div className="mt-[clamp(0.2rem,0.35vw,0.5rem)] min-h-0 flex-1 overflow-hidden">
              {realCandidates.map((c, i) => {
                const share = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0
                const leading = i < pos.max_votes && c.votes > 0 && c.votes === topVotes
                const isLast = i === realCandidates.length - 1

                return (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    share={share}
                    leading={leading}
                    total={realCandidates.length}
                    isLast={isLast}
                  />
                )
              })}

              {realCandidates.length === 0 && (
                <p className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                  No candidates.
                </p>
              )}
            </div>

            {/* ── Abstain progress bar ─────────────────────── */}
            {abstainCount > 0 && (
              <div className="mt-[clamp(0.2rem,0.35vw,0.4rem)] shrink-0 px-0.5">
                <div
                  className="flex items-center justify-between text-muted-foreground/55"
                  style={{ fontSize: 'clamp(0.48rem, 0.58vw, 0.72rem)' }}
                >
                  <span className="uppercase tracking-wider">Abstain</span>
                  <span className="tabular-nums">
                    {abstainCount} · {abstainShare}%
                  </span>
                </div>
                <div className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-muted/50">
                  <motion.div
                    className="h-full rounded-full bg-muted-foreground/35"
                    initial={{ width: 0 }}
                    animate={{ width: `${abstainShare}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single candidate card — flex-column with 3 visible layers:
//
//   .pc-photo     visible in photo-card tier  (flex-1, photo + lower-third)
//   .pc-bar       visible in photo-card tier  (vote count + bar, BELOW photo)
//   .cc-row       visible in compact tier     (thumbnail + name + bar, full height)
//   .mn-row       visible in minimal tier     (name + bar, full height, no image)
//
// Height is shared equally among all candidates in the panel.
// ---------------------------------------------------------------------------
function CandidateCard({
  candidate: c,
  share,
  leading,
  total,
  isLast,
}: {
  candidate: NonNullable<LiveStats['results']>[number]['candidates'][number]
  share: number
  leading: boolean
  total: number
  isLast: boolean
}) {
  return (
    <article
      className={`projector-card relative overflow-hidden border bg-background/40 ${
        leading ? 'border-primary ring-1 ring-primary/40' : 'border-border/50'
      }`}
      style={{
        // Each card gets equal height within the list area
        height: `calc((100% - ${(total - 1) * 4}px) / ${total})`,
        marginBottom: isLast ? 0 : 4,
        borderRadius: 'clamp(0.3rem, 0.5vw, 0.625rem)',
      }}
    >
      {/* ══ PHOTO-CARD tier ══════════════════════════════════════════════
          Shown when card is tall + wide enough (≥ 80px × ≥ 120px).
          Structure: photo fills flex-1, vote-bar sits below it.
      ════════════════════════════════════════════════════════════════════ */}

      {/* Photo fill area */}
      <div className="pc-photo hidden relative overflow-hidden bg-muted/40"
           style={{ position: 'absolute', inset: 0, bottom: 'var(--bar-h, 28px)' }}>
        {c.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo_url} alt="" className="absolute inset-0 size-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-muted/60" />
        )}

        {/* Lower-third gradient + name + party */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/48 to-transparent px-[clamp(0.25rem,0.4vw,0.5rem)] pt-[clamp(0.5rem,1.5vw,1.5rem)] pb-[clamp(0.2rem,0.3vw,0.35rem)]">
          <p
            className="truncate leading-tight font-semibold text-white"
            style={{ fontSize: 'clamp(0.58rem, 0.82vw, 1.05rem)' }}
          >
            {c.candidate_name}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: c.party_color || 'var(--chart-1)' }}
            />
            <span
              className="truncate text-white/65"
              style={{ fontSize: 'clamp(0.48rem, 0.62vw, 0.78rem)' }}
            >
              {c.party_list || 'Independent'}
            </span>
          </div>
        </div>

        {/* Leading badge */}
        {leading && (
          <span className="absolute top-1 right-1 flex size-[clamp(0.9rem,1.1vw,1.4rem)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Trophy style={{ width: 'clamp(0.45rem,0.65vw,0.8rem)', height: 'clamp(0.45rem,0.65vw,0.8rem)' }} />
          </span>
        )}
      </div>

      {/* Vote bar — sits below the photo in photo-card tier */}
      <div
        className="pc-bar hidden absolute inset-x-0 bottom-0 flex items-center gap-[clamp(0.2rem,0.35vw,0.45rem)] bg-background/70 px-[clamp(0.25rem,0.4vw,0.5rem)]"
        style={{ height: 'var(--bar-h, 28px)' }}
      >
        <motion.span
          key={c.votes}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          className="shrink-0 font-bold tabular-nums leading-none"
          style={{ fontSize: 'clamp(0.6rem, 0.85vw, 1.05rem)' }}
        >
          {c.votes}
        </motion.span>
        <div className="h-[clamp(3px,0.35vw,5px)] flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${share}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: c.party_color || 'var(--chart-1)' }}
          />
        </div>
        <span
          className="shrink-0 tabular-nums text-muted-foreground leading-none"
          style={{ fontSize: 'clamp(0.48rem, 0.6vw, 0.75rem)' }}
        >
          {share}%
        </span>
      </div>

      {/* ══ COMPACT tier ═════════════════════════════════════════════════
          Shown when card is medium height/width.
          Single row: thumbnail | name + bar | trophy
      ════════════════════════════════════════════════════════════════════ */}
      <div className="cc-row hidden h-full items-center gap-[clamp(0.25rem,0.45vw,0.5rem)] px-[clamp(0.25rem,0.4vw,0.5rem)]">
        {c.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.photo_url}
            alt=""
            className="aspect-square shrink-0 rounded-[clamp(0.2rem,0.35vw,0.4rem)] object-cover object-top"
            style={{ width: 'clamp(1.6rem,2.8vw,2.8rem)', height: 'clamp(1.6rem,2.8vw,2.8rem)' }}
          />
        ) : (
          <div
            className="shrink-0 rounded-[clamp(0.2rem,0.35vw,0.4rem)] bg-muted/60"
            style={{ width: 'clamp(1.6rem,2.8vw,2.8rem)', height: 'clamp(1.6rem,2.8vw,2.8rem)' }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-semibold leading-none"
            style={{ fontSize: 'clamp(0.52rem, 0.72vw, 0.9rem)' }}
          >
            {c.candidate_name}
          </p>
          <div className="mt-1 flex items-center gap-[clamp(0.2rem,0.3vw,0.4rem)]">
            <motion.span
              key={c.votes}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 16 }}
              className="shrink-0 font-bold tabular-nums leading-none"
              style={{ fontSize: 'clamp(0.55rem, 0.75vw, 0.9rem)' }}
            >
              {c.votes}
            </motion.span>
            <div className="h-[clamp(3px,0.32vw,5px)] flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ background: c.party_color || 'var(--chart-1)' }}
              />
            </div>
            <span
              className="shrink-0 tabular-nums text-muted-foreground leading-none"
              style={{ fontSize: 'clamp(0.48rem, 0.58vw, 0.72rem)' }}
            >
              {share}%
            </span>
          </div>
        </div>
        {leading && (
          <Trophy
            className="shrink-0 text-primary"
            style={{ width: 'clamp(0.55rem,0.75vw,0.9rem)', height: 'clamp(0.55rem,0.75vw,0.9rem)' }}
          />
        )}
      </div>

      {/* ══ MINIMAL tier ═════════════════════════════════════════════════
          Shown when card is very small (mobile / dense projector zoom).
          Name text + progress bar only — no image.
      ════════════════════════════════════════════════════════════════════ */}
      <div className="mn-row hidden h-full flex-col justify-center px-[clamp(0.25rem,0.4vw,0.5rem)]">
        <p
          className="truncate font-medium leading-none"
          style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.85rem)' }}
        >
          {leading && <span className="mr-0.5 text-primary">★</span>}
          {c.candidate_name}
        </p>
        <div className="mt-1 flex items-center gap-[clamp(0.2rem,0.3vw,0.4rem)]">
          <motion.span
            key={c.votes}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16 }}
            className="shrink-0 font-bold tabular-nums leading-none"
            style={{ fontSize: 'clamp(0.52rem, 0.7vw, 0.85rem)' }}
          >
            {c.votes}
          </motion.span>
          <div className="h-[clamp(3px,0.3vw,4px)] flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${share}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ background: c.party_color || 'var(--chart-1)' }}
            />
          </div>
          <span
            className="shrink-0 tabular-nums text-muted-foreground leading-none"
            style={{ fontSize: 'clamp(0.46rem, 0.56vw, 0.7rem)' }}
          >
            {share}%
          </span>
        </div>
      </div>
    </article>
  )
}
