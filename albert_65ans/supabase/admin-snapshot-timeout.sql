-- Le chargement complet inclut les photos de référence des personnages.
-- Délai réservé à cette fonction ; les limites des autres accès restent inchangées.
begin;
alter function public.albert_admin_snapshot(text) set statement_timeout='15s';
notify pgrst,'reload schema';
commit;
