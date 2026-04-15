import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'
import type { Json } from '@/types/database'

const SYSTEM_PROMPT_TEMPLATE = `You are the inner voice of the person whose journal entries follow.
You have access to their voice profile which describes how they think and write. Speak in first person, using their vocabulary and rhythm.
You are not a therapist. You are not comforting. You are a mirror.

Write a monthly reflection (4-6 paragraphs) that:
1. Names the dominant emotional theme of the month honestly
2. Identifies one specific pattern of behavior or thought that repeated itself — quote their exact words to show them
3. Surfaces one contradiction between what they say they value and how they actually spent their energy this month
4. Ends with one precise, uncomfortable observation — the kind of thing they already know but haven't said out loud yet

Voice profile: [voice_profile]

Do not use bullet points. Write in flowing paragraphs. Do not be vague.
Do not comfort. Be the voice they'd hear if they were completely honest with themselves.`

const PATTERNS_PROMPT =
  'Based on these journal entries, extract the following as JSON: ' +
  '{ "dominant_emotion": string, "main_themes": string[], "contradiction": string, ' +
  '"peak_week": string, "quietest_week": string }. ' +
  'Be specific and use the writer\'s own words where possible.'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  // Current month boundaries
  const now = new Date()
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = new Date(nextMonth.getTime() - 1).toISOString().slice(0, 10)

  // Skip if report already exists for this month and not forcing
  if (!force) {
    const { data: existing } = await supabase
      .from('mirror_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_month', reportMonth)
      .maybeSingle()
    if (existing) return NextResponse.json({ ok: true, skipped: 'already exists' })
  }

  // Fetch all entries for current month
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('entry_date, content, mood_word, focus_note')
    .eq('user_id', user.id)
    .gte('entry_date', reportMonth)
    .lte('entry_date', monthEnd)
    .gt('word_count', 0)
    .order('entry_date', { ascending: true })

  if (!entries?.length) return NextResponse.json({ ok: true, skipped: 'no entries this month' })

  // Fetch voice profile
  const { data: userRow } = await supabase
    .from('users')
    .select('voice_profile')
    .eq('id', user.id)
    .single()

  const voiceProfile = userRow?.voice_profile
    ? JSON.stringify(userRow.voice_profile)
    : 'No voice profile yet.'

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
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('[voice_profile]', voiceProfile)

    // Two parallel Groq calls: narrative text + structured patterns
    const [reportText, patternsRaw] = await Promise.all([
      generateStructured(systemPrompt, entriesText, { jsonMode: false }),
      generateStructured(PATTERNS_PROMPT, entriesText, { jsonMode: true }),
    ])

    const cleaned = patternsRaw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const patterns = JSON.parse(cleaned) as Json

    await supabase
      .from('mirror_reports')
      .upsert(
        {
          user_id: user.id,
          report_month: reportMonth,
          content: reportText,
          patterns,
        },
        { onConflict: 'user_id,report_month' }
      )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mirror-report] failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
