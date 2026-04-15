import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'

const SYSTEM_PROMPT =
  'You are analyzing a journal entry. Determine if it contains an unresolved intention, ' +
  "open question, or plan the writer hasn't acted on yet. Respond only with JSON: " +
  '{ "is_open": boolean, "loop_context": string | null }. ' +
  'loop_context should be a short phrase (max 10 words) describing the open loop if one exists, null otherwise.'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entryId, content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ ok: true, skipped: 'no content' })

  const { data: entry } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const raw = await generateStructured(SYSTEM_PROMPT, content)
    console.log('[detect-loops] raw:', raw)
    const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const parsed = JSON.parse(cleaned) as { is_open: boolean; loop_context: string | null }

    await supabase
      .from('daily_entries')
      .update({ is_open: parsed.is_open, loop_context: parsed.loop_context ?? null })
      .eq('id', entryId)

    return NextResponse.json({ ok: true, ...parsed })
  } catch {
    return NextResponse.json({ ok: true, skipped: 'parse error' })
  }
}
