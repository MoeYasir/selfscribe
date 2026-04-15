'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function TopBar({ dateStr }: { dateStr: string }) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const formatted = `${WEEKDAYS[d.getDay()]}, ${MONTHS[month - 1]} ${day}`

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between px-6 md:px-8 h-11 border-b border-app-border flex-shrink-0 bg-app-bg">
      <span className="text-app-secondary text-sm select-none">{formatted}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="text-app-ghost hover:text-app-secondary text-xs transition-colors select-none"
        >
          {theme === 'dark' ? '○' : '●'}
        </button>
        <button
          onClick={handleSignOut}
          className="text-app-ghost hover:text-app-secondary text-xs transition-colors"
        >
          sign out
        </button>
      </div>
    </header>
  )
}
