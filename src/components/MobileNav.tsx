'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/today',
    label: 'today',
    match: (p: string) => p === '/today' || p.startsWith('/entry/'),
  },
  {
    href: '/week',
    label: 'week',
    match: (p: string) => p.startsWith('/week'),
  },
  {
    href: '/insights',
    label: 'insights',
    match: (p: string) => p.startsWith('/insights'),
  },
  {
    href: '/writing',
    label: 'writing',
    match: (p: string) => p.startsWith('/writing'),
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-app-border bg-app-bg z-50 flex">
      {NAV_ITEMS.map(({ href, label, match }) => {
        const isActive = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className={`
              flex-1 py-3.5 text-center text-[10px] tracking-widest uppercase transition-colors
              ${isActive ? 'text-app-secondary font-medium' : 'text-app-ghost'}
            `}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
