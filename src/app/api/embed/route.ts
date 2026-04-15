import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/gemini'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entryId, content, moodWord, focusNote } = await request.json()

  // Verify the entry belongs to this user
  const { data: entry } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Build combined text to embed
  const parts = [content, moodWord, focusNote].filter((s: string) => s?.trim())
  if (!parts.length) return NextResponse.json({ ok: true, skipped: 'no content' })

  const text = parts.join(' | ')
  const embedding = await generateEmbedding(text)
  const embeddingLiteral = `[${embedding.join(',')}]`

  // Upsert embedding
  const { error: upsertError } = await supabase
    .from('entry_embeddings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ entry_id: entryId, embedding: embeddingLiteral as any }, { onConflict: 'entry_id' })

  if (upsertError) {
    console.error('[embed] upsert failed:', upsertError)
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }

  // Find top-3 similar past entries via pgvector RPC
  const { data: similar } = await supabase.rpc('find_similar_entries', {
    p_entry_id: entryId,
    p_embedding: embeddingLiteral,
    p_user_id: user.id,
    p_limit: 3,
  }) as { data: Array<{ entry_id: string; similarity: number }> | null }

  // Replace existing threads for this entry
  await supabase.from('threads').delete().eq('source_entry_id', entryId)

  const meaningful = (similar ?? []).filter((s) => s.similarity > 0.6)
  if (meaningful.length > 0) {
    await supabase.from('threads').insert(
      meaningful.map((s) => ({
        source_entry_id: entryId,
        related_entry_id: s.entry_id,
        similarity_score: s.similarity,
      }))
    )
  }

  return NextResponse.json({ ok: true, threadsFound: meaningful.length })
}
