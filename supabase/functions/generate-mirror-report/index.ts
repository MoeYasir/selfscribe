import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Runs on the 1st of every month at 00:00 UTC — cron: "0 0 1 * *"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
  "Be specific and use the writer's own words where possible."

async function callGroq(systemPrompt: string, userContent: string, jsonMode = false): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    }),
  })
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content ?? ''
  if (!text) console.error('[mirror-report] Groq empty response:', JSON.stringify(json).slice(0, 300))
  return text
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const now = new Date()
  // Report is for the previous month (runs on 1st of new month)
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const reportMonth = prevMonth.toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  // Get all users
  const { data: users } = await supabase.from('users').select('id, voice_profile')
  if (!users?.length) return new Response('no users')

  let processed = 0

  for (const user of users) {
    // Skip if report already exists for this month
    const { data: existing } = await supabase
      .from('mirror_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_month', reportMonth)
      .maybeSingle()
    if (existing) continue

    const { data: entries } = await supabase
      .from('daily_entries')
      .select('entry_date, content, mood_word, focus_note')
      .eq('user_id', user.id)
      .gte('entry_date', reportMonth)
      .lte('entry_date', monthEnd)
      .gt('word_count', 0)
      .order('entry_date', { ascending: true })

    if (!entries || entries.length < 3) continue

    const entriesText = entries
      .map((e: { entry_date: string; content: string | null; mood_word: string | null; focus_note: string | null }) =>
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

    const voiceProfile = user.voice_profile
      ? JSON.stringify(user.voice_profile)
      : 'No voice profile yet.'

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('[voice_profile]', voiceProfile)

    try {
      const [reportText, patternsRaw] = await Promise.all([
        callGroq(systemPrompt, entriesText, false),
        callGroq(PATTERNS_PROMPT, entriesText, true),
      ])

      const patterns = JSON.parse(patternsRaw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim())

      await supabase.from('mirror_reports').upsert(
        {
          user_id: user.id,
          report_month: reportMonth,
          content: reportText,
          patterns,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,report_month' }
      )
      processed++
    } catch (err) {
      console.error(`[mirror-report] failed for user ${user.id}:`, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
