'use server'

import { createClient } from '@/lib/supabase/server'

export async function createPost(postType: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({ user_id: user.id, post_type: postType })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function savePost(
  id: string,
  data: { title: string; content: string; postType: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: data.title || null,
      content: data.content || null,
      post_type: data.postType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}
