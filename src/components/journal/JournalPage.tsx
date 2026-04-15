'use client'

import { useState } from 'react'
import { TopBar } from './TopBar'
import { CalendarSidebar } from './CalendarSidebar'
import { EntryEditor } from './EntryEditor'
import { EchoSidebar } from './EchoSidebar'
import { OpenLoops } from './OpenLoops'
import { MobileNav } from '@/components/MobileNav'
import type { DailyEntryRow } from '@/types/database'
import type { MonthEntry, OpenLoopEntry } from '@/types/app'

interface Props {
  entry: DailyEntryRow
  today: string
  monthEntries: MonthEntry[]
  openLoops?: OpenLoopEntry[]
}

export function JournalPage({ entry, today, monthEntries, openLoops = [] }: Props) {
  const [echoRefresh, setEchoRefresh] = useState(0)

  return (
    <div className="flex flex-col h-screen bg-app-bg overflow-hidden page-fade">
      <TopBar dateStr={entry.entry_date} />

      <div className="flex flex-1 overflow-hidden">
        <CalendarSidebar
          today={today}
          currentDate={entry.entry_date}
          initialMonthEntries={monthEntries}
        />

        <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
          <EntryEditor
            entry={entry}
            today={today}
            onSaved={() => setEchoRefresh((n) => n + 1)}
          />
          <OpenLoops loops={openLoops} />
        </main>

        <EchoSidebar
          entryId={entry.id}
          refreshTrigger={echoRefresh}
        />
      </div>
      <MobileNav />
    </div>
  )
}
