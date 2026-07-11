'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Trophy,
  Users,
  Vote,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/elections', label: 'Elections', icon: Vote },
  { href: '/admin/candidates', label: 'Positions & Candidates', icon: ClipboardList },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/codes', label: 'Voting Codes', icon: KeyRound },
  { href: '/admin/results', label: 'Live Results', icon: Trophy },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function ProfileFooter({
  fullName,
  logoutAction,
}: {
  fullName: string
  logoutAction: () => Promise<void>
}) {
  return (
    <div className="border-t border-sidebar-border pt-3">
      <p className="truncate px-3 text-xs text-muted-foreground">{fullName}</p>
      <p className="px-3 text-[10px] tracking-widest text-primary uppercase">Administrator</p>
      <div className="mt-2 flex items-center justify-between px-1">
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut data-icon="inline-start" /> Sign out
          </Button>
        </form>
        <ThemeToggle />
      </div>
    </div>
  )
}

export function AdminNav({
  fullName,
  logoutAction,
}: {
  fullName: string
  logoutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gradeschool-logo.png"
            alt=""
            className="size-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-border"
          />
          <span className="font-display text-sm leading-tight font-semibold">NCF-Gradeschool-Voting</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2 pt-1">
              <span className="font-display text-sm font-semibold">Menu</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <ProfileFooter fullName={fullName} logoutAction={logoutAction} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 p-4 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gradeschool-logo.png"
            alt=""
            className="size-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-border"
          />
          <span className="font-display text-sm leading-tight font-semibold">NCF-Gradeschool-Voting</span>
        </div>
        <NavLinks pathname={pathname} />
        <ProfileFooter fullName={fullName} logoutAction={logoutAction} />
      </aside>
    </>
  )
}
