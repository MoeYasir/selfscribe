import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WritingEditor } from '@/components/writing/WritingEditor'

interface Props {
  searchParams: Promise<{ type?: string }>
}

const VALID_TYPES = ['essay', 'poem', 'idea', 'draft']

export default async function NewPostPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { type } = await searchParams
  const postType = VALID_TYPES.includes(type ?? '') ? type! : 'draft'

  return (
    <WritingEditor
      initialId={null}
      initialTitle=""
      initialContent=""
      initialType={postType}
    />
  )
}
