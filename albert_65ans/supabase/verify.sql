-- Vérification transactionnelle : toutes les écritures ci-dessous sont annulées.
begin;
do $$
declare code text; result jsonb; before_data jsonb; revision bigint; person_id text; test_name text;
begin
  select access_code into code from albert_private.settings where id;
  if (select count(*) from albert_private.questions) <> 165 then raise exception 'Nombre de questions incorrect'; end if;
  begin
    perform public.albert_snapshot('code-faux');
    raise exception 'Un mauvais code a été accepté';
  exception when insufficient_privilege then null; end;
  select data into before_data from albert_private.records where person='thibaut' and id='s0q0';
  select coalesce((select r.revision from albert_private.records r where person='maman' and id='s0q0'),0) into revision;
  result := public.albert_save(code,'maman',jsonb_build_array(jsonb_build_object(
    'id','s0q0','kind','question','baseRevision',revision,'data',jsonb_build_object('answer','TEST TRANSACTIONNEL','photos','[]'::jsonb))));
  if jsonb_array_length(result->'saved')<>1 then raise exception 'Enregistrement non effectué'; end if;
  if (select data from albert_private.records where person='thibaut' and id='s0q0') is distinct from before_data then raise exception 'Autre profil modifié'; end if;
  result := public.albert_save(code,'maman',jsonb_build_array(jsonb_build_object(
    'id','s0q0','kind','question','baseRevision',revision,'data',jsonb_build_object('answer','AUTRE VERSION'))));
  if jsonb_array_length(result->'conflicts')<>1 then raise exception 'Conflit non détecté'; end if;
  result := public.albert_save(code,'maman',jsonb_build_array(jsonb_build_object(
    'id','s0q0','kind','question','baseRevision',revision,'data',jsonb_build_object('answer','TEST TRANSACTIONNEL','photos','[]'::jsonb))));
  if jsonb_array_length(result->'saved')<>1 then raise exception 'Nouvelle tentative non idempotente'; end if;
  begin
    perform public.albert_save(code,'maman','[{"id":"s99q0","kind":"question","baseRevision":0,"data":{}}]'::jsonb);
    raise exception 'Question inconnue acceptée';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.albert_save(code,'autre','[]'::jsonb);
    raise exception 'Profil inconnu accepté';
  exception when invalid_parameter_value then null; end;
  if has_schema_privilege('anon','albert_private','usage') then raise exception 'Schéma privé accessible'; end if;
  if has_table_privilege('anon','albert_private.records','select') then raise exception 'Table privée accessible'; end if;
  if not has_function_privilege('anon','public.albert_snapshot(text)','execute') then raise exception 'Lecture RPC inaccessible'; end if;
  if not has_function_privilege('anon','public.albert_save(text,text,jsonb)','execute') then raise exception 'Sauvegarde RPC inaccessible'; end if;
  if has_table_privilege('anon','albert_private.people','select') then raise exception 'Participants accessibles sans code'; end if;
  test_name:='TEST Participant '||gen_random_uuid()::text;
  result:=public.albert_add_person(code,'  '||test_name||'  ');
  person_id:=result->'person'->>'id';
  if result->>'created'<>'true' or result->'person'->>'name'<>test_name then raise exception 'Participant non créé'; end if;
  result:=public.albert_add_person(code,lower(replace(test_name,' ','   ')));
  if result->>'created'<>'false' or result->'person'->>'id'<>person_id then raise exception 'Prénom dupliqué'; end if;
  result:=public.albert_save(code,person_id,'[{"id":"s0q1","kind":"question","baseRevision":0,"data":{"answer":"Souvenir du nouveau participant"}}]'::jsonb);
  if jsonb_array_length(result->'saved')<>1 then raise exception 'Nouveau profil non sauvegardé'; end if;
  if not exists(select 1 from jsonb_array_elements(public.albert_people(code)->'people') p where p->>'id'=person_id) then raise exception 'Participant non partagé'; end if;
  begin
    perform public.albert_add_person(code,E' \t\n ');
    raise exception 'Prénom vide accepté';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.albert_add_person('incorrect','Participant interdit');
    raise exception 'Création sans code acceptée';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
select 'OK : code familial, 165 questions, profils isolés, conflits, participants partagés, doublons, enregistrement des nouveaux profils et permissions. Aucune donnée de test conservée.' as verification;
