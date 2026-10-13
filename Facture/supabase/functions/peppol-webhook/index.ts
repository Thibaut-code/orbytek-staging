import { adminClient,checked,configuration,webhookSecret,digest,syncOne,refreshCompany } from '../_shared/peppol-service.ts';
import { validSignature } from '../_shared/peppol-domain.mjs';
Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  let admin:any,key='';
  try {
    const raw=await req.text();
    if(raw.length>100000)return new Response('Payload too large',{status:413});
    const event=JSON.parse(raw);
    if(!event.companyId)return new Response('Invalid event',{status:400});
    admin=adminClient();
    // The untrusted company ID only selects a candidate. No event is stored before signature verification.
    const rows=checked(await admin.from('peppol_companies').select('*').eq('provider_id',event.companyId));
    let company:any,config:any;
    for(const candidate of rows) {
      const c=configuration(candidate.user_id);
      if(c.mode===candidate.environment&&await validSignature(raw,req.headers.get('X-Signature'),await webhookSecret(c,event.companyId))) {company=candidate;config=c;break;}
    }
    if(!company || (company.team_id&&event.teamId!==company.team_id))return new Response('Invalid signature or scope',{status:401});
    key=await digest(company.environment+':'+raw);
    checked(await admin.from('peppol_webhook_events').upsert({digest:key,user_id:company.user_id,environment:company.environment,payload:event},{onConflict:'digest',ignoreDuplicates:true}));
    const saved=checked(await admin.from('peppol_webhook_events').select('processed_at').eq('digest',key).single());
    if(saved.processed_at)return new Response('Already processed');
    // Fetch the current provider state, not the possibly reordered webhook state.
    if(['document.received','document.sent','document.delivery_status_changed'].includes(event.eventType)) {
      if(!event.documentId)throw Error('Missing document ID');
      await syncOne(admin,config,company,event.documentId);
    } else if(event.eventType==='company.verification') {
      await refreshCompany(admin,company,config);
      if(['rejected','error'].includes(event.status))checked(await admin.from('peppol_companies').update({state:event.status,error:event.errorMessage||'Vérification refusée',verified:false,reception_enabled:false}).eq('user_id',company.user_id).eq('environment',company.environment));
    }
    checked(await admin.from('peppol_webhook_events').update({processed_at:new Date().toISOString(),error:null}).eq('digest',key));
    return new Response('OK');
  }catch(error) {
    if(admin&&key)await admin.from('peppol_webhook_events').update({error:String(error).slice(0,4000)}).eq('digest',key);
    // Non-2xx asks Recommand to retry. Never acknowledge a non-durable event as processed.
    return new Response('Processing failed; retry required',{status:503});
  }
});
