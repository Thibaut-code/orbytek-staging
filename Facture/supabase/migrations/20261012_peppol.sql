-- Peppol module. Run after the existing team migration. No API secrets in public tables.
begin;
create table public.peppol_companies (
 user_id uuid not null references auth.users(id), environment text not null check(environment in ('playground','production')),
 provider_id text, team_id text, state text not null default 'not_started', verified boolean not null default false,
 reception_enabled boolean not null default false, peppol_id text, verification_url text, error text,
 updated_at timestamptz not null default now(), primary key(user_id,environment), unique(environment,provider_id)
);
create table public.peppol_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 environment text not null check(environment in ('playground','production')), provider_id text,
 source_id uuid references public.documents(id) on delete restrict,
 direction text not null check(direction in ('incoming','outgoing')), kind text not null default 'invoice', number text not null,
 party_name text not null default '', party_vat text not null default '', amount numeric(18,2), currency text not null default 'EUR', due_date date,
 status text not null default 'draft' check(status in ('draft','sending','sent','delivered','failed','unknown','received')),
 provider_status text, envelope_id text, provider_created_at timestamptz, failure jsonb not null default '[]',
 payload jsonb, parsed jsonb, validation jsonb, xml_path text, pdf_path text, archive_error text,
 read_at timestamptz, review_state text not null default 'to_review' check(review_state in ('to_review','verified','disputed')),
 paid_at timestamptz, business_response text, attempts integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(environment,provider_id), foreign key(user_id,environment) references public.peppol_companies(user_id,environment)
);
create unique index peppol_source_once on public.peppol_documents(user_id,environment,source_id,kind) where source_id is not null;
create unique index peppol_outgoing_number on public.peppol_documents(user_id,environment,kind,number) where direction='outgoing';
create index peppol_company_documents on public.peppol_documents(user_id,environment,created_at desc);
create table public.peppol_events (
 id bigint generated always as identity primary key, user_id uuid not null references auth.users(id), environment text not null,
 document_id uuid references public.peppol_documents(id), event_type text not null, detail jsonb not null default '{}',
 actor_id uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.peppol_webhook_events (
 digest text primary key, user_id uuid not null, environment text not null, payload jsonb not null,
 processed_at timestamptz, error text, created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['peppol_companies','peppol_documents','peppol_events','peppol_webhook_events'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from public,anon,authenticated',t);
   execute format('grant all on public.%I to service_role',t);
   if t <> 'peppol_webhook_events' then
     execute format('grant select on public.%I to authenticated',t);
     execute format('create policy company_read on public.%I for select to authenticated using(user_id=public.active_company_owner())',t);
   end if;
 end loop;
end $$;
grant usage,select on sequence public.peppol_events_id_seq to service_role;
insert into storage.buckets(id,name,public) values('peppol-archive','peppol-archive',false) on conflict(id) do nothing;
-- No client storage policy: downloads are authorised by the Edge Function and signed briefly.

create function public.peppol_claim_send(owner uuid, mode text, source uuid, expected_doc jsonb, expected_lines jsonb, body jsonb, actor uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare record_id uuid; existing public.peppol_documents%rowtype; kind_value text:=body->>'documentType';
begin
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 perform 1 from public.documents where id=source and user_id=owner for update;
 if not exists(select 1 from public.documents where id=source and user_id=owner and type='facture') then raise exception 'Facture introuvable'; end if;
 if kind_value not in ('invoice','creditNote') then raise exception 'Type invalide'; end if;
 if (select to_jsonb(d) from public.documents d where id=source) is distinct from expected_doc
 or (select jsonb_agg(to_jsonb(l) order by position) from public.document_lines l where document_id=source and user_id=owner) is distinct from expected_lines
 then raise exception 'La facture a changé : rechargez-la avant l’envoi'; end if;
 select * into existing from public.peppol_documents where user_id=owner and environment=mode and source_id=source and kind=kind_value for update;
 if found and (existing.status not in ('draft','failed') or existing.provider_id is not null) then raise exception 'Envoi déjà engagé. Actualisez le statut ; ne renvoyez pas le document.'; end if;
 insert into public.peppol_documents(user_id,environment,source_id,direction,kind,number,party_name,payload,status,attempts)
 values(owner,mode,source,'outgoing',kind_value,coalesce(body#>>'{document,invoiceNumber}',body#>>'{document,creditNoteNumber}'),body#>>'{document,buyer,name}',body,'sending',1)
 on conflict(user_id,environment,source_id,kind) where source_id is not null do update
 set payload=excluded.payload,status='sending',failure='[]',attempts=peppol_documents.attempts+1,updated_at=now()
 returning id into record_id;
 if kind_value='invoice' then
 update public.documents set peppol=jsonb_build_object('mode',mode,'moduleId',record_id,'status','sending') where id=source;
 end if;
 insert into public.peppol_events(user_id,environment,document_id,event_type,actor_id) values(owner,mode,record_id,'sending',actor);
 return record_id;
end $$;
revoke all on function public.peppol_claim_send(uuid,text,uuid,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.peppol_claim_send(uuid,text,uuid,jsonb,jsonb,jsonb,uuid) to service_role;

create function public.peppol_record_change() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' or row(NEW.status,NEW.read_at,NEW.review_state,NEW.paid_at,NEW.business_response) is distinct from row(OLD.status,OLD.read_at,OLD.review_state,OLD.paid_at,OLD.business_response) then
 insert into public.peppol_events(user_id,environment,document_id,event_type,detail)
 values(NEW.user_id,NEW.environment,NEW.id,'document.updated',jsonb_build_object('status',NEW.status,'review',NEW.review_state,'paidAt',NEW.paid_at,'businessResponse',NEW.business_response,'failure',NEW.failure,'providerId',NEW.provider_id,'request',case when NEW.status='sending' then NEW.payload else null end));
 end if;
 return NEW;
end $$;
create trigger peppol_audit after insert or update on public.peppol_documents for each row execute function public.peppol_record_change();

-- The invoice and its lines are frozen while a transmission can have reached the network.
-- This also protects direct API writes, not only save_document_v2.
create function public.peppol_protect_source() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare source uuid; active boolean;
begin
 if TG_TABLE_NAME='documents' then source:=OLD.id;
 else source:=case when TG_OP='INSERT' then NEW.document_id else OLD.document_id end; end if;
 if TG_TABLE_NAME='document_lines' then
   perform 1 from public.documents where id=source for update;
   if TG_OP='UPDATE' and NEW.document_id<>OLD.document_id then perform 1 from public.documents where id=NEW.document_id for update; end if;
 end if;
 select exists(select 1 from public.peppol_documents where source_id=source and kind='invoice' and status in ('sending','sent','delivered','unknown')) into active;
 if TG_TABLE_NAME='document_lines' and TG_OP='UPDATE' then
 active:=active or exists(select 1 from public.peppol_documents where source_id=NEW.document_id and kind='invoice' and status in ('sending','sent','delivered','unknown'));
 end if;
 if active then
   if TG_TABLE_NAME='document_lines' or TG_OP='DELETE' then raise exception 'Document engagé dans Peppol : contenu verrouillé'; end if;
   if row(NEW.number,NEW.type,NEW.issue_date,NEW.due_date,NEW.issuer_snapshot,NEW.customer_snapshot,NEW.client_id,NEW.job,NEW.site,NEW.user_id)
      is distinct from row(OLD.number,OLD.type,OLD.issue_date,OLD.due_date,OLD.issuer_snapshot,OLD.customer_snapshot,OLD.client_id,OLD.job,OLD.site,OLD.user_id)
   then raise exception 'Document engagé dans Peppol : contenu verrouillé'; end if;
 end if;
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end $$;
create trigger peppol_protect_document before update or delete on public.documents for each row execute function public.peppol_protect_source();
create trigger peppol_protect_lines before insert or update or delete on public.document_lines for each row execute function public.peppol_protect_source();
commit;
