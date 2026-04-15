import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'
import type { Json } from '@/types/database'

const SYSTEM_PROMPT =
  "You are analyzing someone's private journal entries to understand how they write and think. " +
  'Extract a voice profile as JSON with these fields: ' +
  '{ "vocabulary_style": string, "emotional_expression": string, "sentence_rhythm": string, ' +
  '"recurring_words": string[], "thinking_style": string }. ' +
  "Be specific and observational. This profile will be used to make AI insights feel like the person's own inner voice."

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count } = await supabase
    .from('daily_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gt('word_count', 0)

  if (!count || count < 5) {
    return NextResponse.json({ ok: true, skipped: 'fewer than 5 entries' })
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('voice_profile')
    .eq('id', user.id)
    .single()

  if (userRow?.voice_profile) {
    const vp = userRow.voice_profile as { generated_at?: string }
    if (vp.generated_at) {
      const daysSince = (Date.now() - new Date(vp.generated_at).getTime()) / 86_400_000
      if (daysSince < 30) {
        return NextResponse.json({ ok: true, skipped: 'profile up to date' })
      }
    }
  }

  const { data: entries } = await supabase
    .from('daily_entries')
    .select('entry_date, content, mood_word, focus_note')
    .eq('user_id', user.id)
    .gt('word_count', 0)
    .order('entry_date', { ascending: false })
    .limit(30)

  if (!entries?.length) return NextResponse.json({ ok: true, skipped: 'no content' })

  const entriesText = entries
    .map((e) =>
      [
        `Date: ${e.entry_date}`,
        e.content && `Entry: ${e.content}`,
        e.mood_word && `Mood: ${e.mood_word}`,
        e.focus_note && `Focus: ${e.focus_note}`,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n---\n\n')

  try {
    const raw = await generateStructured(SYSTEM_PROMPT, entriesText)
    const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const profile = JSON.parse(cleaned)

    await supabase
      .from('users')
      .update({ voice_profile: { ...profile, generated_at: new Date().toISOString() } as Json })
      .eq('id', user.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, skipped: 'generation error' })
  }
}
