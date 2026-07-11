import { Eye, LogOut } from 'lucide-react'
import { requireRole, staffLogout } from '@/lib/actions/staff'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function WatchLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole() // any staff; watchers land here

  return (
    <div className="bg-aurora min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sidebar/70 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gradeschool-logo.png"
            alt=""
            className="size-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-border"
          />
          <span className="font-display text-sm font-semibold">NCF-Gradeschool-Voting</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-2/15 px-2.5 py-0.5 text-xs font-medium text-chart-2">
            <Eye className="size-3" /> Poll Watcher — read only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{profile.full_name}</span>
          <ThemeToggle />
          <form action={staffLogout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut data-icon="inline-start" /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="p-5 sm:p-8">{children}</main>
    </div>
  )
}
