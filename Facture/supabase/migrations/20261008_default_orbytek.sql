-- Appliquer après 20261002_orbytek_interface.sql.
-- Seules les nouvelles entreprises reçoivent ce défaut : aucun compte existant
-- n'est modifié. Les préférences individuelles des membres restent prioritaires.
begin;
alter table public.companies alter column ui_theme set default 'orbytek';
commit;
