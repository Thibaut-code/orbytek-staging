-- Exécuter après sauvegarde, sur les tables existantes de Facture Facile.
begin;
alter table public.companies add column if not exists street text;
alter table public.companies add column if not exists house_number text;
alter table public.companies add column if not exists box text;
alter table public.companies add column if not exists postal_code text;
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists country text default 'BE';
alter table public.companies add column if not exists appearance jsonb;
alter table public.companies add column if not exists theme text default 'plombier';
alter table public.companies add column if not exists logo text;
alter table public.companies add column if not exists catalogs jsonb default '{}'::jsonb;
alter table public.clients add column if not exists note text;
alter table public.clients add column if not exists vat text;
alter table public.clients add column if not exists peppol_id text;
alter table public.clients add column if not exists street text;
alter table public.clients add column if not exists postal_code text;
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists country text default 'BE';
alter table public.documents add column if not exists appearance jsonb;
alter table public.documents add column if not exists sent_at timestamptz;
alter table public.documents add column if not exists peppol jsonb;
alter table public.documents add column if not exists recurrence jsonb;
-- Anciennes contraintes éventuelles limitant les thèmes à cinq métiers.
alter table public.companies drop constraint if exists companies_theme_check;
alter table public.companies add constraint companies_theme_check check (theme in ('plombier','jardinier','electricien','peintre','menuisier','it','nettoyage','mecanicien','photographe','consultant'));
create table if not exists public.document_counters (
 user_id uuid not null references auth.users(id) on delete cascade,
 year integer not null, type text not null, last_value integer not null,
 primary key(user_id,year,type)
);
alter table public.document_counters enable row level security;
revoke all on public.document_counters from anon, authenticated;
create table if not exists public.document_send_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 recipient text not null, confirmed_at timestamptz not null default now(), method text not null default 'manual_confirmation'
);
alter table public.document_send_history enable row level security;
drop policy if exists own_send_history on public.document_send_history;
create policy own_send_history on public.document_send_history for select to authenticated using(auth.uid()=user_id);
revoke all on public.document_send_history from anon, authenticated;
grant select on public.document_send_history to authenticated;
create table if not exists public.integration_jobs (
 document_id uuid not null references public.documents(id) on delete cascade, action text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 state text not null default 'processing', result jsonb, created_at timestamptz not null default now(),
 primary key(document_id,action)
);
alter table public.integration_jobs enable row level security;
revoke all on public.integration_jobs from anon, authenticated;

create or replace function public.save_document_v2(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
 uid uuid := auth.uid(); doc_id uuid; doc_number text; old_doc public.documents%rowtype;
 yr integer; seq integer; prefix text; line jsonb; pos integer:=0; kind text;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 kind := payload->>'type';
 if kind is null or kind not in ('facture','devis') then raise exception 'Type invalide'; end if;
 if not exists(select 1 from public.clients where id=(payload->>'client_id')::uuid and user_id=uid) then raise exception 'Client introuvable'; end if;
 if nullif(trim(payload->>'job'),'') is null then raise exception 'Description requise'; end if;
 if (payload->>'issue_date')::date is null or (payload->>'due_date')::date is null or (payload->>'due_date')::date < (payload->>'issue_date')::date then raise exception 'Dates invalides'; end if;
 if jsonb_typeof(payload->'lines') is distinct from 'array' or jsonb_array_length(payload->'lines')=0 then raise exception 'Prestations requises'; end if;
 if nullif(payload->>'converted_from','') is not null and not exists(select 1 from public.documents where id=(payload->>'converted_from')::uuid and user_id=uid and type='devis') then raise exception 'Devis source introuvable'; end if;
 -- Un verrou par utilisateur sérialise sauvegardes, modifications et connexions externes.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if nullif(payload->>'id','') is not null then
   select * into old_doc from public.documents where id=(payload->>'id')::uuid and user_id=uid for update;
   if not found then raise exception 'Document introuvable'; end if;
   if old_doc.sent_at is not null or old_doc.paid or old_doc.peppol is not null or exists(select 1 from public.integration_jobs where document_id=old_doc.id) then raise exception 'Document envoyé, payé ou transmis : modification bloquée'; end if;
   if kind<>old_doc.type then raise exception 'Type non modifiable'; end if;
   doc_id:=old_doc.id; doc_number:=old_doc.number;
   update public.documents set client_id=(payload->>'client_id')::uuid, issue_date=(payload->>'issue_date')::date,
    due_date=(payload->>'due_date')::date,job=payload->>'job',site=payload->>'site',
    issuer_snapshot=payload->'issuer_snapshot',customer_snapshot=(payload->'customer_snapshot')-'note'-'user_id',
    recurrence=case when payload->'recurrence'='null'::jsonb then null else payload->'recurrence' end,
    appearance=payload->'appearance' where id=doc_id;
   delete from public.document_lines where document_id=doc_id and user_id=uid;
 else
   yr:=extract(year from (payload->>'issue_date')::date); prefix:=case when kind='facture' then 'F' else 'D' end;
   select coalesce(max(substring(number from '[0-9]+$')::integer),0) into seq from public.documents where user_id=uid and number ~ ('^'||prefix||'-'||yr||'-[0-9]+$');
   insert into public.document_counters(user_id,year,type,last_value) values(uid,yr,kind,seq+1)
    on conflict(user_id,year,type) do update set last_value=greatest(document_counters.last_value,seq)+1 returning last_value into seq;
   doc_number:=prefix||'-'||yr||'-'||lpad(seq::text,greatest(3,length(seq::text)),'0');
   insert into public.documents(user_id,client_id,number,type,issue_date,due_date,job,site,paid,issuer_snapshot,customer_snapshot,converted_from,recurrence,appearance)
   values(uid,(payload->>'client_id')::uuid,doc_number,kind,(payload->>'issue_date')::date,(payload->>'due_date')::date,payload->>'job',payload->>'site',false,payload->'issuer_snapshot',(payload->'customer_snapshot')-'note'-'user_id',nullif(payload->>'converted_from','')::uuid,case when payload->'recurrence'='null'::jsonb then null else payload->'recurrence' end,payload->'appearance') returning id into doc_id;
 end if;
 for line in select * from jsonb_array_elements(payload->'lines') loop
   if jsonb_typeof(line->'qty') is distinct from 'number' or jsonb_typeof(line->'price') is distinct from 'number' or jsonb_typeof(line->'tax') is distinct from 'number' or nullif(trim(line->>'name'),'') is null or coalesce((line->>'qty')::numeric,0)<=0 or (line->>'price') is null or (line->>'price')::numeric<0 or (line->>'tax') is null or (line->>'tax')::numeric not in (0,6,12,21) then raise exception 'Prestation invalide'; end if;
   insert into public.document_lines(user_id,document_id,position,name,quantity,unit_price,vat_rate)
    values(uid,doc_id,pos,line->>'name',(line->>'qty')::numeric,(line->>'price')::numeric,(line->>'tax')::numeric);
   pos:=pos+1;
 end loop;
 return jsonb_build_object('id',doc_id,'number',doc_number);
end $$;
revoke all on function public.save_document_v2(jsonb) from public, anon;
grant execute on function public.save_document_v2(jsonb) to authenticated;
create or replace function public.confirm_document_send(document_id uuid, recipient text) returns timestamptz
language plpgsql security definer set search_path=public,pg_temp as $$
declare stamp timestamptz:=now();
begin
 if auth.uid() is null or recipient is null or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Destinataire invalide'; end if;
 update public.documents set sent_at=stamp where id=document_id and user_id=auth.uid();
 if not found then raise exception 'Document introuvable'; end if;
 insert into public.document_send_history(user_id,document_id,recipient,confirmed_at) values(auth.uid(),document_id,recipient,stamp);
 return stamp;
end $$;
revoke all on function public.confirm_document_send(uuid,text) from public,anon;
grant execute on function public.confirm_document_send(uuid,text) to authenticated;

-- Fonction réservée au serveur, synchronisée avec save_document_v2.
create or replace function public.begin_integration_job(target_document uuid,target_user uuid,target_action text,expected_document jsonb,expected_lines jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
 if target_action <> 'peppol-test' or not exists(select 1 from public.documents where id=target_document and user_id=target_user and type='facture') then raise exception 'Document invalide'; end if;
 if (select to_jsonb(d) from public.documents d where id=target_document) is distinct from expected_document or (select jsonb_agg(to_jsonb(l) order by position) from public.document_lines l where document_id=target_document and user_id=target_user) is distinct from expected_lines then raise exception 'Document modifié pendant la préparation : rechargez la page'; end if;
 insert into public.integration_jobs(document_id,user_id,action) values(target_document,target_user,target_action);
end $$;
revoke all on function public.begin_integration_job(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.begin_integration_job(uuid,uuid,text,jsonb,jsonb) to service_role;

grant all on public.integration_jobs to service_role;
commit;
