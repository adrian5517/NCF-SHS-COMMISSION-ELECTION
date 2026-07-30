'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { staffLogin } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SchoolLogos } from '@/components/school-logos'

const field =
  'w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40 min-h-[44px]'

export default function LoginPage() {
  const [state, action, pending] = useActionState(staffLogin, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="bg-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <img src="/lolo-mel.webp" alt="" className="h-full w-full object-cover opacity-30" />
      </div>
      <div className="absolute top-5 right-6">
        <ThemeToggle />
      </div>
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:rounded-3xl sm:p-10">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:text-sm">
          <ArrowLeft className="size-3.5 sm:size-4" /> Back to home
        </Link>
        <div className="mb-6 sm:mb-8">
          <SchoolLogos inline />
        </div>
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-11 sm:rounded-2xl">
            <ShieldCheck className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">Staff Portal</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">Admin & poll watcher sign-in</p>
          </div>
        </div>

        <form action={action} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium sm:mb-1.5 sm:text-sm">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="admin@ncfshs.edu.ph" required className={field} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium sm:mb-1.5 sm:text-sm">
              Password
            </label>
            <div className="relative">
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
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4 sm:size-5" /> : <Eye className="size-4 sm:size-5" />}
              </button>
            </div>
          </div>
          {state && !state.ok && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
