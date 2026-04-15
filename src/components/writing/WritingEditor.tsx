'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPost, savePost } from '@/app/actions/writing'

const POST_TYPES = ['essay', 'poem', 'idea', 'draft'] as const
type PostType = typeof POST_TYPES[number]
type SaveStatus = 'idle' | 'saving' | 'saved'
type FeedbackState =
  | { mode: 'simple'; text: string }
  | { mode: 'draft'; mirror: string; compass: string }
  | null

const MIN_WORDS = 50

interface Props {
  initialId: string | null
  initialTitle: string
  initialContent: string
  initialType: string
}

export function WritingEditor({ initialId, initialTitle, initialContent, initialType }: Props) {
  const router = useRouter()

  const [postId, setPostId] = useState<string | null>(initialId)
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [type, setType] = useState<PostType>(initialType as PostType)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [typePicker, setTypePicker] = useState(false)
  const [hasStarted, setHasStarted] = useState(initialId !== null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [activeTab, setActiveTab] = useState<'mirror' | 'compass'>('mirror')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef<string | null>(initialId)

  useEffect(() => { idRef.current = postId }, [postId])
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // ── Auto-save ────────────────────────────────────────────────────────────
  const persist = useCallback(async (t: string, c: string, pt: PostType) => {
    setSaveStatus('saving')
    try {
      let id = idRef.current
      if (!id) {
        id = await createPost(pt)
        setPostId(id)
        idRef.current = id
        window.history.replaceState(null, '', `/writing/${id}`)
      }
      await savePost(id, { title: t, content: c, postType: pt })
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('idle')
    }
  }, [])

  const schedule = useCallback((t: string, c: string, pt: PostType) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(t, c, pt), 30_000)
  }, [persist])

  function handleBlur() {
    if (!hasStarted) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    persist(title, content, type)
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setTitle(val)
    if (!hasStarted) setHasStarted(true)
    schedule(val, content, type)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    if (!hasStarted) setHasStarted(true)
    schedule(title, val, type)
  }

  function handleTypeChange(newType: PostType) {
    setType(newType)
    setTypePicker(false)
    if (hasStarted) persist(title, content, newType)
  }

  // ── Feedback ─────────────────────────────────────────────────────────────
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const tooShort = wordCount < MIN_WORDS

  async function handleGetFeedback() {
    if (tooShort) { setPanelOpen(true); setFeedback(null); return }
    setPanelOpen(true)
    setFeedbackLoading(true)
    setFeedbackError(false)
    setFeedback(null)
    try {
      const res = await fetch('/api/writing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, postType: type }),
      })
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setFeedback({ mode: 'simple', text: json.feedback })
    } catch {
      setFeedbackError(true)
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleDraftMirror() {
    if (tooShort) { setPanelOpen(true); setFeedback(null); return }
    setPanelOpen(true)
    setFeedbackLoading(true)
    setFeedbackError(false)
    setFeedback(null)
    try {
      const res = await fetch('/api/writing/draft-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setFeedback({ mode: 'draft', mirror: json.mirror, compass: json.compass })
      setActiveTab('mirror')
    } catch {
      setFeedbackError(true)
    } finally {
      setFeedbackLoading(false)
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  const isPoem = type === 'poem'
  const contentStyle: React.CSSProperties = isPoem
    ? { fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: '2.2' }
    : { fontSize: '18px', lineHeight: '1.9' }

  const isDraft = type === 'draft'
  const hasFeedback = type === 'essay' || type === 'poem' || type === 'idea' || type === 'draft'

  return (
    <div
      className="h-screen bg-app-bg flex flex-col overflow-hidden page-fade"
      onClick={() => setTypePicker(false)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 md:px-8 h-11 flex-shrink-0 border-b border-app-border">
        <button
          onClick={() => router.push('/writing')}
          className="text-app-ghost hover:text-app-secondary text-sm transition-colors"
        >
          ←
        </button>
        <span className={`text-xs transition-opacity duration-500 ${
          saveStatus === 'saving' ? 'text-app-ghost opacity-100'
          : saveStatus === 'saved' ? 'text-app-muted opacity-100'
          : 'opacity-0'
        }`}>
          {saveStatus === 'saving' ? 'saving…' : 'saved'}
        </span>
      </div>

      {/* Main area — editor + optional panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] w-full mx-auto px-4 md:px-8 pb-24">

            {/* Type pill */}
            <div className="relative mt-8" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setTypePicker((v) => !v)}
                className="text-[11px] text-app-ghost hover:text-app-secondary tracking-widest uppercase transition-colors px-2 py-1 rounded border border-transparent hover:border-app-border-subtle"
              >
                {type}
              </button>
              {typePicker && (
                <div className="absolute left-0 top-full mt-1 bg-app-surface border border-app-border-subtle rounded-lg overflow-hidden shadow-xl z-10">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className={`block w-full text-left px-4 py-2 text-xs capitalize transition-colors
                        ${t === type ? 'text-app-secondary' : 'text-app-ghost hover:text-app-secondary hover:bg-app-overlay'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separator + Title */}
            <div className="border-t border-app-border mt-4 pt-6">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleBlur}
                placeholder="untitled"
                className="w-full bg-transparent focus:outline-none text-app-ink placeholder-app-ghost text-[28px] font-light"
              />
            </div>

            {/* Separator + Content */}
            <div className="border-t border-app-border mt-6 pt-6">
              <textarea
                value={content}
                onChange={handleContentChange}
                onBlur={handleBlur}
                placeholder="…"
                className="w-full bg-transparent resize-none focus:outline-none text-app-prose placeholder-app-ghost min-h-[60vh]"
                style={contentStyle}
              />
            </div>

            {/* Feedback buttons */}
            {hasFeedback && (
              <div className="mt-16 pb-4">
                {isDraft ? (
                  <div className="flex gap-4">
                    <button
                      onClick={handleDraftMirror}
                      className="text-[11px] text-app-ghost hover:text-app-secondary tracking-widest uppercase transition-colors"
                    >
                      mirror
                    </button>
                    <button
                      onClick={() => { handleDraftMirror().then(() => setActiveTab('compass')) }}
                      className="text-[11px] text-app-ghost hover:text-app-secondary tracking-widest uppercase transition-colors"
                    >
                      next steps
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGetFeedback}
                    className="text-[11px] text-app-ghost hover:text-app-secondary tracking-widest uppercase transition-colors"
                  >
                    get feedback
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feedback panel */}
        <div className={`flex-shrink-0 border-l border-app-border overflow-hidden transition-[width] duration-300 ${panelOpen ? 'w-[400px]' : 'w-0'}`}>
          <div className="w-[400px] h-full overflow-y-auto px-7 py-8 flex flex-col bg-app-bg">

            {/* Panel header */}
            <div className="flex items-center justify-between mb-6">
              {feedback?.mode === 'draft' ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('mirror')}
                    className={`text-[11px] tracking-widest uppercase transition-colors ${activeTab === 'mirror' ? 'text-app-secondary' : 'text-app-ghost hover:text-app-muted'}`}
                  >
                    mirror
                  </button>
                  <button
                    onClick={() => setActiveTab('compass')}
                    className={`text-[11px] tracking-widest uppercase transition-colors ${activeTab === 'compass' ? 'text-app-secondary' : 'text-app-ghost hover:text-app-muted'}`}
                  >
                    next steps
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-app-ghost tracking-widest uppercase select-none">
                  a reader&apos;s notes
                </p>
              )}
              <button
                onClick={() => setPanelOpen(false)}
                className="text-app-ghost hover:text-app-secondary text-lg transition-colors leading-none"
              >
                ×
              </button>
            </div>

            {/* Panel content */}
            {feedbackLoading && (
              <div className="flex-1 flex items-start pt-4">
                <div className="w-2 h-2 rounded-full bg-app-muted animate-pulse" />
              </div>
            )}

            {!feedbackLoading && feedbackError && (
              <p className="text-app-muted text-sm">
                couldn&apos;t generate feedback right now — try again
              </p>
            )}

            {!feedbackLoading && !feedbackError && tooShort && !feedback && (
              <p className="text-app-muted text-sm">
                write a bit more first — feedback works better with more to read
              </p>
            )}

            {!feedbackLoading && !feedbackError && feedback?.mode === 'simple' && (
              <div
                className="text-app-prose leading-[1.8] space-y-4"
                style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}
              >
                {feedback.text.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {!feedbackLoading && !feedbackError && feedback?.mode === 'draft' && (
              <>
                {activeTab === 'mirror' && (
                  <div
                    className="text-app-prose leading-[1.8] space-y-4"
                    style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}
                  >
                    {feedback.mirror.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                {activeTab === 'compass' && (
                  <div className="text-app-prose text-sm leading-relaxed space-y-4">
                    {String(feedback.compass).split('\n').filter((l) => l.trim()).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Word count — sticky */}
      <div className="fixed bottom-6 right-8 text-[11px] text-app-ghost tabular-nums select-none pointer-events-none">
        {wordCount > 0 ? `${wordCount} words` : ''}
      </div>
    </div>
  )
}
