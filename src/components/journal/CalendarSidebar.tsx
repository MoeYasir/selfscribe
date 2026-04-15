'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { fetchMonthEntryDates } from '@/app/actions/entries'
import type { MonthEntry } from '@/types/app'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

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

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
}

function NavLink({ href, children, exact }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`
        block text-[13px] py-2 pl-5 border-l-[3px] transition-colors
        ${isActive
          ? 'border-teal-400/70 text-app-secondary font-medium'
          : 'border-transparent text-app-ghost hover:text-app-secondary font-normal'}
      `}
    >
      {children}
    </Link>
  )
}

interface Props {
  today: string
  currentDate: string
  initialMonthEntries: MonthEntry[]
}

export function CalendarSidebar({ today, currentDate, initialMonthEntries }: Props) {
  const router = useRouter()

  const [todayYear, todayMonth] = today.split('-').map(Number)
  const [viewYear, setViewYear] = useState(() => Number(currentDate.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => Number(currentDate.split('-')[1]))

  const [entryMap, setEntryMap] = useState<Map<string, string | null>>(
    () => new Map(initialMonthEntries.map((e) => [e.entry_date, e.mood_word]))
  )
  const [open, setOpen] = useState(true)

  async function goToMonth(year: number, month: number) {
    setViewYear(year)
    setViewMonth(month)
    const entries = await fetchMonthEntryDates(year, month)
    setEntryMap(new Map(entries.map((e) => [e.entry_date, e.mood_word])))
  }

  function prevMonth() {
    const m = viewMonth - 1
    if (m < 1) goToMonth(viewYear - 1, 12)
    else goToMonth(viewYear, m)
  }

  function nextMonth() {
    if (viewYear === todayYear && viewMonth === todayMonth) return
    const m = viewMonth + 1
    if (m > 12) goToMonth(viewYear + 1, 1)
    else goToMonth(viewYear, m)
  }

  const atPresentMonth = viewYear === todayYear && viewMonth === todayMonth

  function dayStr(day: number) {
    return `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function handleDayClick(day: number) {
    const d = dayStr(day)
    if (d > today) return
    if (d === today) router.push('/today')
    else router.push(`/entry/${d}`)
  }

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay()
  const totalCells = firstWeekday + daysInMonth

  return (
    <aside
      className={`
        hidden md:flex
        flex-shrink-0 flex-col border-r border-app-border bg-app-bg
        transition-[width] duration-200 ease-in-out
        ${open ? 'w-56' : 'w-9'}
        overflow-hidden
      `}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Collapse calendar' : 'Expand calendar'}
        className="flex items-center justify-center w-9 h-9 flex-shrink-0 text-app-ghost hover:text-app-secondary transition-colors text-lg"
      >
        {open ? '←' : '→'}
      </button>

      {/* Calendar body */}
      <div
        className={`flex flex-col px-3 pb-4 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="text-app-muted hover:text-app-secondary transition-colors w-5 text-center"
          >
            ‹
          </button>
          <span className="text-app-ghost text-[11px] tracking-widest uppercase select-none">
            {MONTH_NAMES[viewMonth - 1].slice(0, 3)} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={atPresentMonth}
            className="text-app-muted hover:text-app-secondary transition-colors disabled:opacity-20 disabled:cursor-not-allowed w-5 text-center"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] text-app-ghost select-none">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: totalCells }, (_, i) => {
            if (i < firstWeekday) return <div key={`e${i}`} />

            const day = i - firstWeekday + 1
            const d = dayStr(day)
            const isFuture = d > today
            const isToday = d === today
            const isViewing = d === currentDate
            const moodWord = entryMap.get(d)
            const hasEntry = entryMap.has(d)

            return (
              <button
                key={d}
                onClick={() => handleDayClick(day)}
                disabled={isFuture}
                className={`
                  relative flex flex-col items-center justify-center h-7 rounded
                  text-[11px] transition-colors
                  ${isFuture ? 'opacity-15 cursor-default' : 'cursor-pointer'}
                  ${isViewing && !isToday ? 'bg-app-overlay' : ''}
                  ${!isToday && !isFuture ? 'text-app-secondary hover:text-app-ink' : ''}
                `}
              >
                <span
                  className={`
                    w-5 h-5 flex items-center justify-center rounded-full text-[11px]
                    ${isToday ? 'bg-app-today-bg text-app-today-text font-semibold' : ''}
                  `}
                >
                  {day}
                </span>
                {hasEntry && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full ${moodDotClass(moodWord ?? null)}`}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Navigation links */}
        <div className="mt-5 -mx-3">
          <div className="border-t border-app-border" />

          <NavLink href="/today" exact={false}>
            today
          </NavLink>

          <div className="border-t border-app-border mx-3" />

          <NavLink href="/week">this week</NavLink>
          <NavLink href="/insights">insights</NavLink>
          <NavLink href="/writing">writing</NavLink>
        </div>
      </div>
    </aside>
  )
}
