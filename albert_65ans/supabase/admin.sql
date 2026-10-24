-- Administration du questionnaire. Mot de passe fixe demandé : vasco.
-- Les vérifications sont faites côté serveur pour chaque opération.
begin;
create table if not exists albert_private.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  notes text not null default '' check (length(notes)<=4000),
  photos jsonb not null default '[]'::jsonb,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create unique index if not exists characters_name_unique on albert_private.characters (lower(regexp_replace(btrim(name),'\s+',' ','g')));
alter table albert_private.characters enable row level security;
revoke all on albert_private.characters from public,anon,authenticated;
create or replace function public.albert_admin_snapshot(p_password text)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='15s' as $$
declare family_code text; snapshot jsonb;
begin
  if p_password is distinct from 'vasco' then
    raise exception 'Mot de passe incorrect' using errcode='42501';
  end if;
  select access_code into family_code from albert_private.settings where id;
  snapshot:=public.albert_snapshot(family_code);
  return snapshot || jsonb_build_object(
    'characters',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'notes',c.notes,'photos',c.photos,'revision',c.revision,'updatedAt',c.updated_at) order by c.name) from albert_private.characters c),'[]'::jsonb),
    'archivedPeople',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'deletedAt',p.deleted_at)
      order by p.deleted_at desc) from albert_private.people p where p.deleted_at is not null),'[]'::jsonb),
    'archivedRecords',coalesce((select jsonb_agg(jsonb_build_object('person',r.person,'id',r.id,'kind',r.kind,
      'data',r.data,'revision',r.revision,'updatedAt',r.updated_at))
      from albert_private.records r join albert_private.people p on p.id=r.person where p.deleted_at is not null),'[]'::jsonb));
end;
$$;

create or replace function public.albert_admin_remove_person(p_password text,p_person text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare participant albert_private.people%rowtype;
begin
  if p_password is distinct from 'vasco' then
    raise exception 'Mot de passe incorrect' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('albert:' || coalesce(p_person,''),0));
  select * into participant from albert_private.people where id=p_person for update;
  if not found then raise exception 'Personne inconnue' using errcode='22023'; end if;
  update albert_private.people set deleted_at=coalesce(deleted_at,now()) where id=p_person;
  return jsonb_build_object('removed',true,'id',p_person);
end;
$$;

create or replace function public.albert_admin_restore_person(p_password text,p_person text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if p_password is distinct from 'vasco' then
    raise exception 'Mot de passe incorrect' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('albert:' || coalesce(p_person,''),0));
  update albert_private.people set deleted_at=null where id=p_person;
  if not found then raise exception 'Personne inconnue' using errcode='22023'; end if;
  return jsonb_build_object('restored',true,'id',p_person);
end;
$$;
create or replace function public.albert_admin_save_character(p_password text,p_id uuid,p_name text,p_notes text,p_photos jsonb,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result albert_private.characters%rowtype; photo jsonb;
begin
  if p_password is distinct from 'vasco' then raise exception 'Mot de passe incorrect' using errcode='42501'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 100 or p_notes is null or length(p_notes)>4000 then raise exception 'Nom ou indications incorrects' using errcode='22023'; end if;
  if p_photos is null or jsonb_typeof(p_photos)<>'array' then raise exception 'Photos incorrectes' using errcode='22023'; end if;
  if jsonb_array_length(p_photos)>8 then raise exception '8 photos maximum' using errcode='22023'; end if;
  for photo in select value from jsonb_array_elements(p_photos) loop
    if jsonb_typeof(photo)<>'object' or jsonb_typeof(photo->'name') is distinct from 'string' or length(photo->>'name')>250 or jsonb_typeof(photo->'data') is distinct from 'string' or length(photo->>'data')>500000 or (photo->>'data') !~ '^data:image/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$' then raise exception 'Photo incorrecte' using errcode='22023'; end if;
  end loop;
  if p_id is null then
    insert into albert_private.characters(name,notes,photos) values(btrim(p_name),p_notes,p_photos) returning * into result;
  else
    update albert_private.characters set name=btrim(p_name),notes=p_notes,photos=p_photos,revision=revision+1,updated_at=now() where id=p_id and revision=p_revision returning * into result;
    if not found then raise exception 'Fiche modifiée ailleurs ou supprimée. Actualise avant de réessayer.' using errcode='40001'; end if;
  end if;
  return jsonb_build_object('id',result.id,'name',result.name,'notes',result.notes,'photos',result.photos,'revision',result.revision,'updatedAt',result.updated_at);
end;
$$;
create or replace function public.albert_admin_delete_character(p_password text,p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if p_password is distinct from 'vasco' then raise exception 'Mot de passe incorrect' using errcode='42501'; end if;
  delete from albert_private.characters where id=p_id and revision=p_revision;
  if not found then raise exception 'Fiche modifiée ailleurs ou supprimée. Actualise avant de réessayer.' using errcode='40001'; end if;
  return jsonb_build_object('deleted',true);
end;
$$;
revoke all on function public.albert_admin_save_character(text,uuid,text,text,jsonb,integer) from public;
revoke all on function public.albert_admin_delete_character(text,uuid,integer) from public;
grant execute on function public.albert_admin_save_character(text,uuid,text,text,jsonb,integer) to anon,authenticated;
grant execute on function public.albert_admin_delete_character(text,uuid,integer) to anon,authenticated;
revoke all on function public.albert_admin_snapshot(text) from public;
revoke all on function public.albert_admin_remove_person(text,text) from public;
revoke all on function public.albert_admin_restore_person(text,text) from public;
grant execute on function public.albert_admin_snapshot(text) to anon,authenticated;
grant execute on function public.albert_admin_remove_person(text,text) to anon,authenticated;
grant execute on function public.albert_admin_restore_person(text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
