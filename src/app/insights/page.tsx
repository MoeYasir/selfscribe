import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLocal } from '@/lib/entries'
import { InsightsPage } from '@/components/insights/InsightsPage'

export default async function Insights() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = formatDateLocal(new Date())
  const now = new Date()
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Parallel fetch all insights data
  const [
    mirrorReportRes,
    themesRes,
    weeklySummariesRes,
    openLoopsRes,
    userRowRes,
  ] = await Promise.all([
    supabase
      .from('mirror_reports')
      .select('content, patterns')
      .eq('user_id', user.id)
      .eq('report_month', reportMonth)
      .maybeSingle(),
    supabase
      .from('recurring_themes')
      .select('theme_label, occurrence_count, last_seen')
      .eq('user_id', user.id)
      .order('occurrence_count', { ascending: false })
      .limit(5),
    supabase
      .from('weekly_summaries')
      .select('week_start, emotional_arc')
      .eq('user_id', user.id)
      .gte('week_start', reportMonth)
      .order('week_start', { ascending: true }),
    supabase
      .from('daily_entries')
      .select('id, entry_date, loop_context, updated_at')
      .eq('user_id', user.id)
      .eq('is_open', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('users')
      .select('energy_map, energy_map_updated_at')
      .eq('id', user.id)
      .single(),
  ])

  const mirrorReport = mirrorReportRes.data
  const themes = themesRes.data ?? []
  const weeklySummaries = weeklySummariesRes.data ?? []
  const openLoops = openLoopsRes.data ?? []
  const energyMap = userRowRes.data?.energy_map ?? null

  return (
    <InsightsPage
      today={today}
      monthName={monthName}
      mirrorReport={mirrorReport}
      themes={themes}
      weeklySummaries={weeklySummaries}
      openLoops={openLoops}
      energyMap={energyMap}
    />
  )
}
