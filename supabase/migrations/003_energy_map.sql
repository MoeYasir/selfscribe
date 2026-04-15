-- Add energy_map cache columns to users table
alter table public.users
  add column if not exists energy_map jsonb,
  add column if not exists energy_map_updated_at timestamp with time zone;
