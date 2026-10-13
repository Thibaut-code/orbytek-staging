-- Apply after 20260926_upgrade.sql, 20260930_vat.sql and 20261001_interface.sql.
-- Existing user_id values remain company owner IDs: no invoice/catalog copying.
begin;
create table if not exists public.company_members (
 member_id uuid primary key references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null default '', role text not null check(role in ('owner','employee')),
 ui_theme text check(ui_theme in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable')),
 joined_at timestamptz not null default now(), check(role <> 'owner' or member_id=owner_id)
);
create table if not exists public.company_invitations (
 token_hash text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 email text not null, expires_at timestamptz not null, used_at timestamptz
);
alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;
revoke all on public.company_members, public.company_invitations from public, anon, authenticated;
grant select on public.company_members to authenticated;
grant select on public.company_members to service_role;
drop policy if exists own_membership on public.company_members;
create policy own_membership on public.company_members for select to authenticated using(member_id=auth.uid());
insert into public.company_members(member_id,owner_id,role,display_name)
 select user_id,user_id,'owner','' from public.companies on conflict(member_id) do nothing;

create or replace function public.active_company_owner() returns uuid
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select owner_id from public.company_members where member_id=auth.uid()),auth.uid())
$$;
revoke all on function public.active_company_owner() from public,anon;
grant execute on function public.active_company_owner() to authenticated;
create or replace function public.company_context() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); m public.company_members%rowtype;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 insert into public.company_members(member_id,owner_id,role,display_name)
 values(uid,uid,'owner',coalesce((select raw_user_meta_data->>'full_name' from auth.users where id=uid),'')) on conflict(member_id) do nothing;
 select * into m from public.company_members where member_id=uid;
 return jsonb_build_object('owner_id',m.owner_id,'display_name',m.display_name,'role',m.role,'ui_theme',m.ui_theme);
end $$;
create or replace function public.set_employee_name(employee_name text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or length(trim(employee_name)) not between 1 and 100 then raise exception 'Nom invalide'; end if;
 update public.company_members set display_name=trim(employee_name) where member_id=auth.uid();
 if not found then raise exception 'Rechargez votre espace'; end if;
end $$;
create or replace function public.set_interface_preference(interface_key text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or interface_key is null or interface_key not in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable') then raise exception 'Apparence invalide'; end if;
 update public.company_members set ui_theme=interface_key where member_id=auth.uid();
 if not found then raise exception 'Rechargez votre espace'; end if;
end $$;
create or replace function public.invite_company_employee(employee_email text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); target_email text:=lower(trim(employee_email));
begin
 if auth.uid() is null or not exists(select 1 from public.company_members where member_id=auth.uid() and role='owner' and owner_id=auth.uid()) then raise exception 'Accès réservé au responsable'; end if;
 if not exists(select 1 from public.companies where user_id=auth.uid()) then raise exception 'Enregistrez les coordonnées de votre société'; end if;
 if target_email is null or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresse e-mail invalide'; end if;
 -- A new invitation invalidates previous unused invitations for this recipient.
 delete from public.company_invitations where owner_id=auth.uid() and email=target_email and used_at is null;
 insert into public.company_invitations(token_hash,owner_id,email,expires_at) values(encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid(),target_email,now()+interval '7 days');
 return token;
end $$;
create or replace function public.join_company(invitation_token text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); inv public.company_invitations%rowtype; target_email text;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 select lower(email) into target_email from auth.users where id=uid and email_confirmed_at is not null;
 if target_email is null then raise exception 'Confirmez votre adresse e-mail avant de rejoindre une société'; end if;
 select * into inv from public.company_invitations where token_hash=encode(sha256(convert_to(invitation_token,'UTF8')),'hex') and email=target_email and used_at is null and expires_at>now() for update;
 if not found then raise exception 'Invitation invalide, expirée ou destinée à une autre adresse e-mail'; end if;
 if uid=inv.owner_id then raise exception 'Vous êtes déjà responsable de cette société'; end if;
 if exists(select 1 from public.company_members where owner_id=uid and member_id<>uid) then raise exception 'Votre société possède déjà des employés : conservez son responsable'; end if;
 insert into public.company_members(member_id,owner_id,role,display_name) values(uid,inv.owner_id,'employee','')
 on conflict(member_id) do update set owner_id=excluded.owner_id,role='employee';
 update public.company_invitations set used_at=now() where token_hash=inv.token_hash;
end $$;
create or replace function public.list_company_team() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or public.active_company_owner()<>auth.uid() then raise exception 'Accès réservé au responsable'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('member_id',member_id,'display_name',display_name,'role',role) order by role desc,joined_at) from public.company_members where owner_id=auth.uid()),'[]'::jsonb);
end $$;
create or replace function public.remove_company_employee(employee_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or public.active_company_owner()<>auth.uid() then raise exception 'Accès réservé au responsable'; end if;
 update public.company_members set owner_id=member_id,role='owner' where member_id=employee_id and owner_id=auth.uid() and role='employee';
 if not found then raise exception 'Employé introuvable'; end if;
end $$;
do $$ declare f regprocedure; begin
 foreach f in array array['public.company_context()'::regprocedure,'public.set_employee_name(text)'::regprocedure,'public.set_interface_preference(text)'::regprocedure,'public.invite_company_employee(text)'::regprocedure,'public.join_company(text)'::regprocedure,'public.list_company_team()'::regprocedure,'public.remove_company_employee(uuid)'::regprocedure] loop
 execute format('revoke all on function %s from public, anon',f);
 execute format('grant execute on function %s to authenticated',f);
 end loop;
end $$;

-- Replace legacy personal policies with the active company boundary.
-- The server helper validates membership; changing a browser filter cannot grant access.
do $$ declare t text; p record; condition text; begin
 foreach t in array array['companies','clients','documents','document_lines','payment_reminders','vat_purchases','document_send_history'] loop
 if to_regclass('public.'||t) is null then continue; end if;
 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
 execute format('drop policy %I on public.%I',p.policyname,t);
 end loop;
 execute format('alter table public.%I enable row level security',t);
 condition:='user_id=public.active_company_owner()';
 if t='documents' then condition:=condition||' and exists(select 1 from public.clients c where c.id=client_id and c.user_id=public.active_company_owner())'; end if;
 if t in ('document_lines','payment_reminders','document_send_history') then condition:=condition||' and exists(select 1 from public.documents d where d.id=document_id and d.user_id=public.active_company_owner())'; end if;
 if t='document_send_history' then
 execute format('create policy company_access on public.%I for select to authenticated using (%s)',t,condition);
 else
 execute format('create policy company_access on public.%I for all to authenticated using (%s) with check (%s)',t,condition,condition);
 end if;
 end loop;
end $$;

-- Keep transaction validation/counters/locks from the installed save RPC.
-- Resolve its uid to the company, so all employees use the same number sequence.
do $$ declare definition text; begin
 if to_regprocedure('public.save_document_v2(jsonb)') is null then raise exception 'Exécutez 20260926_upgrade.sql avant cette migration'; end if;
 definition:=pg_get_functiondef('public.save_document_v2(jsonb)'::regprocedure);
 definition:=replace(definition,'uid uuid := auth.uid()','uid uuid := public.active_company_owner()');
 execute definition;
 definition:=pg_get_functiondef('public.confirm_document_send(uuid,text)'::regprocedure);
 definition:=replace(definition,'user_id=auth.uid()','user_id=public.active_company_owner()');
 definition:=replace(definition,'values(auth.uid(),document_id','values(public.active_company_owner(),document_id');
 execute definition;
end $$;
alter table public.documents add column if not exists created_by uuid references auth.users(id) on delete set null;
create or replace function public.record_document_employee() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then NEW.created_by:=auth.uid(); else NEW.created_by:=OLD.created_by; end if;
 return NEW;
end $$;
drop trigger if exists record_document_employee on public.documents;
create trigger record_document_employee before insert or update on public.documents for each row execute function public.record_document_employee();
commit;
