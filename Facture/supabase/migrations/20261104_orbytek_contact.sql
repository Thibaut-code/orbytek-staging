-- Contact Orbytek only. No changes to invoice tables or existing policies.
begin;
create table public.orbytek_contact_requests (
 id uuid primary key,
 payload_hash text not null,
 name text not null, email text not null, phone text not null default '',
 company text not null default '', project text not null, message text not null,
 origin text not null, created_at timestamptz not null default now(),
 read_status text not null default 'new' check(read_status in ('new','resolved')),
 notification_status text not null default 'pending' check(notification_status in ('pending','processing','sent','failed')),
 delivery_status text not null default 'unknown' check(delivery_status in ('unknown','delivered','bounced','failed','delayed')),
 email_id text unique, attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), lease_until timestamptz,
 lease_token uuid, last_error text, sent_at timestamptz
);
create index orbytek_contact_due on public.orbytek_contact_requests(next_attempt_at) where notification_status in ('pending','processing');
create table public.orbytek_contact_limits (bucket text primary key, hits integer not null, expires_at timestamptz not null);
create table public.orbytek_contact_events (
 event_id text primary key, email_id text not null, status text not null,
 occurred_at timestamptz not null, received_at timestamptz not null default now()
);
create index orbytek_contact_event_email on public.orbytek_contact_events(email_id,occurred_at desc);
alter table public.orbytek_contact_requests enable row level security;
alter table public.orbytek_contact_limits enable row level security;
alter table public.orbytek_contact_events enable row level security;
revoke all on public.orbytek_contact_requests,public.orbytek_contact_limits,public.orbytek_contact_events from public,anon,authenticated;
grant all on public.orbytek_contact_requests,public.orbytek_contact_limits,public.orbytek_contact_events to service_role;

create function public.orbytek_contact_enqueue(p_id uuid,p_hash text,p_data jsonb,p_buckets text[])
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare existing text; b text; n integer;
begin
 -- Serialize repeated submissions of the same receipt, including parallel calls.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select payload_hash into existing from orbytek_contact_requests where id=p_id;
 if found then
  if existing<>p_hash then return 'conflict'; end if;
  return 'accepted';
 end if;
 foreach b in array p_buckets loop
  insert into orbytek_contact_limits(bucket,hits,expires_at) values(b,1,now()+interval '2 hours')
   on conflict(bucket) do update set hits=orbytek_contact_limits.hits+1 returning hits into n;
  if n>5 then return 'limited'; end if;
 end loop;
 insert into orbytek_contact_requests(id,payload_hash,name,email,phone,company,project,message,origin)
 values(p_id,p_hash,p_data->>'name',p_data->>'email',p_data->>'phone',p_data->>'company',p_data->>'project',p_data->>'message',p_data->>'origin');
 return 'accepted';
end $$;

create function public.orbytek_contact_claim()
returns setof public.orbytek_contact_requests language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Never resend an ambiguous attempt after Resend's 24-hour deduplication window.
 update orbytek_contact_requests set notification_status='failed',last_error='retry_window_expired',lease_until=null
 where notification_status in ('pending','processing') and (attempts>=8 or created_at<now()-interval '23 hours')
 and (lease_until is null or lease_until<now());
 return query
 with due as (
  select id from orbytek_contact_requests
  where notification_status in ('pending','processing') and next_attempt_at<=now()
   and (lease_until is null or lease_until<now()) and attempts<8 and created_at>now()-interval '23 hours'
  order by created_at for update skip locked limit 10
 ) update orbytek_contact_requests r set notification_status='processing',attempts=r.attempts+1,
  lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid()
 from due where r.id=due.id returning r.*;
end $$;

create function public.orbytek_contact_finish(p_id uuid,p_lease uuid,p_email_id text,p_error text,p_retry boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update orbytek_contact_requests r set
  notification_status=case when p_email_id is not null then 'sent' when p_retry and attempts<8 then 'pending' else 'failed' end,
  email_id=coalesce(p_email_id,email_id),last_error=p_error,lease_until=null,lease_token=null,
  sent_at=case when p_email_id is not null then now() else sent_at end,
  next_attempt_at=now()+make_interval(secs=>least(21600,(60*power(2,attempts))::integer)),
  delivery_status=coalesce((select e.status from orbytek_contact_events e where e.email_id=p_email_id order by occurred_at desc limit 1),r.delivery_status)
 where r.id=p_id and r.lease_token=p_lease and r.notification_status='processing';
end $$;

create function public.orbytek_contact_event(p_event text,p_email text,p_status text,p_time timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_status not in ('delivered','bounced','failed','delayed') then raise exception 'Invalid event'; end if;
 insert into orbytek_contact_events values(p_event,p_email,p_status,p_time,now()) on conflict do nothing;
 update orbytek_contact_requests r set delivery_status=(
  select e.status from orbytek_contact_events e where e.email_id=p_email order by occurred_at desc limit 1
 ) where r.email_id=p_email;
end $$;

revoke all on function public.orbytek_contact_enqueue(uuid,text,jsonb,text[]),public.orbytek_contact_claim(),public.orbytek_contact_finish(uuid,uuid,text,text,boolean),public.orbytek_contact_event(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.orbytek_contact_enqueue(uuid,text,jsonb,text[]),public.orbytek_contact_claim(),public.orbytek_contact_finish(uuid,uuid,text,text,boolean),public.orbytek_contact_event(text,text,text,timestamptz) to service_role;
commit;
