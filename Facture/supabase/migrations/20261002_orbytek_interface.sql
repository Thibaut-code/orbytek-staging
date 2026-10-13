-- Apply after 20261002_original_interface.sql to allow theme 12 for each account.
begin;
alter table public.companies drop constraint if exists companies_ui_theme_check;
alter table public.companies add constraint companies_ui_theme_check
  check (ui_theme in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable','classique','orbytek'));
alter table public.company_members drop constraint if exists company_members_ui_theme_check;
alter table public.company_members add constraint company_members_ui_theme_check
  check (ui_theme in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable','classique','orbytek'));
create or replace function public.set_interface_preference(interface_key text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or interface_key is null or interface_key not in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable','classique','orbytek') then raise exception 'Apparence invalide'; end if;
 update public.company_members set ui_theme=interface_key where member_id=auth.uid();
 if not found then raise exception 'Rechargez votre espace'; end if;
end $$;
commit;
