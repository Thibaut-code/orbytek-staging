begin;
create or replace function public.peppol_claim_send(owner uuid, mode text, source uuid, expected_doc jsonb, expected_lines jsonb, body jsonb, actor uuid) returns uuid
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
create or replace function public.peppol_protect_source() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
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
commit;
