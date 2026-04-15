import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateEntry, getMonthEntryDates, getOpenLoops, formatDateLocal } from '@/lib/entries'
import { JournalPage } from '@/components/journal/JournalPage'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = formatDateLocal(new Date())
  const [year, month] = today.split('-').map(Number)

  const [entry, monthEntries, openLoops] = await Promise.all([
    getOrCreateEntry(today),
    getMonthEntryDates(year, month),
    getOpenLoops(),
  ])

  return <JournalPage entry={entry} today={today} monthEntries={monthEntries} openLoops={openLoops} />
}
