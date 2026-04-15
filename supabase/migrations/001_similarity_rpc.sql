-- ============================================================
-- Similarity search RPC for thread detection
-- Run this in the Supabase SQL editor
-- ============================================================

create or replace function find_similar_entries(
  p_entry_id uuid,
  p_embedding vector(768),
  p_user_id uuid,
  p_limit int default 3
)
returns table(entry_id uuid, similarity float)
language sql
stable
as $$
  select
    ee.entry_id,
    1 - (ee.embedding <=> p_embedding) as similarity
  from entry_embeddings ee
  join daily_entries de on de.id = ee.entry_id
  where ee.entry_id != p_entry_id
    and de.user_id = p_user_id
    and ee.embedding is not null
  order by ee.embedding <=> p_embedding
  limit p_limit;
$$;
