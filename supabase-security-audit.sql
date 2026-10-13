-- Audit en lecture seule : exécuter intégralement dans le SQL Editor Supabase.
-- Aucun accès aux factures, clients, utilisateurs ou clés ; aucune modification.
-- Les policies/grants réels peuvent différer des migrations présentes dans Git.
-- Par défaut la Data API expose public ; adapter les schémas si nécessaire.
-- Source : https://supabase.com/docs/guides/database/postgres/row-level-security

-- 1. Tables applicatives : la RLS doit être active et les policies adaptées.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select_grant,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert_grant,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update_grant,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete_grant,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select_grant
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relrowsecurity, c.relname;

-- 2. Vérifier USING / WITH CHECK, les rôles et les policies supplémentaires.
-- USING (true) est prévu seulement pour le catalogue public de voitures en SELECT.
-- Plusieurs policies permissives se combinent par OR : une règle large peut
-- annuler la protection attendue d'une règle restrictive par utilisateur.
select schemaname, tablename, policyname, permissive, roles, cmd,
       qual as using_condition, with_check as check_condition
from pg_policies
where schemaname = 'public'
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 3. Fonctions SECURITY DEFINER accessibles : vérifier leurs contrôles internes.
-- La RLS seule ne protège pas les opérations réalisées par ces fonctions.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.proconfig as settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;

-- 4. Les vues peuvent contourner les policies des tables sous-jacentes.
-- Les vues exposées doivent être examinées, y compris leurs droits effectifs.
select n.nspname as schema_name, c.relname as view_name,
       c.relkind as view_kind, c.reloptions as options,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v', 'm')
order by c.relname;
