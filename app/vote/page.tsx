'use client'

import { useActionState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import { studentLogin } from '@/lib/actions/vote'
import { Button } from '@/components/ui/button'

const bigField =
  'w-full rounded-xl border border-border/70 bg-white/90 py-3.5 pr-4 pl-11 text-base font-semibold tracking-[0.08em] text-black uppercase outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/80 focus:border-[#6f1d34]/60 focus:ring-4 focus:ring-[#6f1d34]/15 min-h-[48px] sm:py-4 sm:text-lg'

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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#42101c]">
      {/* Background Graphic / Wallpaper Layer matching staff page */}
      <div className="absolute inset-0 z-0">
        <img
          src="/NCF-SENIOR-HIGHSCHOOL.png"
          alt="NCF Senior High School Background"
          className="h-full w-full object-cover opacity-100"
        />
        <div className="absolute inset-0" />
      </div>

      {/* Main Responsive Layout Wrapper: Centered on mobile, right-aligned on web/desktop */}
      <div className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-8 lg:justify-end lg:pr-20 xl:pr-32">
        <div className="w-full max-w-[520px]">
          {/* Card Container matching staff portal style */}
          <div className="relative mt-10 rounded-[28px] border border-white/20 bg-white/95 px-6 pt-18 pb-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:mt-14 sm:px-8 sm:pt-22 sm:pb-10">
            
            {/* Floating Brand Emblem Logo (Enlarged size) */}
            <div className="absolute -top-14 left-1/2 flex size-28 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#fff8f5] shadow-[0_10px_24px_rgba(75,18,32,0.2)] sm:-top-20 sm:size-36">
              <Image
                src="/ncf-shs-big.png"
                alt="NCF SHS Commission on Elections"
                width={160}
                height={160}
                className="h-18 w-18 object-contain sm:h-24 sm:w-24"
                priority
              />
            </div>

            <div className="mb-6 text-center sm:mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#42101c] sm:text-[2rem]">
                Student Voter Login
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-[#78525e] sm:text-sm">
                Enter your Student Code and Voting PIN to securely access your ballot.
              </p>
            </div>

            <form ref={formRef} action={action} className="space-y-4 text-left sm:space-y-5">
              <div>
                <label
                  htmlFor="lrn"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b4650] sm:text-xs"
                >
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
                <label
                  htmlFor="code"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b4650] sm:text-xs"
                >
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
                className="mt-2 h-12 w-full rounded-xl bg-[linear-gradient(180deg,#6f1d34_0%,#4f1324_100%)] text-sm font-bold tracking-wide text-white shadow-[0_8px_20px_rgba(73,17,34,0.3)] transition-all hover:translate-y-[-1px] hover:brightness-110 active:translate-y-[1px] sm:h-12 sm:text-base"
                disabled={pending}
              >
                <KeyRound data-icon="inline-start" />
                {pending ? 'Checking...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 border-t border-border/60 pt-5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#6b4a54]">
                <ShieldCheck className="size-4 text-[#6f1d34]" />
                <span>Your vote is secure and confidential</span>
              </div>
              <p className="mt-3 text-[11px] text-[#8a6a74]">
                Copyright © Naga College Foundation, Inc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}