import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateEntry, getMonthEntryDates, getOpenLoops, formatDateLocal } from '@/lib/entries'
import { JournalPage } from '@/components/journal/JournalPage'

interface Props {
  params: Promise<{ date: string }>
}

export default async function EntryPage({ params }: Props) {
  const { date } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = formatDateLocal(new Date())
  if (date > today) redirect('/today')

  const [year, month] = date.split('-').map(Number)

  const [entry, monthEntries, openLoops] = await Promise.all([
    getOrCreateEntry(date),
    getMonthEntryDates(year, month),
    getOpenLoops(),
  ])

  return <JournalPage entry={entry} today={today} monthEntries={monthEntries} openLoops={openLoops} />
}
