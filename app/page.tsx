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
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ncf-shs.png"
            alt=""
            className="size-8 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-border sm:size-10"
          />
          <span className="hidden text-sm font-semibold sm:inline sm:text-lg">NCF-SHS Commission on Elections</span>
          <span className="text-xs font-semibold sm:hidden">NCF-SHS COMELEC</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 pt-12 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-24">
        <SchoolLogos className="mb-5 sm:mb-6" />
        <p className="glass mb-5 rounded-full px-3 py-1 text-[11px] font-medium tracking-widest text-accent-foreground uppercase sm:mb-6 sm:px-4 sm:py-1.5 sm:text-xs">
          NCF SHS Commission on Elections 2026
        </p>
        <h1 className="max-w-3xl text-3xl font-bold text-balance sm:text-5xl lg:text-6xl">
          Integrity in Every Ballot.
          <span className="mt-1 block text-destructive">Equality in Every Voice.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground text-pretty sm:mt-6 sm:text-lg">
          SANGHAYA : Leading with Integrity, Serving with Dignity
        </p>

        <div className="mt-10 grid w-full gap-4 sm:mt-14 sm:gap-5 sm:grid-cols-3">
          <Link
            href="/vote"
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/40 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-background/60 hover:shadow-lg hover:shadow-primary/5 sm:p-7"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-primary/40 transition-transform duration-300 group-hover:scale-x-100 sm:h-1" />
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20 sm:mb-5 sm:p-3">
              <Vote className="size-5 text-primary transition-transform duration-300 group-hover:scale-110 sm:size-7" />
            </div>
            <h2 className="text-base font-semibold sm:text-xl">Student Voting Booth</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
              Enter your Student ID and voting code to cast your ballot.
            </p>
          </Link>
          <Link
            href="/login"
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/40 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-chart-2/40 hover:bg-background/60 hover:shadow-lg hover:shadow-chart-2/5 sm:p-7"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-chart-2 to-chart-2/40 transition-transform duration-300 group-hover:scale-x-100 sm:h-1" />
            <div className="mb-4 inline-flex rounded-xl bg-chart-2/10 p-2.5 ring-1 ring-chart-2/20 sm:mb-5 sm:p-3">
              <ShieldCheck className="size-5 text-chart-2 transition-transform duration-300 group-hover:scale-110 sm:size-7" />
            </div>
            <h2 className="text-base font-semibold sm:text-xl">Staff Portal</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
              Admin and poll watcher sign-in for election management.
            </p>
          </Link>
          <Link
            href="/projector"
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/40 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-chart-3/40 hover:bg-background/60 hover:shadow-lg hover:shadow-chart-3/5 sm:p-7"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-chart-3 to-chart-3/40 transition-transform duration-300 group-hover:scale-x-100 sm:h-1" />
            <div className="mb-4 inline-flex rounded-xl bg-chart-3/10 p-2.5 ring-1 ring-chart-3/20 sm:mb-5 sm:p-3">
              <MonitorPlay className="size-5 text-chart-3 transition-transform duration-300 group-hover:scale-110 sm:size-7" />
            </div>
            <h2 className="text-base font-semibold sm:text-xl">Projector Mode</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
              Big-screen live turnout and results display.
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}
