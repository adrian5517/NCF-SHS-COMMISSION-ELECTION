'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { staffLogin } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SchoolLogos } from '@/components/school-logos'

const field =
  'w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

export default function LoginPage() {
  const [state, action, pending] = useActionState(staffLogin, null)

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center px-6">
      <div className="absolute top-5 right-6">
        <ThemeToggle />
      </div>
      <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
        <SchoolLogos className="mb-6" />
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Staff Portal</h1>
            <p className="text-sm text-muted-foreground">Admin & poll watcher sign-in</p>
          </div>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className={field} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
          </div>
          {state && !state.ok && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
