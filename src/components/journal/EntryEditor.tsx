'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { saveEntry } from '@/app/actions/entries'
import type { DailyEntryRow } from '@/types/database'

type SaveStatus = 'idle' | 'saving' | 'saved'
type PipelineStatus = 'idle' | 'processing' | 'done'

interface Props {
  entry: DailyEntryRow
  today: string
  onSaved?: () => void
}

export function EntryEditor({ entry, today, onSaved }: Props) {
  const [content, setContent] = useState(entry.content ?? '')
  const [moodWord, setMoodWord] = useState(entry.mood_word ?? '')
  const [focusNote, setFocusNote] = useState(entry.focus_note ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isToday = entry.entry_date === today

  useEffect(() => {
    setContent(entry.content ?? '')
    setMoodWord(entry.mood_word ?? '')
    setFocusNote(entry.focus_note ?? '')
  }, [entry.id, entry.content, entry.mood_word, entry.focus_note])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
    }
  }, [])

  // ── Silent auto-save — never triggers pipeline ───────────────────────────
  const persist = useCallback(
    async (c: string, m: string, f: string) => {
      setSaveStatus('saving')
      const wordCount = c.trim().split(/\s+/).filter(Boolean).length
      try {
        await saveEntry(entry.id, { content: c, moodWord: m, focusNote: f, wordCount })
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    },
    [entry.id]
  )

  const scheduleAutoSave = useCallback(
    (c: string, m: string, f: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => persist(c, m, f), 30_000)
    },
    [persist]
  )

  // ── Intelligence pipeline ─────────────────────────────────────────────────
  const runPipeline = useCallback(
    async (c: string, m: string, f: string) => {
      if (!c.trim()) return
      try {
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: entry.id, content: c, moodWord: m, focusNote: f }),
        })
        if (embedRes.ok) {
          onSaved?.()
          await Promise.all([
            fetch('/api/detect-loops', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entryId: entry.id, content: c }),
            }),
            fetch('/api/voice-profile', { method: 'POST' }),
            fetch('/api/detect-themes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entryId: entry.id, content: c }),
            }),
          ])
        }
      } catch {
        // silent — intelligence errors must never surface to the user
      }
    },
    [entry.id, onSaved]
  )

  // ── "Done" button — save + pipeline ──────────────────────────────────────
  async function handleDone() {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    await persist(content, moodWord, focusNote)
    setPipelineStatus('processing')
    await runPipeline(content, moodWord, focusNote)
    setPipelineStatus('done')
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
    doneTimerRef.current = setTimeout(() => setPipelineStatus('idle'), 3000)
  }

  // ── Input handlers ────────────────────────────────────────────────────────
  function handleBlur() {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    persist(content, moodWord, focusNote)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    scheduleAutoSave(val, moodWord, focusNote)
  }

  function handleMoodChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setMoodWord(val)
    scheduleAutoSave(content, val, focusNote)
  }

  function handleFocusChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setFocusNote(val)
    scheduleAutoSave(content, moodWord, val)
  }

  return (
    <div className="flex flex-col min-h-full max-w-2xl mx-auto w-full px-4 md:px-8">
      {/* Save indicator */}
      <div className="h-5 flex items-center justify-end mt-6 mb-4">
        <span
          className={`text-xs transition-opacity duration-500 ${
            saveStatus === 'saving'
              ? 'text-app-ghost opacity-100'
              : saveStatus === 'saved'
              ? 'text-app-muted opacity-100'
              : 'opacity-0'
          }`}
        >
          {saveStatus === 'saving' ? 'saving…' : 'saved'}
        </span>
      </div>

      {/* Free write zone */}
      <textarea
        value={content}
        onChange={handleContentChange}
        onBlur={handleBlur}
        placeholder="What's on your mind today…"
        className="
          flex-1 bg-transparent resize-none focus:outline-none
          text-app-ink placeholder-app-ghost
          text-[18px] leading-[1.75] min-h-[280px]
        "
      />

      {/* Mood */}
      <div className="border-t border-app-border mt-8 pt-5">
        <input
          type="text"
          value={moodWord}
          onChange={handleMoodChange}
          onBlur={handleBlur}
          placeholder="one word for today"
          maxLength={40}
          className="w-full bg-transparent focus:outline-none text-app-secondary placeholder-app-ghost text-sm"
        />
      </div>

      {/* Focus note */}
      <div className="border-t border-app-border mt-4 pt-5">
        <input
          type="text"
          value={focusNote}
          onChange={handleFocusChange}
          onBlur={handleBlur}
          placeholder="what's on your mind today?"
          className="w-full bg-transparent focus:outline-none text-app-secondary placeholder-app-ghost text-sm"
        />
      </div>

      {/* Done button — sticky at bottom of scroll area */}
      <div className="sticky bottom-0 md:bottom-0 bg-app-bg flex items-center justify-end py-5">
        {pipelineStatus === 'done' ? (
          <span className="text-xs text-app-ghost transition-opacity duration-500">
            all caught up
          </span>
        ) : (
          <button
            onClick={handleDone}
            disabled={pipelineStatus === 'processing'}
            className={`text-xs transition-colors ${
              pipelineStatus === 'processing'
                ? 'text-app-ghost cursor-default'
                : 'text-app-ghost hover:text-app-secondary'
            }`}
          >
            {pipelineStatus === 'processing'
              ? 'processing…'
              : isToday ? 'done for today' : 'save changes'}
          </button>
        )}
      </div>
    </div>
  )
}
