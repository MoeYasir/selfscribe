import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WritingEditor } from '@/components/writing/WritingEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: post } = await supabase
    .from('blog_posts')
    .select('id, title, content, post_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!post) notFound()

  return (
    <WritingEditor
      initialId={post.id}
      initialTitle={post.title ?? ''}
      initialContent={post.content ?? ''}
      initialType={post.post_type}
    />
  )
}
