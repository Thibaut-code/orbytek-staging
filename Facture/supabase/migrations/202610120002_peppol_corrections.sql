begin;
alter table public.peppol_companies add column webhook_id text;
alter table public.peppol_companies add column webhook_error text;
create function public.peppol_prepare_correction(owner uuid, target uuid, actor uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.peppol_documents%rowtype; d public.documents%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 select * into p from public.peppol_documents where id=target and user_id=owner for update;
 if not found or p.status<>'failed' or p.provider_id is not null or p.kind<>'invoice' then raise exception 'Seul un envoi explicitement refusé avant transmission peut être corrigé'; end if;
 select * into d from public.documents where id=p.source_id and user_id=owner for update;
 if not found or d.sent_at is not null or d.paid then raise exception 'Facture déjà envoyée par e-mail ou payée : établissez un document correctif'; end if;
 if exists(select 1 from public.peppol_documents where source_id=d.id and status in ('sending','sent','delivered','unknown')) then raise exception 'Une autre transmission empêche la correction'; end if;
 if exists(select 1 from public.integration_jobs where document_id=d.id and (state<>'accepted' or coalesce(result->>'mode','')<>'generate')) then raise exception 'Un ancien test doit être vérifié avant de corriger cette facture'; end if;
 -- Preserve the historic validation result before allowing its new generation.
 insert into public.peppol_events(user_id,environment,document_id,event_type,detail,actor_id)
 select owner,p.environment,p.id,'legacy.validation.archived',result,actor from public.integration_jobs where document_id=d.id;
 delete from public.integration_jobs where document_id=d.id and state='accepted' and result->>'mode'='generate';
 update public.documents set peppol=null where id=d.id;
 insert into public.peppol_events(user_id,environment,document_id,event_type,actor_id) values(owner,p.environment,p.id,'correction.opened',actor);
 return d.id;
end $$;
revoke all on function public.peppol_prepare_correction(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.peppol_prepare_correction(uuid,uuid,uuid) to service_role;
commit;
