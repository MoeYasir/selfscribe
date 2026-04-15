import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStructured } from '@/lib/gemini'

const PROMPTS: Record<string, string> = {
  essay:
    'You are a sharp, honest reader responding to an essay draft. You are not an editor — you are a reader who thinks carefully. Respond in 3-4 short paragraphs:\n' +
    '1. What the essay is actually arguing (which may differ from what the writer thinks they\'re arguing)\n' +
    '2. The strongest moment — quote the specific line or passage and say why it works\n' +
    '3. Where the argument loses you or weakens — be specific, no hedging\n' +
    '4. One concrete thing that would make this piece land harder\n\n' +
    'Speak directly to the writer in second person. Do not use bullet points. Do not praise generally. Be the reader the writer needs, not the one they want.',

  poem:
    'You are a careful reader of poetry responding to a draft. Respond in 3 short paragraphs:\n' +
    "1. What the poem is doing — its emotional logic, not its 'meaning'\n" +
    '2. The image or line that earns its place most — quote it and say why it works\n' +
    "3. What's working against the poem — a word that's too easy, a line that explains too much, a rhythm that breaks without purpose\n\n" +
    'Do not suggest rewrites. Do not fix. Observe. Speak directly to the writer. No bullet points.',

  idea:
    'You are a thinking partner responding to an idea someone has written down. Respond in 3 paragraphs:\n' +
    '1. Restate the core of the idea in one sentence — sharper and more specific than how they wrote it\n' +
    '2. The most interesting thread in this idea — the part worth pulling on further\n' +
    "3. The three questions this idea hasn't answered yet — the ones that would determine if it's actually good\n\n" +
    'Be direct. No encouragement. No bullet points. Treat this like a conversation between equals.',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, title, postType } = await request.json()

  const prompt = PROMPTS[postType]
  if (!prompt) return NextResponse.json({ error: 'Invalid post type' }, { status: 400 })

  const userContent = [title && `Title: ${title}`, `\n${content}`].filter(Boolean).join('\n')

  try {
    const feedback = await generateStructured(prompt, userContent, { jsonMode: false })
    return NextResponse.json({ feedback })
  } catch (err) {
    console.error('[writing/feedback] failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
