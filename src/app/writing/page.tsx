import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WritingList } from '@/components/writing/WritingList'

export default async function WritingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, post_type, content, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return <WritingList posts={posts ?? []} />
}
