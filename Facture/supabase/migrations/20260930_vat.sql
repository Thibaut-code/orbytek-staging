-- Gestion TVA belge : exécuter dans SQL Editor sur la base existante.
begin;
alter table public.documents add column if not exists vat_date date;
create table if not exists public.vat_purchases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 supplier text not null check (length(trim(supplier)) between 1 and 200),
 reference text not null check (length(trim(reference)) between 1 and 200),
 invoice_date date not null,
 tax_date date not null,
 net_amount numeric(14,2) not null check (net_amount between 0 and 999999999),
 vat_amount numeric(14,2) not null check (vat_amount between 0 and 999999999),
 deduction_percent numeric(5,2) not null default 100 check (deduction_percent between 0 and 100),
 category text not null check (category in ('81','82','83')),
 created_at timestamptz not null default now()
);
create index if not exists vat_purchases_user_date on public.vat_purchases(user_id,tax_date);
alter table public.vat_purchases enable row level security;
drop policy if exists own_vat_purchases on public.vat_purchases;
create policy own_vat_purchases on public.vat_purchases for all to authenticated
 using (auth.uid()=user_id) with check (auth.uid()=user_id);
revoke all on public.vat_purchases from anon;
grant select,insert,update,delete on public.vat_purchases to authenticated;
commit;
