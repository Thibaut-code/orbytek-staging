import { adminClient, env, checked, configuration, actorScope, provider, ProviderError, companyRecord, refreshCompany, syncOne, archiveFile, ensureWebhook } from '../_shared/peppol-service.ts';
import { companyPayload, invoicePayload, deliveryState } from '../_shared/peppol-domain.mjs';

Deno.serve(async (req: Request) => {
  const cors:Record<string,string> = {'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const origin=req.headers.get('Origin');
  if (origin && ['https://orbytek.be','https://www.orbytek.be',...env('APP_ORIGIN').split(',').map(v=>v.trim())].includes(origin)) cors['Access-Control-Allow-Origin']=origin;
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée'},405);
  let sendId:string|null=null, admin:any, cfg:any, owner:string, sourceId:string|null=null, sendingStarted=false;
  try {
    admin=adminClient();
    const scope=await actorScope(admin,req); owner=scope.owner;
    const input=await req.json(), action=input.action;
    cfg=configuration(owner);
    let company=await companyRecord(admin,owner,cfg);
    const ownerOnly=()=>{if(!scope.isOwner)throw Error('Cette action est réservée au responsable de l’entreprise.');};
    const localDocument=async()=>{
      if(!/^[0-9a-f-]{36}$/i.test(input.id || ''))throw Error('Identifiant de document invalide.');
      const row=checked(await admin.from('peppol_documents').select('*').eq('id',input.id).eq('user_id',owner).eq('environment',cfg.mode).single());
      if(!row)throw Error('Document introuvable.');return row;
    };
    if(action==='status') {
      company=await refreshCompany(admin,company,cfg);
      if(scope.isOwner&&company.provider_id&&!company.webhook_id) {
        try {
          const hook=await ensureWebhook(cfg,company);
          company=checked(await admin.from('peppol_companies').update({webhook_id:hook.webhook?.id||null,webhook_error:null}).eq('user_id',owner).eq('environment',cfg.mode).select().single());
        }catch(error){company.webhook_error=String(error);}
      }
      if(!scope.isOwner)company={...company,verification_url:null};
      return reply({company,environment:cfg.mode,isOwner:scope.isOwner});
    }
    if(action==='activate') {
      ownerOnly();
      if(input.confirm!==true)throw Error('Confirmez votre mandat pour cette entreprise.');
      if(company.provider_id)return reply({company:await refreshCompany(admin,company,cfg)});
      if(company.state==='creating'||company.state==='unknown')throw Error('Création déjà engagée. Vérifiez le tableau de bord Recommand avant toute nouvelle création.');
      const biz=checked(await admin.from('companies').select('*').eq('user_id',owner).single());
      const payload=companyPayload(biz,input.receive===true);
      const claim=checked(await admin.from('peppol_companies').update({state:'creating',error:null}).eq('user_id',owner).eq('environment',cfg.mode).eq('state',company.state).select());
      if(!claim.length)throw Error('Activation déjà engagée.');
      try {
        const result=await provider(cfg,'/companies','POST',payload);
        if(!result.company?.id)throw Error('Réponse de création incomplète.');
        checked(await admin.from('peppol_companies').update({provider_id:result.company.id,team_id:result.company.teamId,state:'verification',verification_url:result.verificationUrl||null}).eq('user_id',owner).eq('environment',cfg.mode));
        company=await companyRecord(admin,owner,cfg);
        return reply({company:await refreshCompany(admin,company,cfg)});
      }catch(error) {
        checked(await admin.from('peppol_companies').update({state:error instanceof ProviderError&&error.status===400?'not_started':'unknown',error:String(error)}).eq('user_id',owner).eq('environment',cfg.mode));
        throw error;
      }
    }
    if(!company.provider_id)throw Error('Activez Peppol dans les paramètres avant de continuer.');
    if(action==='verify-company') {
      ownerOnly();const result=await provider(cfg,'/companies/'+encodeURIComponent(company.provider_id)+'/verify','POST',{});
      checked(await admin.from('peppol_companies').update({verification_url:result.verificationUrl||null}).eq('user_id',owner).eq('environment',cfg.mode));
      return reply({verificationUrl:result.verificationUrl});
    }
    if(action==='receive') {
      ownerOnly();if(input.confirm!==true)throw Error('Confirmez l’activation de la réception.');
      await provider(cfg,'/companies/'+encodeURIComponent(company.provider_id),'PUT',{isSmpRecipient:true});
      return reply({company:await refreshCompany(admin,company,cfg)});
    }
    if(action==='webhook') {
      ownerOnly();const hook=await ensureWebhook(cfg,company);
      checked(await admin.from('peppol_companies').update({webhook_id:hook.webhook?.id||null,webhook_error:null}).eq('user_id',owner).eq('environment',cfg.mode));
      return reply({success:true});
    }
    if(action==='verify-recipient') {
      if(!/^\d{4}:[^\s]{1,150}$/.test(input.address || ''))throw Error('Saisissez un identifiant Peppol valide, par exemple 0208: suivi du numéro BCE.');
      return reply(await provider(cfg,'/verify','POST',{peppolAddress:input.address,includeBusinessCard:true}));
    }
    if(action==='sync') {
      company=await refreshCompany(admin,company,cfg);
      const page=Math.max(1,Math.min(100000,Number(input.page)||1));
      // Pagination is explicit: every page can be resumed without rereading the entire mailbox.
      const result=await provider(cfg,`/documents?companyId=${encodeURIComponent(company.provider_id)}&limit=4&page=${page}`);
      const errors=[];
      for(const item of result.documents || []) {
        try {await syncOne(admin,cfg,company,item.id);} catch(error){errors.push({id:item.id,error:String(error)});}
      }
      // Stuck sends are uncertain, never silently requeued. Sync can subsequently reconcile their business number.
      checked(await admin.from('peppol_documents').update({status:'unknown',failure:[{message:'Confirmation absente. Synchronisez l’historique avant toute action.'}]}).eq('user_id',owner).eq('environment',cfg.mode).eq('status','sending').lt('updated_at',new Date(Date.now()-120000).toISOString()));
      return reply({page,hasMore:page*4 < (result.pagination?.total || 0),errors});
    }
    if(action==='refresh') {
      const row=await localDocument();
      if(!row.provider_id)throw Error('Synchronisez l’historique pour retrouver cette transmission chez Recommand.');
      return reply({document:await syncOne(admin,cfg,company,row.provider_id)});
    }
    if(action==='review') {
      const row=await localDocument();if(row.direction!=='incoming')throw Error('Suivi réservé aux documents reçus.');
      const patch:any={updated_at:new Date().toISOString()};
      if(input.read===true)patch.read_at=new Date().toISOString();
      if(input.review!==undefined){if(!['to_review','verified','disputed'].includes(input.review))throw Error('État invalide.');patch.review_state=input.review;}
      if(typeof input.paid==='boolean')patch.paid_at=input.paid?new Date().toISOString():null;
      checked(await admin.from('peppol_documents').update(patch).eq('id',row.id));
      checked(await admin.from('peppol_events').insert({user_id:owner,environment:cfg.mode,document_id:row.id,event_type:'review',detail:patch,actor_id:scope.actor}));
      return reply({success:true});
    }
    if(action==='correct') {
      const row=await localDocument();
      const source=checked(await admin.rpc('peppol_prepare_correction',{owner,target:row.id,actor:scope.actor}));
      return reply({sourceId:source});
    }
    if(action==='download') {
      const row=await localDocument(), type=input.type;
      if(!['xml','pdf'].includes(type))throw Error('Format invalide.');
      let path=row[type+'_path'];
      if(!path) {
        if(!row.provider_id)throw Error('Document non encore transmis.');
        // Verify ownership with the provider before retrieving the PDF or XML.
        const full=(await provider(cfg,'/documents/'+encodeURIComponent(row.provider_id))).document;
        if(full.companyId!==company.provider_id)throw Error('Accès au document refusé.');
        const bytes=type==='pdf'?await provider(cfg,'/documents/'+encodeURIComponent(row.provider_id)+'/render/pdf','GET',undefined,true):new TextEncoder().encode(full.xml || '');
        if(!bytes.length)throw Error('Fichier indisponible.');
        path=await archiveFile(admin,row,type,bytes);
      }
      const signed=checked(await admin.storage.from('peppol-archive').createSignedUrl(path,60,{download:row.number.replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+type}));
      return reply({url:signed.signedUrl});
    }
    if(action==='send'||action==='credit') {
      if(input.confirm!==true||input.environment!==cfg.mode)throw Error('Confirmez le document et son environnement avant l’envoi.');
      company=await refreshCompany(admin,company,cfg);
      if(!company.verified)throw Error('La vérification de l’entreprise doit être terminée avant l’envoi.');
      if(!/^[0-9a-f-]{36}$/i.test(input.sourceId || ''))throw Error('Facture invalide.');
      const document=checked(await admin.from('documents').select('*').eq('id',input.sourceId).eq('user_id',owner).single());
      if(document.type!=='facture')throw Error('Seules les factures peuvent être transmises.');
      const lines=checked(await admin.from('document_lines').select('*').eq('document_id',document.id).eq('user_id',owner).order('position'));
      let credit=null;
      if(action==='credit') {
        if(!String(input.reason || '').trim()||String(input.reason).length>2000)throw Error('Indiquez le motif de la note de crédit.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')||!Number.isFinite(Date.parse(input.date)))throw Error('Date invalide.');
        const previous=checked(await admin.from('peppol_documents').select('status').eq('source_id',document.id).eq('user_id',owner).eq('environment',cfg.mode).eq('kind','invoice').maybeSingle());
        if(!previous||!['sent','delivered'].includes(previous.status))throw Error('Transmettez d’abord la facture d’origine.');
        // One full credit per original invoice: repeated clicks cannot create multiple credits.
        credit={number:'NC-'+document.number,date:input.date,reason:String(input.reason).trim()};
      }
      const body=invoicePayload(document,lines,credit,input.taxTreatment);
      // Retain the legacy test result, but a legacy real send must be reconciled, never resent.
      if(!credit && document.peppol && !['generate','playground','production'].includes(document.peppol.mode))throw Error('Ancienne transmission détectée : synchronisez Recommand avant un nouvel envoi.');
      sendId=checked(await admin.rpc('peppol_claim_send',{owner,mode:cfg.mode,source:document.id,expected_doc:document,expected_lines:lines,body,actor:scope.actor}));
      sourceId=credit?null:document.id;
      // Server-side validation occurs before any request capable of transmitting.
      await provider(cfg,'/'+encodeURIComponent(company.provider_id)+'/generate','POST',body);
      sendingStarted=true;
      const sent=await provider(cfg,'/'+encodeURIComponent(company.provider_id)+'/send','POST',body);
      if(!sent.id || sent.companyId!==company.provider_id)throw Error('Confirmation incomplète : synchronisez avant de réessayer.');
      checked(await admin.from('peppol_documents').update({provider_id:sent.id,status:deliveryState(sent),provider_status:sent.deliveryStatus||null,envelope_id:sent.envelopeId||null,updated_at:new Date().toISOString()}).eq('id',sendId));
      const result=await syncOne(admin,cfg,company,sent.id);
      return reply({document:result});
    }
    return reply({error:'Action inconnue.'},400);
  }catch(error) {
    const message=error instanceof Error?error.message:'Service Peppol indisponible.';
    if(sendId && admin) {
      // Only an explicit validation refusal is safely retryable. Timeouts/5xx remain uncertain.
      const safe=!sendingStarted || (error instanceof ProviderError&&[400,422].includes(error.status));
      const current=await admin.from('peppol_documents').select('provider_id').eq('id',sendId).single();
      if(!current.error && !current.data?.provider_id) {
        await admin.from('peppol_documents').update({status:safe?'failed':'unknown',failure:[{message}],updated_at:new Date().toISOString()}).eq('id',sendId);
        if(safe&&sourceId)await admin.from('documents').update({peppol:null}).eq('id',sourceId).eq('user_id',owner!);
      }
    }
    return reply({error:message},/Connexion requise|Session invalide/.test(message)?401:400);
  }
});
