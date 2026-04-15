-- ============================================================
-- SelfScribe — full schema migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable pgvector
create extension if not exists vector;

-- Users profile table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  voice_profile jsonb,
  entry_count int default 0,
  created_at timestamp with time zone default now()
);

-- Daily entries (the atomic unit)
create table public.daily_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  entry_date date not null,
  content text,
  mood_word text,
  focus_note text,
  word_count int default 0,
  is_open boolean default false,
  loop_context text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id, entry_date)
);

-- Embeddings for semantic search
create table public.entry_embeddings (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references public.daily_entries(id) on delete cascade not null unique,
  embedding vector(768),
  created_at timestamp with time zone default now()
);

-- Thread connections between entries
create table public.threads (
  id uuid default gen_random_uuid() primary key,
  source_entry_id uuid references public.daily_entries(id) on delete cascade not null,
  related_entry_id uuid references public.daily_entries(id) on delete cascade not null,
  similarity_score float not null,
  created_at timestamp with time zone default now(),
  unique(source_entry_id, related_entry_id)
);

-- Weekly summaries (auto-generated + user reflection)
create table public.weekly_summaries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  week_start date not null,
  ai_summary text,
  user_reflection text,
  emotional_arc jsonb,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id, week_start)
);

-- Monthly mirror reports
create table public.mirror_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  report_month date not null,
  content text,
  patterns jsonb,
  created_at timestamp with time zone default now(),
  unique(user_id, report_month)
);

-- Recurring themes
create table public.recurring_themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  theme_label text not null,
  occurrence_count int default 1,
  last_seen date,
  created_at timestamp with time zone default now()
);

-- Blog posts
create table public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text,
  content text,
  post_type text default 'idea',
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Indexes
create index on public.daily_entries(user_id, entry_date desc);
create index on public.entry_embeddings using ivfflat (embedding vector_cosine_ops);
create index on public.threads(source_entry_id);
create index on public.recurring_themes(user_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.daily_entries enable row level security;
alter table public.entry_embeddings enable row level security;
alter table public.threads enable row level security;
alter table public.weekly_summaries enable row level security;
alter table public.mirror_reports enable row level security;
alter table public.recurring_themes enable row level security;
alter table public.blog_posts enable row level security;

-- RLS Policies (users can only access their own data)
create policy "users: own data" on public.users for all using (auth.uid() = id);
create policy "entries: own data" on public.daily_entries for all using (auth.uid() = user_id);
create policy "embeddings: own data" on public.entry_embeddings for all using (
  auth.uid() = (select user_id from public.daily_entries where id = entry_id)
);
create policy "threads: own data" on public.threads for all using (
  auth.uid() = (select user_id from public.daily_entries where id = source_entry_id)
);
create policy "weekly: own data" on public.weekly_summaries for all using (auth.uid() = user_id);
create policy "mirror: own data" on public.mirror_reports for all using (auth.uid() = user_id);
create policy "themes: own data" on public.recurring_themes for all using (auth.uid() = user_id);
create policy "blog: own data" on public.blog_posts for all using (auth.uid() = user_id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
