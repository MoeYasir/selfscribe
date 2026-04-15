import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'

const SYSTEM_PROMPT =
  'You are analyzing a written draft. Respond only with JSON containing two fields:\n\n' +
  'mirror: Write 2-3 paragraphs in first person, as if you are the writer\'s inner voice. ' +
  'Reflect back what they actually wrote — the real argument, the real feeling, the real confusion — not what they intended to write. ' +
  'Quote their exact words where they reveal something. Do not be kind. Do not be cruel. Be precise. ' +
  'This should feel like looking in a mirror and seeing clearly for the first time.\n\n' +
  'compass: Write 3-5 concrete, specific next steps for this piece. Not vague advice like \'develop your argument\' — ' +
  'actual instructions like \'the third paragraph contradicts the opening claim — cut one or rewrite the other\' or ' +
  '\'you have not answered why this matters — that answer belongs at the end of section two\'. ' +
  'Each next step should be something the writer can act on today. Write as a direct, numbered list.'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, title } = await request.json()

  const userContent = [title && `Title: ${title}`, `\n${content}`].filter(Boolean).join('\n')

  try {
    const raw = await generateStructured(SYSTEM_PROMPT, userContent, { jsonMode: true })
    const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim()
    const parsed = JSON.parse(cleaned) as { mirror: unknown; compass: unknown }
    return NextResponse.json({
      mirror: Array.isArray(parsed.mirror) ? parsed.mirror.join('\n\n') : String(parsed.mirror ?? ''),
      compass: Array.isArray(parsed.compass) ? parsed.compass.join('\n') : String(parsed.compass ?? ''),
    })
  } catch (err) {
    console.error('[writing/draft-mirror] failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
