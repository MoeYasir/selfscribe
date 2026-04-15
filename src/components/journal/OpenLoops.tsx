'use client'

import Link from 'next/link'
import type { OpenLoopEntry } from '@/types/app'

interface Props {
  loops: OpenLoopEntry[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function OpenLoops({ loops }: Props) {
  if (!loops.length) return null

  return (
    <div className="max-w-2xl mx-auto w-full px-4 md:px-8 pb-8">
      <p className="text-[11px] text-app-ghost tracking-widest uppercase mb-3 select-none">
        still open
      </p>
      <div className="space-y-2">
        {loops.map((loop) => (
          <Link
            key={loop.id}
            href={`/entry/${loop.entry_date}`}
            className="flex items-baseline gap-3 group"
          >
            <span className="text-[11px] text-app-ghost tabular-nums shrink-0">
              {formatDate(loop.entry_date)}
            </span>
            <span className="text-sm text-app-muted group-hover:text-app-secondary transition-colors truncate">
              {loop.loop_context ?? 'unresolved intention'}
            </span>
            <span className="text-[10px] text-app-ghost shrink-0 ml-auto">still open?</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
