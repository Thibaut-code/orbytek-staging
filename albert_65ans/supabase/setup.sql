-- À exécuter une fois dans le SQL Editor du projet Supabase d’Orbytek.
-- Aucun changement aux tables ou comptes de Facture Facile.
begin;
create schema if not exists albert_private;
revoke all on schema albert_private from public, anon, authenticated;

create table if not exists albert_private.settings (
  id boolean primary key default true check (id),
  access_code text not null default replace(gen_random_uuid()::text, '-', '')
);
insert into albert_private.settings(id) values (true) on conflict do nothing;

create table if not exists albert_private.questions (id text primary key);
create table if not exists albert_private.people (
  id text primary key,
  name text not null check (length(name) between 1 and 80 and name=btrim(name)),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table albert_private.people add column if not exists deleted_at timestamptz;
create unique index if not exists albert_people_name_unique on albert_private.people(lower(name));
insert into albert_private.people(id,name) values ('maman','Maman'),('jean-paul','Jean-Paul'),('thibaut','Thibaut')
on conflict do nothing;
create table if not exists albert_private.records (
  person text not null references albert_private.people(id),
  id text not null,
  kind text not null check (kind in ('question','conversation','anecdote')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (person, id)
);
-- Migration des trois profils fixes vers le registre partagé des participants.
alter table albert_private.records drop constraint if exists records_person_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='albert_private.records'::regclass and conname='records_person_fkey') then
    alter table albert_private.records add constraint records_person_fkey foreign key(person) references albert_private.people(id);
  end if;
end $$;
alter table albert_private.people enable row level security;
alter table albert_private.settings enable row level security;
alter table albert_private.questions enable row level security;
alter table albert_private.records enable row level security;
revoke all on all tables in schema albert_private from public, anon, authenticated;

-- Les 165 identifiants stables du questionnaire original.
insert into albert_private.questions(id)
select 's' || s.i || 'q' || q.i
from (values (0,9),(1,14),(2,15),(3,12),(4,13),(5,13),(6,11),
             (7,15),(8,11),(9,13),(10,11),(11,9),(12,8),(13,11)) s(i,n)
cross join lateral generate_series(0,s.n-1) q(i)
on conflict do nothing;

create or replace function public.albert_people(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_code is null or not exists (select 1 from albert_private.settings where access_code=p_code) then
    raise exception 'Code familial incorrect' using errcode='42501';
  end if;
  return jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)
    order by case id when 'maman' then 0 when 'jean-paul' then 1 when 'thibaut' then 2 else 3 end,created_at,id)
    from albert_private.people where deleted_at is null),'[]'::jsonb));
end;
$$;

create or replace function public.albert_add_person(p_code text,p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare clean_name text; participant albert_private.people%rowtype; created boolean:=false;
begin
  if p_code is null or not exists (select 1 from albert_private.settings where access_code=p_code) then
    raise exception 'Code familial incorrect' using errcode='42501';
  end if;
  clean_name:=btrim(regexp_replace(p_name,'\s+',' ','g'));
  if clean_name is null or length(clean_name) not between 1 and 80 or clean_name ~ '[[:cntrl:]]' then
    raise exception 'Prénom ou nom invalide' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('albert:people',0));
  select * into participant from albert_private.people where lower(name)=lower(clean_name);
  if found and participant.deleted_at is not null then
    raise exception 'Ce prénom correspond à un profil supprimé. Demande à Thibaut de le restaurer.' using errcode='22023';
  end if;
  if not found then
    insert into albert_private.people(id,name) values ('p-'||gen_random_uuid()::text,clean_name) returning * into participant;
    created:=true;
  end if;
  return jsonb_build_object('person',jsonb_build_object('id',participant.id,'name',participant.name),'created',created);
end;
$$;

create or replace function public.albert_snapshot(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_code is null or not exists (select 1 from albert_private.settings where access_code = p_code) then
    raise exception 'Code familial incorrect' using errcode = '42501';
  end if;
  return jsonb_build_object('people',public.albert_people(p_code)->'people','records', coalesce((
    select jsonb_agg(jsonb_build_object('person',r.person,'id',r.id,'kind',r.kind,
      'data',r.data,'revision',r.revision,'updatedAt',r.updated_at) order by r.person,r.id)
    from albert_private.records r join albert_private.people p on p.id=r.person and p.deleted_at is null
  ),'[]'::jsonb));
end;
$$;

create or replace function public.albert_save(p_code text, p_person text, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  change jsonb; content jsonb; current_row albert_private.records%rowtype;
  row_json jsonb; saved jsonb := '[]'::jsonb; conflicts jsonb := '[]'::jsonb;
  base_revision bigint; field text; current_exists boolean;
begin
  if p_code is null or not exists (select 1 from albert_private.settings where access_code = p_code) then
    raise exception 'Code familial incorrect' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('albert:' || coalesce(p_person,''), 0));
  if exists(select 1 from albert_private.people where id=p_person and deleted_at is not null) then
    raise exception 'Profil supprimé' using errcode='22023';
  end if;
  if p_person is null or not exists (select 1 from albert_private.people where id=p_person and deleted_at is null) then
    raise exception 'Profil inconnu' using errcode = '22023';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Liste de modifications invalide' using errcode = '22023';
  end if;
  if jsonb_array_length(p_changes) > 25 or octet_length(p_changes::text) > 24000000 then
    raise exception 'Sauvegarde trop volumineuse' using errcode = '22023';
  end if;
  -- Sérialise les écritures simultanées du même profil, y compris la première.
  for change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(change) <> 'object' or change->>'kind' is null
       or change->>'kind' not in ('question','conversation','anecdote')
       or change->>'id' is null or length(change->>'id') > 50
       or change->>'baseRevision' is null or change->>'baseRevision' !~ '^[0-9]{1,12}$' then
      raise exception 'Souvenir invalide' using errcode = '22023';
    end if;
    if change->>'kind' = 'question' then
      if not exists (select 1 from albert_private.questions where id = change->>'id') then
        raise exception 'Question inconnue' using errcode = '22023';
      end if;
    elsif change->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Identifiant de scène invalide' using errcode = '22023';
    end if;
    content := change->'data';
    if content is null or jsonb_typeof(content) <> 'object' or octet_length(content::text)>4500000 then
      raise exception 'Contenu invalide ou trop volumineux' using errcode = '22023';
    end if;
    foreach field in array array['answer','memory','words','when','who','topic','tone'] loop
      if content ? field and (jsonb_typeof(content->field)<>'string' or length(content->>field)>50000) then
        raise exception 'Texte invalide ou trop long' using errcode = '22023';
      end if;
    end loop;
    if content ? 'photos' then
      if jsonb_typeof(content->'photos')<>'array' then
        raise exception 'Photos invalides' using errcode = '22023';
      end if;
      if jsonb_array_length(content->'photos')>8 or exists (
        select 1 from jsonb_array_elements(content->'photos') ph
        where jsonb_typeof(ph)<>'object' or ph->>'data' is null
          or length(ph->>'data')>500000
          or ph->>'data' !~ '^data:image/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$'
      ) then raise exception 'Photos invalides ou trop volumineuses' using errcode = '22023'; end if;
    end if;
    base_revision := (change->>'baseRevision')::bigint;
    select * into current_row from albert_private.records where person=p_person and id=change->>'id' for update;
    current_exists := found;
    if current_exists and current_row.kind <> change->>'kind' then
      raise exception 'Type de souvenir incohérent' using errcode = '22023';
    end if;
    if coalesce(current_row.revision,0) <> base_revision then
      row_json := jsonb_build_object('person',current_row.person,'id',current_row.id,'kind',current_row.kind,
        'data',current_row.data,'revision',current_row.revision,'updatedAt',current_row.updated_at);
      -- Une réponse réseau perdue peut provoquer une répétition : succès idempotent.
      if current_exists and current_row.data = content then saved := saved || jsonb_build_array(row_json);
      else conflicts := conflicts || jsonb_build_array(row_json); end if;
      continue;
    end if;
    insert into albert_private.records as r(person,id,kind,data,revision,updated_at)
    values(p_person,change->>'id',change->>'kind',content,base_revision+1,now())
    on conflict(person,id) do update set data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at
    returning * into current_row;
    saved := saved || jsonb_build_array(jsonb_build_object('person',current_row.person,'id',current_row.id,
      'kind',current_row.kind,'data',current_row.data,'revision',current_row.revision,'updatedAt',current_row.updated_at));
  end loop;
  return jsonb_build_object('saved',saved,'conflicts',conflicts);
end;
$$;
revoke all on function public.albert_snapshot(text) from public;
revoke all on function public.albert_save(text,text,jsonb) from public;
revoke all on function public.albert_people(text) from public;
revoke all on function public.albert_add_person(text,text) from public;
grant execute on function public.albert_snapshot(text) to anon, authenticated;
grant execute on function public.albert_save(text,text,jsonb) to anon, authenticated;
grant execute on function public.albert_people(text) to anon, authenticated;
grant execute on function public.albert_add_person(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;

-- Garder ce lien dans la famille. Le secret n’est présent dans aucun fichier public.
select 'https://orbytek.be/albert_65ans/#famille=' || access_code as lien_familial,
       access_code as code_familial
from albert_private.settings where id;
