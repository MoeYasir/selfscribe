'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/today')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4 page-fade">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="mb-12 text-center">
          <span className="text-app-ink text-2xl font-light tracking-[0.2em] uppercase select-none">
            SelfScribe
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-8 border border-app-border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
            className={`flex-1 py-2.5 text-sm transition-colors ${
              mode === 'signin'
                ? 'bg-app-overlay text-app-ink'
                : 'text-app-secondary hover:text-app-ink'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setMessage(null) }}
            className={`flex-1 py-2.5 text-sm transition-colors ${
              mode === 'signup'
                ? 'bg-app-overlay text-app-ink'
                : 'text-app-secondary hover:text-app-ink'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-app-overlay border border-app-border rounded-md px-4 py-3 text-app-ink placeholder-app-muted text-sm focus:outline-none focus:border-app-muted transition-colors"
            />
          </div>
          <div>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-app-overlay border border-app-border rounded-md px-4 py-3 text-app-ink placeholder-app-muted text-sm focus:outline-none focus:border-app-muted transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400/80 text-sm">{error}</p>
          )}
          {message && (
            <p className="text-emerald-400/80 text-sm">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-md bg-app-today-bg text-app-today-text text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
              : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
