-- À exécuter dans le SQL Editor du projet Supabase.
-- N'affecte que les objets AutoPrime ci-dessous ; aucune donnée de démonstration.
begin;

create table if not exists public.vehicle_admins (
    user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.vehicle_admins enable row level security;
revoke all on public.vehicle_admins from anon, authenticated;
grant select on public.vehicle_admins to authenticated;
drop policy if exists "vehicle_admin_self" on public.vehicle_admins;
create policy "vehicle_admin_self" on public.vehicle_admins for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_vehicle_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.vehicle_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_vehicle_admin() from public;
grant execute on function public.is_vehicle_admin() to authenticated;

create or replace function public.valid_vehicle_photos(items jsonb, vehicle_id uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
    item jsonb;
    seen text[] := '{}';
    pattern text := '^' || vehicle_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$';
begin
    if jsonb_typeof(items) is distinct from 'array' then return false; end if;
    if jsonb_array_length(items) > 10 then return false; end if;
    for item in select value from jsonb_array_elements(items) loop
        if jsonb_typeof(item) is distinct from 'object'
            or jsonb_typeof(item->'path') is distinct from 'string'
            or jsonb_typeof(item->'thumb') is distinct from 'string'
            or jsonb_typeof(item->'width') is distinct from 'number'
            or jsonb_typeof(item->'height') is distinct from 'number' then return false; end if;
        if (item->>'path') !~ pattern
            or item->>'thumb' <> regexp_replace(item->>'path', '\.webp$', '-thumb.webp')
            or item->>'path' = any(seen) then return false; end if;
        if (item->>'width')::numeric not between 1 and 1600
            or (item->>'height')::numeric not between 1 and 1600 then return false; end if;
        seen := array_append(seen, item->>'path');
    end loop;
    return true;
end;
$$;

create table if not exists public.voitures (
    id uuid primary key default gen_random_uuid(),
    marque text not null check (length(trim(marque)) between 1 and 80),
    modele text not null check (length(trim(modele)) between 1 and 160),
    annee integer not null check (annee between 1900 and 2100),
    km integer not null check (km between 0 and 10000000),
    prix integer not null check (prix between 0 and 100000000),
    carburant text not null check (carburant in ('Essence','Diesel','Hybride','Électrique','GPL','Autre')),
    boite text not null check (boite in ('Manuelle','Automatique')),
    categorie text not null check (categorie in ('Berline','SUV','Citadine','Premium','Autre')),
    badge text not null default '' check (badge in ('','Nouveau','Promo','Hybride','Électrique')),
    dispo boolean not null default true,
    photos jsonb not null default '[]'::jsonb check (public.valid_vehicle_photos(photos, id)),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists voitures_catalogue_order on public.voitures(created_at desc, id);
alter table public.voitures enable row level security;
revoke all on public.voitures from anon, authenticated;
grant select on public.voitures to anon, authenticated;
grant insert, update, delete on public.voitures to authenticated;
drop policy if exists "vehicle_public_read" on public.voitures;
create policy "vehicle_public_read" on public.voitures for select to anon, authenticated using (true);
drop policy if exists "vehicle_admin_insert" on public.voitures;
create policy "vehicle_admin_insert" on public.voitures for insert to authenticated with check ((select public.is_vehicle_admin()));
drop policy if exists "vehicle_admin_update" on public.voitures;
create policy "vehicle_admin_update" on public.voitures for update to authenticated using ((select public.is_vehicle_admin())) with check ((select public.is_vehicle_admin()));
drop policy if exists "vehicle_admin_delete" on public.voitures;
create policy "vehicle_admin_delete" on public.voitures for delete to authenticated using ((select public.is_vehicle_admin()));

create or replace function public.vehicle_brands() returns table(marque text)
language sql stable security invoker set search_path = '' as $$
    select distinct v.marque from public.voitures v order by v.marque;
$$;
revoke all on function public.vehicle_brands() from public;
grant execute on function public.vehicle_brands() to anon, authenticated;

-- Un import abandonné attend 24 h ; une ancienne photo retirée est supprimable immédiatement.
create table if not exists public.vehicle_photo_cleanup (
    path text primary key check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-thumb)?\.webp$'),
    not_before timestamptz not null default (now() + interval '24 hours')
);
alter table public.vehicle_photo_cleanup enable row level security;
revoke all on public.vehicle_photo_cleanup from anon, authenticated;
grant select, insert, delete on public.vehicle_photo_cleanup to authenticated;
drop policy if exists "vehicle_cleanup_admin" on public.vehicle_photo_cleanup;
create policy "vehicle_cleanup_admin" on public.vehicle_photo_cleanup for all to authenticated using ((select public.is_vehicle_admin())) with check ((select public.is_vehicle_admin()));

create or replace function public.vehicle_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.id := old.id;
    new.created_at := old.created_at;
    new.updated_at := clock_timestamp();
    return new;
end;
$$;
drop trigger if exists vehicle_stamp on public.voitures;
create trigger vehicle_stamp before update on public.voitures for each row execute function public.vehicle_stamp();

create or replace function public.vehicle_queue_photos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    old_paths text[] := '{}';
    new_paths text[] := '{}';
begin
    if tg_op <> 'INSERT' then
        select coalesce(array_agg(p), '{}') into old_paths from (
            select item->>'path' p from jsonb_array_elements(old.photos) item
            union all select item->>'thumb' from jsonb_array_elements(old.photos) item
        ) paths;
    end if;
    if tg_op <> 'DELETE' then
        select coalesce(array_agg(p), '{}') into new_paths from (
            select item->>'path' p from jsonb_array_elements(new.photos) item
            union all select item->>'thumb' from jsonb_array_elements(new.photos) item
        ) paths;
    end if;
    delete from public.vehicle_photo_cleanup where path = any(new_paths);
    insert into public.vehicle_photo_cleanup(path, not_before)
        select p, now() from unnest(old_paths) p where not (p = any(new_paths))
        on conflict (path) do update set not_before = excluded.not_before;
    return null;
end;
$$;
revoke all on function public.vehicle_queue_photos() from public;
drop trigger if exists vehicle_queue_photos on public.voitures;
create trigger vehicle_queue_photos after insert or update or delete on public.voitures for each row execute function public.vehicle_queue_photos();

create or replace function public.vehicle_photo_in_use(object_path text) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.voitures v, jsonb_array_elements(v.photos) photo
        where photo->>'path' = object_path or photo->>'thumb' = object_path);
$$;
revoke all on function public.vehicle_photo_in_use(text) from public;
grant execute on function public.vehicle_photo_in_use(text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 1048576, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp'];
drop policy if exists "vehicle_storage_read" on storage.objects;
create policy "vehicle_storage_read" on storage.objects for select to authenticated using (bucket_id = 'vehicle-photos' and (select public.is_vehicle_admin()));
drop policy if exists "vehicle_storage_insert" on storage.objects;
create policy "vehicle_storage_insert" on storage.objects for insert to authenticated with check (
    bucket_id = 'vehicle-photos' and (select public.is_vehicle_admin())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-thumb)?\.webp$'
    and exists (select 1 from public.vehicle_photo_cleanup q where q.path = name)
);
drop policy if exists "vehicle_storage_delete" on storage.objects;
create policy "vehicle_storage_delete" on storage.objects for delete to authenticated using (
    bucket_id = 'vehicle-photos' and (select public.is_vehicle_admin())
    and not public.vehicle_photo_in_use(name)
);
commit;

-- Après avoir créé votre compte dans Authentication → Users → Add user :
-- insert into public.vehicle_admins(user_id)
-- select id from auth.users where email = 'votre-email@exemple.be'
-- on conflict (user_id) do nothing;
