-- After migration/functions/secrets are configured. Execute in Supabase SQL Editor.
-- First enable pg_cron and pg_net in Dashboard > Database > Extensions.
-- In Dashboard > Integrations > Vault, create two secrets:
-- orbytek_contact_worker_url: https://PROJECT.supabase.co/functions/v1/orbytek-contact-worker
-- orbytek_contact_worker_token: same value as CONTACT_WORKER_TOKEN (random >=32 bytes).
-- No actual secret belongs in this repository.
do $$ declare job bigint; begin
 for job in select jobid from cron.job where jobname in ('orbytek-contact-retry','orbytek-contact-limits-cleanup') loop
  perform cron.unschedule(job);
 end loop;
end $$;
select cron.schedule('orbytek-contact-retry','*/5 * * * *', $$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='orbytek_contact_worker_url'),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='orbytek_contact_worker_token')),
  body:='{}'::jsonb,timeout_milliseconds:=150000
 );
$$);
select cron.schedule('orbytek-contact-limits-cleanup','17 3 * * *', $$
 delete from public.orbytek_contact_limits where expires_at<now();
$$);
