'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Send, UserRound, X } from 'lucide-react'
import { exitBallot, submitBallot } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'
import type { Ballot, BallotCandidate, VotingMechanics } from '@/lib/types'

const IDLE_MS = 60_000

export function BallotWizard({
  ballot,
  studentName,
  votingMechanics,
}: {
  ballot: Ballot
  studentName: string
  votingMechanics: VotingMechanics
}) {
  const positions = ballot.positions
  const [step, setStep] = useState(0) // positions.length = review
  const [showMechanics, setShowMechanics] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [toast, setToast] = useState('')
  const [confirmingAbstain, setConfirmingAbstain] = useState(false)
  const [affirmed, setAffirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const submitInFlightRef = useRef(false)

  // Kiosk idle guard: abandon the session and go back to login.
  useEffect(() => {
    if (done) return
    let timer = setTimeout(() => exitBallot(), IDLE_MS)
    const bump = () => {
      clearTimeout(timer)
      timer = setTimeout(() => exitBallot(), IDLE_MS)
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [done])

  // After the thank-you screen, reset the booth for the next student.
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => {
      exitBallot()
    }, 6000)
    return () => clearTimeout(id)
  }, [done])

  const candidateById = useMemo(() => {
    const map = new Map<string, BallotCandidate>()
    for (const p of positions) for (const c of p.candidates) map.set(c.id, c)
    return map
  }, [positions])

  function showToast(message: string) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  function toggle(positionId: string, candidateId: string, maxVotes: number, cap: number) {
    setSelections((prev) => {
      const current = prev[positionId] ?? []
      if (current.includes(candidateId)) {
        return { ...prev, [positionId]: current.filter((id) => id !== candidateId) }
      }
      if (cap === 1) {
        return { ...prev, [positionId]: [candidateId] }
      }
      if (current.length >= cap) {
        showToast(`You can only choose ${cap} for this position.`)
        return prev
      }
      return { ...prev, [positionId]: [...current, candidateId] }
    })
  }

  async function submit() {
    if (submitInFlightRef.current || submitting || done) return
    const overLimit = positions.find((position) => {
      const cap = Math.min(position.max_votes, position.candidates.length)
      return (selections[position.id] ?? []).length > cap
    })
    if (overLimit) {
      const cap = Math.min(overLimit.max_votes, overLimit.candidates.length)
      showToast(`Too many choices for ${overLimit.position_name}. Choose up to ${cap}.`)
      setStep(positions.findIndex((position) => position.id === overLimit.id))
      return
    }
    submitInFlightRef.current = true
    setSubmitting(true)
    setError('')
    const result = await submitBallot(selections)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      submitInFlightRef.current = false
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="dark bg-aurora flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex size-28 items-center justify-center rounded-full bg-success/15"
        >
          <CheckCircle2 className="size-16 text-success" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          className="mt-8 text-4xl font-bold sm:text-5xl"
        >
          Thank you for voting!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-3 text-lg text-muted-foreground"
        >
          Your ballot was cast anonymously and securely.
        </motion.p>
        <p className="mt-10 text-sm text-muted-foreground">Returning to the login screen for the next voter…</p>
      </div>
    )
  }

  if (showMechanics) {
    const firstName = studentName.split(' ')[0]
    return (
      <div className="dark bg-aurora min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass w-full max-w-2xl rounded-3xl p-6 sm:p-10"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              {ballot.election.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ballot.election.logo_url}
                  alt={ballot.election.title}
                  className="size-16 rounded-2xl object-cover sm:size-20"
                />
              )}
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                NCF BED–SHS Commission on Elections (COMELEC)
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {votingMechanics.heading}
              </h1>
            </div>

            {/* Greeting + intro */}
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Hi <span className="font-semibold text-foreground">{firstName}</span>! Please review the
              guidelines before casting your ballot.
            </p>
            <p className="mt-3 text-sm leading-relaxed sm:text-base">{votingMechanics.intro}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {votingMechanics.preface}
            </p>

            {/* Guidelines */}
            <ul className="mt-6 space-y-3.5">
              {votingMechanics.guidelines.map((line, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary sm:size-8 sm:text-sm">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed sm:text-base">{line}</p>
                </li>
              ))}
            </ul>

            {/* Consent note */}
            <p className="mt-6 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground italic sm:text-base">
              {votingMechanics.consentNote}
            </p>

            {/* Acknowledgment */}
            <label className="mt-6 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-border bg-background/50 p-4 transition-colors select-none hover:border-primary/50 sm:p-5">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-primary sm:size-6"
              />
              <span className="text-sm leading-relaxed font-medium sm:text-base">
                {votingMechanics.acknowledgment}
              </span>
            </label>

            {/* CTA */}
            <Button
              size="lg"
              className="mt-6 h-13 w-full text-base sm:h-14 sm:text-lg"
              disabled={!acknowledged}
              onClick={() => setShowMechanics(false)}
            >
              <ClipboardCheck data-icon="inline-start" /> Let's Vote
            </Button>
            {!acknowledged && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Please acknowledge the voting mechanics to continue.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  const isReview = step >= positions.length
  const position = positions[Math.min(step, positions.length - 1)]
  const selectedHere = selections[position?.id ?? ''] ?? []

  return (
    <div className="dark bg-aurora min-h-screen bg-background pb-32 text-foreground">
      {/* progress */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{ballot.election.title}</p>
            <p className="font-medium">Hello, {studentName.split(' ')[0]}! 👋</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {isReview ? 'Review' : `${step + 1} of ${positions.length}`}
          </p>
        </div>
        <div className="mx-auto mt-3 h-1.5 max-w-4xl overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((Math.min(step, positions.length) + (isReview ? 1 : 0.5)) / (positions.length + 1)) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-8">
        <AnimatePresence mode="wait">
          {!isReview ? (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <h1 className="text-3xl font-bold sm:text-4xl">{position.position_name}</h1>
              <p className="mt-1.5 text-muted-foreground">
                {(() => {
                  const cap = Math.min(position.max_votes, position.candidates.length)
                  return cap <= 1
                    ? 'Tap one candidate to choose.'
                    : `Choose up to ${cap} candidates. (${selectedHere.length}/${cap} selected)`
                })()}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {position.candidates.map((c, i) => {
                  const selected = selectedHere.includes(c.id)
                  const accent = c.party_color || 'var(--primary)'
                  const cap = Math.min(position.max_votes, position.candidates.length)
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggle(position.id, c.id, position.max_votes, cap)}
                      aria-pressed={selected}
                      className={`glass group relative flex flex-col overflow-hidden rounded-3xl text-left transition-all duration-200 ${
                        selected ? 'ring-4 ring-primary' : 'hover:-translate-y-1 hover:shadow-xl'
                      }`}
                    >
                      {/* Portrait — cut-outs sit on a clean studio backdrop */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-slate-200 to-slate-400">
                        {c.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photo_url} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <UserRound className="size-16 text-muted-foreground" />
                          </div>
                        )}
                        <AnimatePresence>
                          {selected && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                            >
                              <Check className="size-5" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Details */}
                      <div
                        className="flex flex-1 flex-col gap-1.5 p-4"
                        style={{ borderTop: `3px solid ${accent}` }}
                      >
                        <p className="text-base leading-tight font-bold sm:text-lg">{c.candidate_name}</p>
                        <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: c.party_color }}>
                          <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: accent }} />
                          {c.party_list || 'Independent'}
                        </p>
                        {(c.grade_level || c.section) && (
                          <span className="inline-flex w-fit items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {[c.grade_level, c.section].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        {c.motto && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground italic">“{c.motto}”</p>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <h1 className="text-3xl font-bold sm:text-4xl">Review your ballot</h1>
              <p className="mt-1.5 text-muted-foreground">Check your choices before submitting. You can still go back.</p>
              <div className="mt-6 space-y-4">
                {positions.map((p, i) => (
                  <div key={p.id} className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{p.position_name}</h2>
                      <Button size="sm" variant="ghost" onClick={() => setStep(i)}>
                        Change
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {(selections[p.id] ?? []).map((id) => {
                        const c = candidateById.get(id)
                        if (!c) return null
                        return (
                          <div key={id} className="flex items-center gap-2.5 rounded-xl bg-background/50 py-1.5 pr-4 pl-1.5">
                            {c.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.photo_url} alt="" className="size-9 rounded-lg object-cover" />
                            ) : (
                              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                <UserRound className="size-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium">{c.candidate_name}</span>
                          </div>
                        )
                      })}
                      {(selections[p.id] ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">No selection (abstain)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <ClipboardCheck className="size-5 text-primary" />
                  </span>
                  <h2 className="text-xl font-bold sm:text-2xl">{votingMechanics.declarationTitle}</h2>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {votingMechanics.declarationIntro}
                </p>
                <label className="mt-5 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-border bg-background/60 p-4 transition-colors select-none hover:border-primary/50 sm:p-5">
                  <input
                    type="checkbox"
                    checked={affirmed}
                    onChange={(e) => setAffirmed(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-primary sm:size-6"
                  />
                  <span className="text-sm leading-relaxed font-semibold sm:text-base">
                    {votingMechanics.declarationAffirmation}
                  </span>
                </label>
                <p className="mt-5 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground italic sm:text-base">
                  {votingMechanics.declarationSubmitNote}
                </p>
              </div>

              {error && (
                <p role="alert" className="mt-6 rounded-xl bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* footer nav */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 text-base"
            onClick={() => (step === 0 ? exitBallot() : setStep(step - 1))}
          >
            <ArrowLeft data-icon="inline-start" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {!isReview ? (
            <Button
              size="lg"
              className="h-12 px-6 text-base"
              onClick={() => (selectedHere.length === 0 ? setConfirmingAbstain(true) : setStep(step + 1))}
            >
              Next <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button size="lg" className="h-12 px-6 text-base" onClick={submit} disabled={!affirmed || submitting}>
              <Send data-icon="inline-start" /> {submitting ? 'Submitting…' : 'Cast my vote'}
            </Button>
          )}
        </div>
      </footer>

      {/* abstain confirmation */}
      <AnimatePresence>
        {confirmingAbstain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="glass w-full max-w-md rounded-3xl bg-popover p-8 text-center"
            >
              <h2 className="text-2xl font-bold">Skip {position.position_name}?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven't chosen anyone for this position. You can continue without voting here — this
                is called abstaining, and it's okay.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  size="lg"
                  className="h-12 text-base"
                  onClick={() => {
                    setConfirmingAbstain(false)
                    setStep(step + 1)
                  }}
                >
                  Yes, skip this position
                </Button>
                <Button variant="ghost" size="lg" className="h-12 text-base" onClick={() => setConfirmingAbstain(false)}>
                  <X data-icon="inline-start" /> Go back and choose
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-2xl bg-popover px-5 py-3 text-sm font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
