'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MobileNav } from '@/components/MobileNav'
import type { Json } from '@/types/database'

const POSITIVE = new Set([
  'happy', 'great', 'good', 'excited', 'joy', 'joyful', 'content', 'grateful', 'optimistic',
  'energized', 'proud', 'calm', 'peaceful', 'hopeful', 'motivated', 'inspired', 'productive',
  'focused', 'clear', 'alive', 'refreshed', 'amazing', 'awesome', 'confident', 'creative',
  'delighted', 'energetic', 'enthusiastic', 'fantastic', 'fulfilled', 'grounded', 'light',
  'loved', 'mindful', 'present', 'ready', 'resilient', 'strong', 'thankful', 'vibrant', 'warm',
])
const NEGATIVE = new Set([
  'sad', 'anxious', 'stressed', 'tired', 'angry', 'frustrated', 'worried', 'low', 'exhausted',
  'overwhelmed', 'depressed', 'lonely', 'lost', 'confused', 'stuck', 'unmotivated', 'heavy',
  'dark', 'numb', 'empty', 'hurt', 'broken', 'scared', 'tense', 'grief', 'resentful', 'drained',
  'burnt', 'foggy', 'disconnected', 'insecure', 'jealous', 'rushed', 'sluggish', 'uneasy',
  'uncertain', 'unhappy', 'unwell', 'withdrawn', 'burnout', 'meh',
])

function moodDotClass(mood: string): string {
  const w = mood.toLowerCase().trim()
  if (POSITIVE.has(w)) return 'bg-teal-400/70'
  if (NEGATIVE.has(w)) return 'bg-rose-400/70'
  return 'bg-amber-400/70'
}

function ageLabel(updatedAt: string): string {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
  if (days < 7) return 'this week'
  if (days < 14) return 'last week'
  if (days < 30) return 'this month'
  if (days < 60) return 'last month'
  return 'a while back'
}

type Theme = { theme_label: string; occurrence_count: number; last_seen: string | null }
type WeeklySummary = { week_start: string; emotional_arc: Json }
type OpenLoop = { id: string; entry_date: string; loop_context: string | null; updated_at: string }
type MirrorReport = { content: string | null; patterns: Json } | null
type EnergyMap = { gives_energy: string[]; drains_energy: string[] } | null

interface Props {
  today: string
  monthName: string
  mirrorReport: MirrorReport
  themes: Theme[]
  weeklySummaries: WeeklySummary[]
  openLoops: OpenLoop[]
  energyMap: Json | null
}

export function InsightsPage({
  today,
  monthName,
  mirrorReport,
  themes,
  weeklySummaries,
  openLoops,
  energyMap: initialEnergyMap,
}: Props) {
  const router = useRouter()
  const [generatingReport, setGeneratingReport] = useState(false)
  const [generatingEnergy, setGeneratingEnergy] = useState(false)
  const [energyMap, setEnergyMap] = useState<EnergyMap>(
    initialEnergyMap as EnergyMap
  )

  async function generateReport(force = false) {
    setGeneratingReport(true)
    try {
      await fetch('/api/mirror-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      router.refresh()
    } finally {
      setGeneratingReport(false)
    }
  }

  async function refreshEnergyMap() {
    setGeneratingEnergy(true)
    try {
      const res = await fetch('/api/energy-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const json = await res.json()
      if (json.data) setEnergyMap(json.data as EnergyMap)
    } finally {
      setGeneratingEnergy(false)
    }
  }

  const patterns = mirrorReport?.patterns as {
    dominant_emotion?: string
    main_themes?: string[]
    contradiction?: string
    peak_week?: string
    quietest_week?: string
  } | null

  const groupedLoops = openLoops.reduce<Record<string, OpenLoop[]>>((acc, loop) => {
    const label = ageLabel(loop.updated_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(loop)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-app-bg text-app-ink page-fade">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 h-11 border-b border-app-border">
        <Link href="/today" className="text-app-ghost hover:text-app-secondary text-xs transition-colors">
          ← today
        </Link>
        <div>
          <span className="text-app-ghost text-xs tracking-widest uppercase select-none">patterns</span>
          <span className="text-app-ghost text-xs ml-3 select-none">{monthName}</span>
        </div>
        <div className="w-16" />
      </header>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 pb-24 md:pb-12 space-y-16">

        {/* Mirror Report */}
        <section className="space-y-6">
          <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">mirror</p>

          {mirrorReport?.content ? (
            <div className="space-y-4">
              <div
                className="text-app-prose leading-[1.8] max-w-[65ch] space-y-4"
                style={{ fontFamily: 'Georgia, serif', fontSize: '15px' }}
              >
                {mirrorReport.content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <button
                onClick={() => generateReport(true)}
                disabled={generatingReport}
                className="text-[10px] text-app-ghost hover:text-app-muted transition-colors tracking-widest uppercase disabled:opacity-40"
              >
                {generatingReport ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-app-muted animate-pulse inline-block" />
                    regenerating…
                  </span>
                ) : 'regenerate'}
              </button>
            </div>
          ) : (
            <div className="border border-app-border rounded-lg p-6 space-y-4 max-w-[65ch]">
              <p className="text-app-muted text-sm">
                your mirror report generates after your first full week of writing
              </p>
              <button
                onClick={() => generateReport(false)}
                disabled={generatingReport}
                className="text-xs text-app-secondary hover:text-app-ink border border-app-border hover:border-app-muted rounded px-4 py-2 transition-colors disabled:opacity-40"
              >
                {generatingReport ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-app-muted animate-pulse inline-block" />
                    generating…
                  </span>
                ) : 'generate now'}
              </button>
            </div>
          )}
        </section>

        {/* Patterns Grid */}
        <section className="space-y-4">
          <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">patterns</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 1: Recurring themes */}
            <div className="border border-app-border rounded-lg p-5 space-y-4">
              <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">what keeps coming up</p>
              {themes.length > 0 ? (
                <div className="space-y-3">
                  {themes.map((t) => {
                    const maxCount = themes[0].occurrence_count
                    const pct = Math.round((t.occurrence_count / maxCount) * 100)
                    return (
                      <div key={t.theme_label} className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-app-secondary">{t.theme_label}</span>
                          <span className="text-[10px] text-app-ghost tabular-nums">
                            {t.last_seen ? new Date(t.last_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <div className="h-[2px] bg-app-border rounded-full">
                          <div
                            className="h-full bg-app-muted rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-app-ghost text-sm">builds as you write</p>
              )}
            </div>

            {/* Card 2: Emotional arc */}
            <div className="border border-app-border rounded-lg p-5 space-y-4">
              <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">how this month felt</p>
              {weeklySummaries.length > 0 ? (
                <div className="space-y-3">
                  {weeklySummaries.map((ws) => {
                    const arc = (ws.emotional_arc as Array<{ date: string; mood: string }>) ?? []
                    const weekLabel = new Date(ws.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <div key={ws.week_start} className="flex items-center gap-3">
                        <span className="text-[10px] text-app-ghost w-12 shrink-0">{weekLabel}</span>
                        <div className="flex gap-1">
                          {arc.map((item, i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full ${moodDotClass(item.mood)}`}
                              title={item.mood}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-app-ghost text-sm">builds as you write</p>
              )}
            </div>

            {/* Card 3: Contradiction */}
            <div className="border border-app-border rounded-lg p-5 space-y-4">
              <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">what you say vs what you do</p>
              {patterns?.contradiction ? (
                <blockquote className="border-l-2 border-app-muted pl-4 text-app-secondary text-[15px] leading-relaxed">
                  {patterns.contradiction}
                </blockquote>
              ) : (
                <p className="text-app-ghost text-sm">generates with your mirror report</p>
              )}
            </div>

            {/* Card 4: Still unresolved */}
            <div className="border border-app-border rounded-lg p-5 space-y-4">
              <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">still unresolved</p>
              {openLoops.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedLoops).map(([label, loops]) => (
                    <div key={label} className="space-y-2">
                      <p className="text-[10px] text-app-ghost tracking-widest uppercase">{label}</p>
                      {loops.map((loop) => (
                        <Link
                          key={loop.id}
                          href={`/entry/${loop.entry_date}`}
                          className="block text-sm text-app-secondary hover:text-app-ink transition-colors truncate"
                        >
                          {loop.loop_context ?? 'unresolved intention'}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-app-ghost text-sm">nothing unresolved right now</p>
              )}
            </div>
          </div>
        </section>

        {/* Energy Map */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">what moves you</p>
            <button
              onClick={refreshEnergyMap}
              disabled={generatingEnergy}
              className="text-[10px] text-app-ghost hover:text-app-muted transition-colors tracking-widest uppercase disabled:opacity-40"
            >
              {generatingEnergy ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-app-muted animate-pulse inline-block" />
                  refreshing…
                </span>
              ) : 'refresh'}
            </button>
          </div>

          {energyMap ? (
            <div className="grid grid-cols-2 gap-8 max-w-xl">
              <div className="space-y-3">
                <p className="text-[10px] text-teal-400/50 tracking-widest uppercase select-none">gives energy</p>
                <ul className="space-y-2">
                  {energyMap.gives_energy?.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-app-secondary">{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] text-rose-400/50 tracking-widest uppercase select-none">drains energy</p>
                <ul className="space-y-2">
                  {energyMap.drains_energy?.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-app-secondary">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-app-ghost text-sm">
                generates from your mood words and focus notes
              </p>
              <button
                onClick={refreshEnergyMap}
                disabled={generatingEnergy}
                className="text-xs text-app-secondary hover:text-app-ink border border-app-border hover:border-app-muted rounded px-4 py-2 transition-colors disabled:opacity-40"
              >
                {generatingEnergy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-app-muted animate-pulse inline-block" />
                    generating…
                  </span>
                ) : 'generate now'}
              </button>
            </div>
          )}
        </section>

      </div>
      <MobileNav />
    </div>
  )
}
