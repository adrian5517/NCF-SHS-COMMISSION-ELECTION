'use client'

import { useActionState, useEffect, useRef } from 'react'
import { CheckCircle2, KeyRound, TriangleAlert } from 'lucide-react'
import { studentLogin } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'
import { SchoolLogos } from '@/components/school-logos'

const bigField =
  'w-full rounded-2xl border-2 border-input bg-background/60 px-5 py-4 text-center font-mono text-2xl tracking-[0.3em] outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/25'

// Kiosk login: no navigation chrome, big touch targets, clears itself when idle.
export default function VotePage() {
  const [state, action, pending] = useActionState(studentLogin, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let timer = setTimeout(reset, 60_000)
    function reset() {
      formRef.current?.reset()
    }
    function bump() {
      clearTimeout(timer)
      timer = setTimeout(reset, 60_000)
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [])

  return (
    <div className="dark bg-aurora flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass relative w-full max-w-xl rounded-3xl p-8 text-center sm:p-12">
        <SchoolLogos className="mb-6" />
        <h1 className="text-3xl font-bold sm:text-4xl">Student Voting Booth</h1>
        <p className="mt-2 text-muted-foreground">
          Type your <strong>Student ID</strong> and the <strong>voting code</strong> from your teacher.
        </p>

        <form ref={formRef} action={action} className="mt-8 space-y-5 text-left">
          <div>
            <label htmlFor="lrn" className="mb-2 block text-sm font-semibold tracking-wide uppercase">
              Student ID
            </label>
            <input
              id="lrn"
              name="lrn"
              inputMode="text"
              autoComplete="off"
              required
              placeholder="S-12345"
              className={`${bigField} uppercase`}
            />
          </div>
          <div>
            <label htmlFor="code" className="mb-2 block text-sm font-semibold tracking-wide uppercase">
              Voting code
            </label>
            <input
              id="code"
              name="code"
              autoComplete="off"
              required
              maxLength={6}
              placeholder="AB3CD"
              className={`${bigField} uppercase`}
            />
          </div>
          {state && !state.ok && (
            state.error.includes('already voted') ? (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-xl bg-success/15 px-4 py-3 text-center font-medium text-success"
              >
                <CheckCircle2 className="size-5 shrink-0" /> You've already voted — thank you for participating!
              </p>
            ) : (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive/15 px-4 py-3 text-center font-medium text-destructive"
              >
                <TriangleAlert className="size-5 shrink-0" /> {state.error}
              </p>
            )
          )}
          <Button type="submit" size="lg" className="h-14 w-full text-lg" disabled={pending}>
            <KeyRound data-icon="inline-start" />
            {pending ? 'Checking…' : 'Start voting'}
          </Button>
        </form>
      </div>
    </div>
  )
}
