'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchThreadsForEntry, type ThreadEcho } from '@/app/actions/entries'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatEchoDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

function similarityBarColor(score: number): string {
  if (score >= 0.92) return 'bg-rose-400/70'
  if (score >= 0.85) return 'bg-amber-400/60'
  return 'bg-indigo-400/50'
}

function similarityBarWidth(score: number): string {
  const pct = Math.round(((score - 0.75) / 0.25) * 75 + 25)
  return `${Math.min(100, pct)}%`
}

interface Props {
  entryId: string
  refreshTrigger: number
}

export function EchoSidebar({ entryId, refreshTrigger }: Props) {
  const router = useRouter()
  const [echoes, setEchoes] = useState<ThreadEcho[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchThreadsForEntry(entryId).then((data) => {
      if (!cancelled) {
        setEchoes(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [entryId, refreshTrigger])

  return (
    <aside
      className={`
        hidden md:flex
        flex-shrink-0 flex-col border-l border-app-border bg-app-bg
        transition-[width] duration-200 ease-in-out overflow-hidden
        ${open ? 'w-52' : 'w-9'}
      `}
    >
      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Hide echoes' : 'Show echoes'}
        className="flex items-center justify-center w-9 h-9 flex-shrink-0 text-app-ghost hover:text-app-secondary transition-colors text-base"
      >
        {open ? '→' : '←'}
      </button>

      {/* Content */}
      <div
        className={`flex flex-col px-3 pb-4 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <p className="text-[10px] text-app-ghost tracking-widest uppercase mb-4 select-none">
          echoes
        </p>

        {loading && (
          <div className="w-2 h-2 rounded-full bg-app-ghost animate-pulse" />
        )}

        {!loading && echoes.length === 0 && (
          <p className="text-app-ghost text-[11px] leading-relaxed">
            write more to surface connections
          </p>
        )}

        {!loading && echoes.length > 0 && (
          <div className="space-y-5">
            {echoes.map((echo) => (
              <button
                key={echo.related_entry_id}
                onClick={() => router.push(`/entry/${echo.entry_date}`)}
                className="w-full text-left group"
              >
                <p className="text-app-muted text-[11px] mb-1 group-hover:text-app-secondary transition-colors">
                  {formatEchoDate(echo.entry_date)}
                </p>
                <p className="text-app-ghost text-[11px] leading-relaxed line-clamp-2 group-hover:text-app-muted transition-colors">
                  {echo.content?.slice(0, 100) ?? ''}
                </p>
                <div className="mt-2 h-[2px] rounded-full bg-app-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${similarityBarColor(echo.similarity_score)}`}
                    style={{ width: similarityBarWidth(echo.similarity_score) }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
