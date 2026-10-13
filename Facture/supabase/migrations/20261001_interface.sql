-- The legacy theme column remains the profession key for existing catalogs.
alter table public.companies add column if not exists theme text not null default 'plombier';
alter table public.companies add column if not exists ui_theme text not null default 'bleu';
alter table public.companies drop constraint if exists companies_ui_theme_check;
alter table public.companies add constraint companies_ui_theme_check
  check (ui_theme in ('bleu','violet','corail','citron','turquoise','peche','orange','bordeaux','cyan','sable'));
