'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { MobileNav } from '@/components/MobileNav'
import { saveWeeklyReflection } from '@/app/actions/entries'
import type { WeekDayEntry, WeeklySummaryData } from '@/types/app'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function moodDotClass(moodWord: string | null): string {
  if (!moodWord) return 'border border-app-muted'
  const w = moodWord.toLowerCase().trim()
  if (POSITIVE.has(w)) return 'bg-teal-400/70'
  if (NEGATIVE.has(w)) return 'bg-rose-400/70'
  return 'bg-amber-400/70'
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sm = MONTHS[start.getMonth()]
  const sd = start.getDate()
  const em = MONTHS[end.getMonth()]
  const ed = end.getDate()
  if (sm === em) return `${sm} ${sd} – ${ed}`
  return `${sm} ${sd} – ${em} ${ed}`
}

interface Props {
  weekStart: string
  today: string
  entries: WeekDayEntry[]
  summary: WeeklySummaryData | null
}

export function WeekView({ weekStart, today, entries, summary }: Props) {
  const [reflection, setReflection] = useState(summary?.user_reflection ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entryByDate = new Map(entries.map((e) => [e.entry_date, e]))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { dateStr, dayName: DAY_NAMES[i], dayNum: d.getDate() }
  })

  const persist = useCallback(
    async (val: string) => {
      setSaveStatus('saving')
      try {
        await saveWeeklyReflection(weekStart, val)
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    },
    [weekStart]
  )

  function handleReflectionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setReflection(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(val), 2000)
  }

  function handleReflectionBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    persist(reflection)
  }

  function offsetWeek(n: number): string {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + n * 7)
    const thisWeekStart = getThisWeekStart()
    const result = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (result > thisWeekStart) return thisWeekStart
    return result
  }

  function getThisWeekStart(): string {
    const d = new Date(today + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const thisWeekStart = getThisWeekStart()
  const isCurrentWeek = weekStart === thisWeekStart

  return (
    <div className="min-h-screen bg-app-bg text-app-ink page-fade">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 h-11 border-b border-app-border">
        <Link href="/today" className="text-app-ghost hover:text-app-secondary text-xs transition-colors">
          ← today
        </Link>
        <span className="text-app-secondary text-sm select-none">{formatWeekRange(weekStart)}</span>
        <div className="flex gap-4">
          <Link
            href={`/week?w=${offsetWeek(-1)}`}
            className="text-app-ghost hover:text-app-secondary text-xs transition-colors"
          >
            ‹ prev
          </Link>
          {!isCurrentWeek && (
            <Link
              href={`/week?w=${thisWeekStart}`}
              className="text-app-ghost hover:text-app-secondary text-xs transition-colors"
            >
              this week
            </Link>
          )}
          {!isCurrentWeek && (
            <Link
              href={`/week?w=${offsetWeek(1)}`}
              className="text-app-ghost hover:text-app-secondary text-xs transition-colors"
            >
              next ›
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 md:px-8 py-10 pb-24 md:pb-10 space-y-12">
        {/* 7-day timeline */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ dateStr, dayName, dayNum }) => {
            const entry = entryByDate.get(dateStr)
            const isFuture = dateStr > today
            const isToday = dateStr === today
            const firstLine = entry?.content?.split('\n')[0]?.slice(0, 60) ?? null

            return (
              <div
                key={dateStr}
                className={`flex flex-col gap-2 ${isFuture ? 'opacity-20' : ''}`}
              >
                <div className="text-center">
                  <div className="text-[10px] text-app-ghost uppercase tracking-widest">{dayName}</div>
                  <div
                    className={`text-sm mt-0.5 ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-app-today-bg text-app-today-text font-semibold flex items-center justify-center mx-auto'
                        : 'text-app-secondary'
                    }`}
                  >
                    {dayNum}
                  </div>
                </div>

                <div className="flex justify-center">
                  <span
                    className={`w-2 h-2 rounded-full ${moodDotClass(entry?.mood_word ?? null)}`}
                    title={entry?.mood_word ?? undefined}
                  />
                </div>

                {firstLine && !isFuture && (
                  <Link href={isToday ? '/today' : `/entry/${dateStr}`}>
                    <p className="text-[10px] text-app-ghost hover:text-app-muted transition-colors leading-snug line-clamp-3">
                      {firstLine}
                    </p>
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* AI Summary */}
        <div className="space-y-2">
          <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">
            weekly reflection
          </p>
          {summary?.ai_summary ? (
            <p className="text-app-secondary text-sm leading-relaxed">{summary.ai_summary}</p>
          ) : (
            <p className="text-app-ghost text-sm italic">your week summary generates on Friday</p>
          )}
        </div>

        {/* User reflection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">
              your reflection
            </p>
            <span
              className={`text-xs transition-opacity duration-500 ${
                saveStatus === 'saving'
                  ? 'text-app-ghost opacity-100'
                  : saveStatus === 'saved'
                  ? 'text-app-muted opacity-100'
                  : 'opacity-0'
              }`}
            >
              {saveStatus === 'saving' ? 'saving…' : 'saved'}
            </span>
          </div>
          <textarea
            value={reflection}
            onChange={handleReflectionChange}
            onBlur={handleReflectionBlur}
            placeholder="How did this week feel overall…"
            rows={5}
            className="w-full bg-transparent resize-none focus:outline-none text-app-prose placeholder-app-ghost text-sm leading-relaxed"
          />
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
