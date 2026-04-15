import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'
import type { Json } from '@/types/database'

const SYSTEM_PROMPT =
  'Analyze these journal mood words and focus notes. Identify patterns in what gives this person energy vs what drains them. ' +
  'Respond only with JSON: { "gives_energy": string[], "drains_energy": string[] }. ' +
  "Max 4 items each. Be specific — use their actual words."

const CACHE_DAYS = 7

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  // Check cache
  if (!force) {
    const { data: userRow } = await supabase
      .from('users')
      .select('energy_map, energy_map_updated_at')
      .eq('id', user.id)
      .single()

    if (userRow?.energy_map && userRow.energy_map_updated_at) {
      const age = (Date.now() - new Date(userRow.energy_map_updated_at).getTime()) / 86_400_000
      if (age < CACHE_DAYS) {
        return NextResponse.json({ ok: true, cached: true, data: userRow.energy_map })
      }
    }
  }

  // Fetch mood_words and focus_notes from past 30 days
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: entries } = await supabase
    .from('daily_entries')
    .select('mood_word, focus_note')
    .eq('user_id', user.id)
    .gte('entry_date', since.toISOString().slice(0, 10))
    .gt('word_count', 0)

  if (!entries?.length) return NextResponse.json({ ok: true, skipped: 'no data' })

  const inputText = entries
    .map((e) => [e.mood_word && `Mood: ${e.mood_word}`, e.focus_note && `Focus: ${e.focus_note}`]
      .filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n')

  try {
    const raw = await generateStructured(SYSTEM_PROMPT, inputText, { jsonMode: true })
    const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const energyMap = JSON.parse(cleaned) as Json

    await supabase
      .from('users')
      .update({
        energy_map: energyMap,
        energy_map_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({ ok: true, cached: false, data: energyMap })
  } catch (err) {
    console.error('[energy-map] failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
