'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Send, ShieldCheck, UserRound, X } from 'lucide-react'
import { exitBallot, submitBallot } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'
import type { Ballot, BallotCandidate } from '@/lib/types'

const IDLE_MS = 60_000

export function BallotWizard({ ballot, studentName }: { ballot: Ballot; studentName: string }) {
  const positions = ballot.positions
  const [step, setStep] = useState(0) // positions.length = review
  const [showWelcome, setShowWelcome] = useState(true)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [toast, setToast] = useState('')
  const [confirmingAbstain, setConfirmingAbstain] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
      window.location.href = '/vote'
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

  function toggle(positionId: string, candidateId: string, maxVotes: number) {
    setSelections((prev) => {
      const current = prev[positionId] ?? []
      if (current.includes(candidateId)) {
        return { ...prev, [positionId]: current.filter((id) => id !== candidateId) }
      }
      if (maxVotes === 1) {
        return { ...prev, [positionId]: [candidateId] }
      }
      if (current.length >= maxVotes) {
        showToast(`You can only choose ${maxVotes} for this position.`)
        return prev
      }
      return { ...prev, [positionId]: [...current, candidateId] }
    })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    const result = await submitBallot(selections)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setConfirming(false)
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

  const isReview = step >= positions.length
  const position = positions[Math.min(step, positions.length - 1)]
  const selectedHere = selections[position?.id ?? ''] ?? []

  return (
    <div className="dark bg-aurora min-h-screen bg-background pb-32 text-foreground">
      {/* welcome */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="glass w-full max-w-md rounded-3xl bg-popover p-8 text-center sm:p-10"
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15"
              >
                <ShieldCheck className="size-10 text-primary" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-6 text-3xl font-bold"
              >
                Vote Wisely!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="mt-3 text-sm text-muted-foreground"
              >
                Hi {studentName.split(' ')[0]}! Your identity stays private and your ballot is anonymous.
                Take a moment to choose the candidates who will represent {ballot.election.title} best.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <Button size="lg" className="mt-7 h-12 w-full text-base" onClick={() => setShowWelcome(false)}>
                  Let's Vote <ArrowRight data-icon="inline-end" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {position.max_votes === 1
                  ? 'Tap one candidate to choose.'
                  : `Choose up to ${position.max_votes} candidates. (${selectedHere.length}/${position.max_votes} selected)`}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {position.candidates.map((c, i) => {
                  const selected = selectedHere.includes(c.id)
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggle(position.id, c.id, position.max_votes)}
                      aria-pressed={selected}
                      className={`glass relative flex items-center gap-4 rounded-2xl p-4 text-left transition-colors ${
                        selected ? 'border-primary ring-4 ring-primary/30' : 'hover:border-primary/40'
                      }`}
                      style={{ borderLeftWidth: 4, borderLeftColor: c.party_color || 'var(--border)' }}
                    >
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo_url} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted">
                          <UserRound className="size-9 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-lg leading-tight font-semibold">{c.candidate_name}</p>
                        <p className="mt-0.5 text-sm font-medium" style={{ color: c.party_color }}>
                          {c.party_list || 'Independent'}
                        </p>
                        {c.motto && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">“{c.motto}”</p>}
                      </div>
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          >
                            <Check className="size-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
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
            <Button size="lg" className="h-12 px-6 text-base" onClick={() => setConfirming(true)}>
              <Send data-icon="inline-start" /> Submit my vote
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

      {/* confirm modal */}
      <AnimatePresence>
        {confirming && (
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
              <h2 className="text-2xl font-bold">Submit your ballot?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Once submitted, your vote is final and cannot be changed.
              </p>
              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2.5">
                <Button size="lg" className="h-12 text-base" onClick={submit} disabled={submitting}>
                  {submitting ? 'Submitting…' : error ? 'Retry submit' : 'Yes, submit my vote'}
                </Button>
                <Button variant="ghost" size="lg" className="h-12 text-base" onClick={() => setConfirming(false)} disabled={submitting}>
                  <X data-icon="inline-start" /> Go back
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
