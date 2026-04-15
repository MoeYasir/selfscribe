import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Runs every Friday at 06:00 CAT (04:00 UTC) — cron: "0 4 * * 5"
// Generates an AI weekly summary for every user who wrote ≥ 2 entries this week.

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Return the ISO Monday (YYYY-MM-DD) for the week containing the given date. */
function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

async function callGroq(systemPrompt: string, userContent: string): Promise<string> {
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
      response_format: { type: 'json_object' },
    }),
  })
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content ?? ''
  if (!text) console.error('[weekly-summary] Groq empty response:', JSON.stringify(json).slice(0, 300))
  return text
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const now = new Date()

  // weekStart (Monday) is the storage key for the summary
  const weekStart = getWeekStart(now)

  // Query window: rolling 7 days back from today (handles CAT vs UTC drift)
  const rangeEnd = now.toISOString().slice(0, 10)
  const rangeStartDate = new Date(now)
  rangeStartDate.setUTCDate(rangeStartDate.getUTCDate() - 6)
  const rangeStart = rangeStartDate.toISOString().slice(0, 10)

  console.log(`[weekly-summary] querying entries from ${rangeStart} to ${rangeEnd}, week_start key: ${weekStart}`)

  // Get all user IDs that have entries in this range
  const { data: rows } = await supabase
    .from('daily_entries')
    .select('user_id')
    .gte('entry_date', rangeStart)
    .lte('entry_date', rangeEnd)
    .gt('word_count', 0)

  console.log(`[weekly-summary] found ${rows?.length ?? 0} entry rows`)
  if (!rows?.length) return new Response('no entries this week')

  // Unique user IDs
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  console.log(`[weekly-summary] unique users: ${userIds.length}`)

  let processed = 0

  for (const userId of userIds) {
    const { data: entries, error: entriesError } = await supabase
      .from('daily_entries')
      .select('entry_date, content, mood_word, focus_note')
      .eq('user_id', userId)
      .gte('entry_date', rangeStart)
      .lte('entry_date', rangeEnd)
      .gt('word_count', 0)
      .order('entry_date', { ascending: true })

    console.log(`[weekly-summary] user ${userId}: ${entries?.length ?? 0} entries, error: ${JSON.stringify(entriesError)}`)

    if (!entries || entries.length < 2) continue

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

    const summaryPrompt =
      'You are the inner voice of the person whose journal entries follow. ' +
      'Speak in first person. Write a weekly summary (3-4 sentences) that captures: the dominant emotional tone of the week, ' +
      'the main themes that appeared, and one honest observation about a pattern or tension you notice. ' +
      'Do not be comforting. Be precise. Use the person\'s own words where possible. ' +
      'Also return an emotional_arc as a JSON array of { date, mood } for each day that has an entry. ' +
      'Respond with JSON: { "ai_summary": string, "emotional_arc": Array<{ date: string, mood: string }> }'

    try {
      const raw = await callGroq(summaryPrompt, entriesText)
      const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
      const parsed = JSON.parse(cleaned) as {
        ai_summary: string
        emotional_arc: Array<{ date: string; mood: string }>
      }

      await supabase.from('weekly_summaries').upsert(
        {
          user_id: userId,
          week_start: weekStart,
          ai_summary: parsed.ai_summary,
          emotional_arc: parsed.emotional_arc,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,week_start' }
      )
      processed++
    } catch (err) {
      console.error(`[weekly-summary] failed for user ${userId}:`, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
