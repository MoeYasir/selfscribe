import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWeekEntries, getWeekStart, formatDateLocal } from '@/lib/entries'
import { WeekView } from '@/components/week/WeekView'
import type { WeeklySummaryData } from '@/types/app'

interface Props {
  searchParams: Promise<{ w?: string }>
}

export default async function WeekPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = formatDateLocal(new Date())
  const { w } = await searchParams

  // Validate and clamp the week param
  const thisWeekStart = getWeekStart(today)
  let weekStart = thisWeekStart
  if (w && /^\d{4}-\d{2}-\d{2}$/.test(w)) {
    weekStart = w <= thisWeekStart ? w : thisWeekStart
    // Make sure it's actually a Monday
    weekStart = getWeekStart(weekStart)
  }

  const [entries, summaryRow] = await Promise.all([
    getWeekEntries(weekStart),
    supabase
      .from('weekly_summaries')
      .select('id, week_start, ai_summary, user_reflection, emotional_arc')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
  ])

  const summary: WeeklySummaryData | null = summaryRow.data
    ? {
        id: summaryRow.data.id,
        week_start: summaryRow.data.week_start,
        ai_summary: summaryRow.data.ai_summary,
        user_reflection: summaryRow.data.user_reflection,
        emotional_arc: summaryRow.data.emotional_arc,
      }
    : null

  return (
    <WeekView
      weekStart={weekStart}
      today={today}
      entries={entries}
      summary={summary}
    />
  )
}
