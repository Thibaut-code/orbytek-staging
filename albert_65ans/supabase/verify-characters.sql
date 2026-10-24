-- Vérification transactionnelle : aucune fiche de test n'est conservée.
begin;
do $$
declare result jsonb; character_id uuid;
begin
  begin
    perform public.albert_admin_save_character('incorrect',null,'Test','', '[]',0);
    raise exception 'Écriture sans mot de passe autorisée';
  exception when insufficient_privilege then null; end;
  result:=public.albert_admin_save_character('vasco',null,'TEST '||gen_random_uuid()::text,'Portrait récent','[{"name":"portrait.png","data":"data:image/png;base64,YQ=="}]',0);
  character_id:=(result->>'id')::uuid;
  if not exists(select 1 from jsonb_array_elements(public.albert_admin_snapshot('vasco')->'characters') c where c->>'id'=character_id::text) then raise exception 'Fiche absente du snapshot'; end if;
  begin
    perform public.albert_admin_save_character('vasco',null,result->>'name','','[]',0);
    raise exception 'Doublon autorisé';
  exception when unique_violation then null; end;
  perform public.albert_admin_save_character('vasco',character_id,result->>'name','Modifié','[]',1);
  begin
    perform public.albert_admin_save_character('vasco',character_id,result->>'name','Écrasement','[]',1);
    raise exception 'Écrasement concurrent autorisé';
  exception when serialization_failure then null; end;
  begin
    perform public.albert_admin_save_character('vasco',null,'Test image interdite','','[{"name":"x","data":"data:image/svg+xml;base64,YQ=="}]',0);
    raise exception 'Image interdite acceptée';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.albert_admin_delete_character('incorrect',character_id,2);
    raise exception 'Suppression non autorisée';
  exception when insufficient_privilege then null; end;
  perform public.albert_admin_delete_character('vasco',character_id,2);
end;
$$;
rollback;
select 'OK : fiches, photos, unicité, mot de passe et conflits vérifiés ; aucun test conservé.' as verification;
