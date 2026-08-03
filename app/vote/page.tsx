'use client'

import { useActionState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import { studentLogin } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'

const bigField =
  'w-full rounded-xl border border-border/70 bg-white/92 py-3.5 pr-4 pl-11 text-base font-semibold tracking-[0.08em] text-foreground uppercase outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/25 min-h-[48px] sm:py-4 sm:text-lg'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#f6dbd3_0%,#edc3b8_42%,#d8a193_100%)] px-4 py-10 text-foreground sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.58)_0%,transparent_36%),radial-gradient(circle_at_85%_12%,rgba(122,20,49,0.12)_0%,transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.20)_10%,rgba(255,255,255,0.05)_100%)]" />
      <div className="pointer-events-none absolute inset-0">
        <img src="/lolo-mel.webp" alt="" className="h-full w-full object-cover opacity-12" />
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-lg">
        <div className="relative mt-12 rounded-[22px] border border-white/70 bg-white/92 px-5 pt-16 pb-7 shadow-[0_18px_45px_rgba(66,14,30,0.2)] backdrop-blur-[2px] sm:mt-16 sm:rounded-[28px] sm:px-8 sm:pt-20 sm:pb-9">
          <div className="absolute -top-12 left-1/2 flex size-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#fff8f5] shadow-[0_10px_24px_rgba(75,18,32,0.2)] sm:-top-16 sm:size-32">
            <Image src="/ncf-shs-big.png" alt="NCF SHS Commission on Elections" width={112} height={112} className="h-16 w-16 object-contain sm:h-24 sm:w-24" priority />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#42101c] sm:text-[2rem]">Student Voter Login</h1>
            <p className="mt-2 text-sm leading-snug text-[#6a4651] sm:text-base">
              Enter your Student Code and Voting PIN to securely access your ballot.
            </p>
          </div>

          <form ref={formRef} action={action} className="mt-7 space-y-4 text-left sm:mt-8 sm:space-y-5">
          <div>
            <label htmlFor="lrn" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b4650] sm:text-[0.78rem]">
              Student Code
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
              <input
                id="lrn"
                name="lrn"
                inputMode="text"
                autoComplete="off"
                required
                placeholder="12-01010"
                className={bigField}
              />
            </div>
          </div>
          <div>
            <label htmlFor="code" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b4650] sm:text-[0.78rem]">
              Voting PIN
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
              <input
                id="code"
                name="code"
                autoComplete="off"
                required
                maxLength={6}
                placeholder="AB3CD"
                className={bigField}
              />
            </div>
          </div>
          {state && !state.ok && (
            state.error.includes('already voted') ? (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-xl bg-success/15 px-4 py-3 text-center text-sm font-medium text-success sm:text-base"
              >
                <CheckCircle2 className="size-5 shrink-0" /> You've already voted — thank you for participating!
              </p>
            ) : (
              <p
                role="alert"
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive/15 px-4 py-3 text-center text-sm font-medium text-destructive sm:text-base"
              >
                <TriangleAlert className="size-5 shrink-0" /> {state.error}
              </p>
            )
          )}
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl bg-[linear-gradient(180deg,#6f1d34_0%,#4f1324_100%)] text-base font-semibold text-white shadow-[0_6px_14px_rgba(73,17,34,0.35)] transition-transform hover:translate-y-[-1px] hover:brightness-105 sm:h-12 sm:text-lg"
            disabled={pending}
          >
            <KeyRound data-icon="inline-start" />
            {pending ? 'Checking...' : 'Login'}
          </Button>
        </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#6b4a54] sm:mt-6 sm:text-sm">
            <ShieldCheck className="size-4" />
            <span>Your vote is secure and confidential</span>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#7f616a] sm:text-xs">Copyright © Naga College Foundation, Inc.</p>
        </div>
      </div>
    </div>
  )
}
