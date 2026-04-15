-- Enable the pg_cron and pg_net extensions (required for Edge Function cron scheduling)
-- Run this in the Supabase SQL editor once.

-- Schedule the weekly-summary Edge Function every Friday at 06:00 CAT (04:00 UTC).
-- Requires pg_cron and pg_net to be enabled in Supabase Dashboard → Extensions.

select
  cron.schedule(
    'generate-weekly-summary',        -- job name (unique)
    '0 4 * * 5',                      -- every Friday at 04:00 UTC (06:00 CAT)
    $$
    select
      net.http_post(
        url    := current_setting('app.supabase_url') || '/functions/v1/generate-weekly-summary',
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'Authorization',  'Bearer ' || current_setting('app.service_role_key')
        ),
        body   := '{}'::jsonb
      )
    $$
  );
