import Link from 'next/link'
import { MonitorPlay, ShieldCheck, Vote } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { SchoolLogos } from '@/components/school-logos'

export default function Home() {
  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lolo-mel.webp" alt="" className="h-full w-full object-cover opacity-20" />
      </div>
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ncf-shs.png"
            alt=""
            className="size-10 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-border"
          />
          <span className="font-display text-lg font-semibold">NCF-SHS-COMMISSION-ON-ELECTIONS</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24">
        <SchoolLogos className="mb-6" />
        <p className="glass mb-6 rounded-full px-4 py-1.5 text-xs font-medium tracking-widest text-accent-foreground uppercase">
          NCF SHS Commission on Elections 2026
        </p>
        <h1 className="max-w-3xl text-5xl font-bold text-balance sm:text-6xl">
          Integrity in Every Ballot.
          <span className="block text-destructive">Equality in Every Voice.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
          SANGHAYA : Leading with Integrity, Serving with Dignity
        </p>

        <div className="mt-14 grid w-full gap-5 sm:grid-cols-3">
          <Link
            href="/vote"
            className="glass group rounded-2xl p-7 text-left transition-all hover:-translate-y-1 hover:border-primary/50"
          >
            <Vote className="mb-4 size-8 text-primary transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold">Student Voting Booth</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your Student ID and voting code to cast your ballot.
            </p>
          </Link>
          <Link
            href="/login"
            className="glass group rounded-2xl p-7 text-left transition-all hover:-translate-y-1 hover:border-primary/50"
          >
            <ShieldCheck className="mb-4 size-8 text-chart-2 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold">Staff Portal</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Admin and poll watcher sign-in for election management.
            </p>
          </Link>
          <Link
            href="/projector"
            className="glass group rounded-2xl p-7 text-left transition-all hover:-translate-y-1 hover:border-primary/50"
          >
            <MonitorPlay className="mb-4 size-8 text-chart-3 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold">Projector Mode</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Big-screen live turnout and results display.
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}
