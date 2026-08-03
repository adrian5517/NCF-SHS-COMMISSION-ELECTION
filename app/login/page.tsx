'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { staffLogin } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const field =
  'w-full rounded-xl border border-border/70 bg-white/90 px-11 py-3 text-sm text-black outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 min-h-[46px]'

export default function LoginPage() {
  const [state, action, pending] = useActionState(staffLogin, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#f6dbd3_0%,#edc3b8_42%,#d8a193_100%)] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.58)_0%,transparent_36%),radial-gradient(circle_at_85%_12%,rgba(122,20,49,0.12)_0%,transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.20)_10%,rgba(255,255,255,0.05)_100%)]" />
      <div className="pointer-events-none absolute inset-0">
        <img src="/lolo-mel.webp" alt="" className="h-full w-full object-cover opacity-15" />
      </div>
      <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="relative mt-12 rounded-[22px] border border-white/70 bg-white/92 px-5 pt-16 pb-7 shadow-[0_18px_45px_rgba(66,14,30,0.2)] backdrop-blur-[2px] sm:mt-16 sm:rounded-[28px] sm:px-7 sm:pt-20 sm:pb-8">
          <div className="absolute -top-12 left-1/2 flex size-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#fff8f5] shadow-[0_10px_24px_rgba(75,18,32,0.2)] sm:-top-16 sm:size-32">
            <Image src="/ncf-shs-big.png" alt="NCF SHS Commission on Elections" width={112} height={112} className="h-16 w-16 object-contain sm:h-24 sm:w-24" priority />
          </div>

          <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-black transition-colors hover:text-foreground sm:mb-5 sm:text-sm">
            <ArrowLeft className="size-3.5 sm:size-4" /> Back to home
          </Link>

          <div className="mb-6 text-center sm:mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-[#42101c] sm:text-[2rem]">Staff Portal Login</h1>
            <p className="mt-2 text-sm leading-snug text-[#6a4651] sm:text-base">Enter your official account credentials to manage and monitor election activities.</p>
          </div>

          <form action={action} className="space-y-3.5 sm:space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b4650] sm:text-[0.78rem]">
                Email Address
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
                <input id="email" name="email" type="email" autoComplete="email" placeholder="admin@ncfshs.edu.ph" required className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b4650] sm:text-[0.78rem]">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className={field + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4 sm:size-[18px]" /> : <Eye className="size-4 sm:size-[18px]" />}
                </button>
              </div>
            </div>

            {state && !state.ok && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(180deg,#6f1d34_0%,#4f1324_100%)] text-base font-semibold text-white shadow-[0_6px_14px_rgba(73,17,34,0.35)] transition-transform hover:translate-y-[-1px] hover:brightness-105"
              disabled={pending}
            >
              {pending ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#6b4a54] sm:mt-6 sm:text-sm">
            <ShieldCheck className="size-4" />
            <span>Your access is secure and confidential</span>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#7f616a] sm:text-xs">Copyright © Naga College Foundation, Inc.</p>
        </div>
      </div>
    </div>
  )
}
