'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MobileNav } from '@/components/MobileNav'

const POST_TYPES = ['essay', 'poem', 'idea', 'draft'] as const
type PostType = typeof POST_TYPES[number]

type Post = {
  id: string
  title: string | null
  post_type: string
  content: string | null
  updated_at: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  posts: Post[]
}

export function WritingList({ posts }: Props) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Partial<Record<PostType, boolean>>>({})

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('writing-collapsed') ?? '{}')
      setCollapsed(saved)
    } catch {}
  }, [])

  function handleTypeSelect(type: PostType) {
    setPickerOpen(false)
    router.push(`/writing/new?type=${type}`)
  }

  function toggleSection(type: PostType) {
    setCollapsed((prev) => {
      const next = { ...prev, [type]: !prev[type] }
      try { localStorage.setItem('writing-collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const grouped = POST_TYPES.reduce<Record<PostType, Post[]>>((acc, type) => {
    acc[type] = posts.filter((p) => p.post_type === type)
    return acc
  }, { essay: [], poem: [], idea: [], draft: [] })

  const sectionLabels: Record<PostType, string> = {
    essay: 'essays',
    poem: 'poems',
    idea: 'ideas',
    draft: 'drafts',
  }

  const emptyLabels: Record<PostType, string> = {
    essay: 'no essays yet',
    poem: 'no poems yet',
    idea: 'no ideas yet',
    draft: 'no drafts yet',
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-ink page-fade" onClick={() => setPickerOpen(false)}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 h-11 border-b border-app-border">
        <Link href="/today" className="text-app-ghost hover:text-app-secondary text-xs transition-colors">
          ← today
        </Link>
        <span className="text-app-ghost text-xs tracking-widest uppercase select-none">writing</span>

        {/* New button + type picker */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="text-xs text-app-secondary hover:text-app-ink border border-app-border hover:border-app-muted rounded px-3 py-1.5 transition-colors"
          >
            new
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1 bg-app-surface border border-app-border-subtle rounded-lg overflow-hidden shadow-xl z-10">
              {POST_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="block w-full text-left px-4 py-2.5 text-sm text-app-secondary hover:text-app-ink hover:bg-app-overlay transition-colors capitalize"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* List */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 pb-24 md:pb-12 space-y-10">
        {POST_TYPES.map((type) => {
          const isCollapsed = collapsed[type] ?? false
          const count = grouped[type].length

          return (
            <section key={type}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(type)}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">
                  {sectionLabels[type]}
                </p>
                {count > 0 && (
                  <span className="text-[10px] text-app-ghost tabular-nums">({count})</span>
                )}
                <span
                  className={`ml-auto text-[10px] text-app-ghost transition-transform duration-200 inline-block ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                >
                  ↓
                </span>
              </button>

              {/* Collapsible content */}
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
                  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
                }`}
              >
                {grouped[type].length === 0 ? (
                  <p className="text-app-ghost text-sm pb-2">{emptyLabels[type]}</p>
                ) : (
                  <div className="space-y-1">
                    {grouped[type].map((post) => (
                      <Link
                        key={post.id}
                        href={`/writing/${post.id}`}
                        className="flex items-baseline justify-between gap-4 py-3 border-b border-app-border group hover:border-app-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-app-prose group-hover:text-app-ink transition-colors text-sm truncate">
                            {post.title || 'untitled'}
                          </p>
                          {post.content && (
                            <p className="text-app-ghost text-xs truncate">
                              {post.content.slice(0, 80)}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-app-ghost shrink-0 tabular-nums">
                          {formatDate(post.updated_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
      <MobileNav />
    </div>
  )
}
