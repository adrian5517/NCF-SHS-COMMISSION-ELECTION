'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { staffLogin } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const field =
  'w-full rounded-xl border border-border/70 bg-white/90 px-11 py-3 text-sm text-black outline-none transition-all placeholder:text-muted-foreground/80 focus:border-[#6f1d34]/60 focus:ring-4 focus:ring-[#6f1d34]/15 min-h-[46px]'

export default function LoginPage() {
  const [state, action, pending] = useActionState(staffLogin, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#42101c]">
      {/* Background Graphic / Wallpaper Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/NCF-SENIOR-HIGHSCHOOL.png"
          alt="NCF Senior High School Background"
          className="h-full w-full object-cover opacity-100"
        />
        {/* Professional gradient overlay for contrast and depth */}
        <div className="absolute inset-0 " />
      </div>

      {/* Top Controls Header */}
      <div className="absolute top-4 right-4 z-30 sm:top-6 sm:right-8">
        <ThemeToggle />
      </div>

      {/* Main Responsive Layout Wrapper */}
      <div className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-8 lg:justify-end lg:pr-20 xl:pr-32">
        <div className="w-full max-w-[520px]">
          {/* Card Container */}
          <div className="relative mt-10 rounded-[28px] border border-white/20 bg-white/95 px-6 pt-18 pb-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:mt-14 sm:px-8 sm:pt-22 sm:pb-10">
            
            {/* Floating Brand Emblem Logo */}
            <div className="absolute -top-14 left-1/2 flex size-28 -translate-x-1/2 items-center justify-center sm:-top-20 sm:size-36">
              <Image
                src="/ncf-shs-big.png"
                alt="NCF SHS Commission on Elections"
                width={160}
                height={160}
                className="h-18 w-18 object-contain sm:h-24 sm:w-24"
                priority
              />
            </div>

            {/* Back Navigation Link */}
            <Link
              href="/"
              className="group mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#6b4650] transition-colors hover:text-[#42101c] sm:mb-6 sm:text-sm"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to home</span>
            </Link>

            {/* Header Title & Subtitle */}
            <div className="mb-6 text-center sm:mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#42101c] sm:text-[2rem]">
                Staff Portal Login
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-[#78525e] sm:text-sm">
                Enter your official account credentials to manage and monitor
                election activities.
              </p>
            </div>

            {/* Authentication Form */}
            <form action={action} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b4650] sm:text-xs"
                >
                  Email Address
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@ncfshs.edu.ph"
                    required
                    className={field}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b4650] sm:text-xs"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8a6670]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    className={field + " pr-12"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 sm:size-[18px]" />
                    ) : (
                      <Eye className="size-4 sm:size-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {state && !state.ok && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive sm:text-sm"
                >
                  <span>{state.error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-2 h-12 w-full rounded-xl bg-[linear-gradient(180deg,#6f1d34_0%,#4f1324_100%)] text-sm font-bold tracking-wide text-white shadow-[0_8px_20px_rgba(73,17,34,0.3)] transition-all hover:translate-y-[-1px] hover:brightness-110 active:translate-y-[1px]"
                disabled={pending}
              >
                {pending ? "Signing in..." : "Sign In to Portal"}
              </Button>
            </form>

            {/* Security Confidence Footer Inside Card */}
            <div className="mt-6 border-t border-border/60 pt-5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#6b4a54]">
                <ShieldCheck className="size-4 text-[#6f1d34]" />
                <span>Your access is secure and confidential</span>
              </div>
              <p className="mt-3 text-[11px] text-[#8a6a74]">
                Copyright © Naga College Foundation, Inc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}