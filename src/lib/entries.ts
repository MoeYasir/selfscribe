import { createClient } from '@/lib/supabase/server'
import type { DailyEntryRow } from '@/types/database'
import type { MonthEntry, WeekDayEntry, OpenLoopEntry } from '@/types/app'

/** Format a Date as YYYY-MM-DD in local time (avoids UTC date-shift). */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return the Monday (ISO week start) for a given YYYY-MM-DD date string. */
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatDateLocal(d)
}

/** Get or create a daily entry for the given date (YYYY-MM-DD). */
export async function getOrCreateEntry(date: string): Promise<DailyEntryRow> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('entry_date', date)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('daily_entries')
    .insert({ user_id: user.id, entry_date: date })
    .select()
    .single()

  if (error) throw error
  return created
}

/** Return entries within a month that have written content, including mood_word for calendar dots. */
export async function getMonthEntryDates(year: number, month: number): Promise<MonthEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const lastDay = new Date(year, month, 0).getDate()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data } = await supabase
    .from('daily_entries')
    .select('entry_date, mood_word')
    .eq('user_id', user.id)
    .gte('entry_date', start)
    .lte('entry_date', end)
    .gt('word_count', 0)

  return data?.map((e) => ({ entry_date: e.entry_date, mood_word: e.mood_word })) ?? []
}

/** Return the 7 daily entries for a given week (Mon–Sun). */
export async function getWeekEntries(weekStart: string): Promise<WeekDayEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = formatDateLocal(end)

  const { data } = await supabase
    .from('daily_entries')
    .select('entry_date, content, mood_word, word_count')
    .eq('user_id', user.id)
    .gte('entry_date', weekStart)
    .lte('entry_date', weekEnd)
    .order('entry_date', { ascending: true })

  return data?.map((e) => ({
    entry_date: e.entry_date,
    content: e.content,
    mood_word: e.mood_word,
    word_count: e.word_count,
  })) ?? []
}

/** Return up to 3 open-loop entries older than 14 days. */
export async function getOpenLoops(): Promise<OpenLoopEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const cutoffStr = cutoff.toISOString()

  const { data } = await supabase
    .from('daily_entries')
    .select('id, entry_date, loop_context')
    .eq('user_id', user.id)
    .eq('is_open', true)
    .lt('updated_at', cutoffStr)
    .order('updated_at', { ascending: false })
    .limit(3)

  return data?.map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    loop_context: e.loop_context,
  })) ?? []
}
