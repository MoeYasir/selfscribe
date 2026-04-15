import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'

const SYSTEM_PROMPT =
  'Extract 2-3 recurring themes from this journal entry as short lowercase labels (2-3 words max each). ' +
  'Respond only with JSON: { "themes": string[] }'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ ok: true, skipped: 'no content' })

  try {
    const raw = await generateStructured(SYSTEM_PROMPT, content)
    const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const parsed = JSON.parse(cleaned) as { themes: string[] }

    if (!parsed.themes?.length) return NextResponse.json({ ok: true, skipped: 'no themes' })

    // Fetch existing themes for this user
    const { data: existing } = await supabase
      .from('recurring_themes')
      .select('id, theme_label, occurrence_count')
      .eq('user_id', user.id)

    // Build a map of normalised label → { id, count }
    const existingMap = new Map<string, { id: string; count: number }>()
    for (const t of existing ?? []) {
      existingMap.set(t.theme_label.toLowerCase().trim(), { id: t.id, count: t.occurrence_count })
    }

    const today = new Date().toISOString().slice(0, 10)

    for (const rawTheme of parsed.themes) {
      const label = rawTheme.toLowerCase().trim().slice(0, 60)
      if (!label) continue

      // Fuzzy match: exact, or one is a substring of the other
      let match: { id: string; count: number } | undefined
      for (const [existingLabel, data] of existingMap) {
        if (existingLabel === label || existingLabel.includes(label) || label.includes(existingLabel)) {
          match = data
          break
        }
      }

      if (match) {
        await supabase
          .from('recurring_themes')
          .update({ occurrence_count: match.count + 1, last_seen: today })
          .eq('id', match.id)
      } else {
        const { data: inserted } = await supabase
          .from('recurring_themes')
          .insert({ user_id: user.id, theme_label: label, occurrence_count: 1, last_seen: today })
          .select('id')
          .single()
        if (inserted) existingMap.set(label, { id: inserted.id, count: 1 })
      }
    }

    return NextResponse.json({ ok: true, themes: parsed.themes })
  } catch (err) {
    console.error('[detect-themes] failed:', err)
    return NextResponse.json({ ok: true, skipped: 'parse error' })
  }
}
