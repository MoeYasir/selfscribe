'use server'

import { createClient } from '@/lib/supabase/server'
import type { MonthEntry, OpenLoopEntry } from '@/types/app'

export async function saveEntry(
  entryId: string,
  data: {
    content: string
    moodWord: string
    focusNote: string
    wordCount: number
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('daily_entries')
    .update({
      content: data.content || null,
      mood_word: data.moodWord || null,
      focus_note: data.focusNote || null,
      word_count: data.wordCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  if (error) throw error
}

export async function fetchMonthEntryDates(
  year: number,
  month: number
): Promise<MonthEntry[]> {
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

export async function fetchOpenLoops(): Promise<OpenLoopEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const { data } = await supabase
    .from('daily_entries')
    .select('id, entry_date, loop_context')
    .eq('user_id', user.id)
    .eq('is_open', true)
    .lt('updated_at', cutoff.toISOString())
    .order('updated_at', { ascending: false })
    .limit(3)

  return data?.map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    loop_context: e.loop_context,
  })) ?? []
}

export async function saveWeeklyReflection(
  weekStart: string,
  reflection: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('weekly_summaries')
    .upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        user_reflection: reflection,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    )

  if (error) throw error
}

export type ThreadEcho = {
  related_entry_id: string
  similarity_score: number
  entry_date: string
  content: string | null
}

export async function fetchThreadsForEntry(entryId: string): Promise<ThreadEcho[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Query both directions — threads are written when either entry is saved,
  // so we need to check source AND related to get the full picture.
  const [{ data: asSource }, { data: asRelated }] = await Promise.all([
    supabase
      .from('threads')
      .select('related_entry_id, similarity_score')
      .eq('source_entry_id', entryId)
      .order('similarity_score', { ascending: false })
      .limit(3),
    supabase
      .from('threads')
      .select('source_entry_id, similarity_score')
      .eq('related_entry_id', entryId)
      .order('similarity_score', { ascending: false })
      .limit(3),
  ])

  // Normalise both result sets to { connectedId, similarity_score }
  const combined = [
    ...(asSource ?? []).map((t) => ({ connectedId: t.related_entry_id, similarity_score: t.similarity_score })),
    ...(asRelated ?? []).map((t) => ({ connectedId: t.source_entry_id, similarity_score: t.similarity_score })),
  ]

  if (!combined.length) return []

  // Deduplicate by entry id, keeping the highest score, then take top 3
  const byId = new Map<string, number>()
  for (const { connectedId, similarity_score } of combined) {
    const existing = byId.get(connectedId) ?? 0
    if (similarity_score > existing) byId.set(connectedId, similarity_score)
  }
  const top3 = [...byId.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const { data: entries } = await supabase
    .from('daily_entries')
    .select('id, entry_date, content')
    .in('id', top3.map(([id]) => id))
    .eq('user_id', user.id)

  if (!entries?.length) return []

  return top3.flatMap(([connectedId, similarity_score]) => {
    const e = entries.find((e) => e.id === connectedId)
    if (!e) return []
    return [{
      related_entry_id: connectedId,
      similarity_score,
      entry_date: e.entry_date,
      content: e.content,
    }]
  })
}
