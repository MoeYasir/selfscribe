export type MonthEntry = {
  entry_date: string
  mood_word: string | null
}

export type OpenLoopEntry = {
  id: string
  entry_date: string
  loop_context: string | null
}

export type WeekDayEntry = {
  entry_date: string
  content: string | null
  mood_word: string | null
  word_count: number
}

export type WeeklySummaryData = {
  id: string
  week_start: string
  ai_summary: string | null
  user_reflection: string | null
  emotional_arc: unknown
}
