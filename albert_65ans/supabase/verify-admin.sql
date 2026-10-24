-- Toutes les créations et suppressions de test sont annulées à la fin.
begin;
do $$
declare code text; participant text; result jsonb; original jsonb; label text;
begin
  select access_code into code from albert_private.settings where id;
  begin
    perform public.albert_admin_snapshot(null);
    raise exception 'Administration accessible sans mot de passe';
  exception when insufficient_privilege then null; end;
  begin
    perform public.albert_admin_remove_person('incorrect','thibaut');
    raise exception 'Suppression accessible sans mot de passe';
  exception when insufficient_privilege then null; end;
  begin
    perform public.albert_admin_restore_person('incorrect','thibaut');
    raise exception 'Restauration accessible sans mot de passe';
  exception when insufficient_privilege then null; end;
  label:='TEST Admin '||gen_random_uuid()::text;
  result:=public.albert_add_person(code,label);participant:=result->'person'->>'id';
  perform public.albert_save(code,participant,'[{"id":"s0q0","kind":"question","baseRevision":0,"data":{"answer":"Souvenir original","photos":[{"name":"photo.png","data":"data:image/png;base64,YQ=="}]}}]'::jsonb);
  select data into original from albert_private.records where person=participant and id='s0q0';
  perform public.albert_admin_remove_person('vasco',participant);
  perform public.albert_admin_remove_person('vasco',participant);
  if exists(select 1 from jsonb_array_elements(public.albert_people(code)->'people') p where p->>'id'=participant) then raise exception 'Personne supprimée visible dans le questionnaire'; end if;
  if exists(select 1 from jsonb_array_elements(public.albert_snapshot(code)->'records') r where r->>'person'=participant) then raise exception 'Réponses supprimées visibles dans le questionnaire'; end if;
  result:=public.albert_admin_snapshot('vasco');
  if not exists(select 1 from jsonb_array_elements(result->'archivedPeople') p where p->>'id'=participant) then raise exception 'Personne non restaurable'; end if;
  if not exists(select 1 from jsonb_array_elements(result->'archivedRecords') r where r->>'person'=participant) then raise exception 'Réponses originales perdues'; end if;
  begin
    perform public.albert_save(code,participant,'[{"id":"s0q1","kind":"question","baseRevision":0,"data":{"answer":"Interdit"}}]'::jsonb);
    raise exception 'Profil supprimé autorisé à sauvegarder';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.albert_add_person(code,label);
    raise exception 'Profil supprimé recréé sans administration';
  exception when invalid_parameter_value then null; end;
  perform public.albert_admin_restore_person('vasco',participant);
  if (select data from albert_private.records where person=participant and id='s0q0') is distinct from original then raise exception 'Données modifiées à la restauration'; end if;
  if not exists(select 1 from jsonb_array_elements(public.albert_snapshot(code)->'records') r where r->>'person'=participant) then raise exception 'Profil restauré invisible'; end if;
end;
$$;
rollback;
select 'OK : mot de passe contrôlé côté serveur, suppression, restauration, photos préservées, ancien profil bloqué, réponses originales intactes. Aucun test conservé.' as verification;
