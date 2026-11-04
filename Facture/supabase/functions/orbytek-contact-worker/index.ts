import {emailPayload,retryable} from '../_shared/contact-domain.mjs';
import {env,admin,checked} from '../_shared/contact-server.ts';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response(null,{status:405});
 const secret=env('CONTACT_WORKER_TOKEN');
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 if(!env('RESEND_API_KEY')||!env('CONTACT_FROM')||!env('CONTACT_TO'))return Response.json({error:'missing_configuration'},{status:503});
 try{
  const db=admin(),rows=checked(await db.rpc('orbytek_contact_claim'));let sent=0,failed=0;
  for(const row of rows){
   let emailId=null,error=null,retry=true;
   try{
    const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':`orbytek-contact/${row.id}`},body:JSON.stringify(emailPayload(row,env('CONTACT_FROM'),env('CONTACT_TO'))),signal:AbortSignal.timeout(12000)});
    if(result.ok){const data=await result.json();if(typeof data.id!=='string')throw Error('incomplete_response');emailId=data.id;}
    else{error=`resend_http_${result.status}`;retry=retryable(result.status);}
   }catch{error='provider_timeout_or_network';}
   checked(await db.rpc('orbytek_contact_finish',{p_id:row.id,p_lease:row.lease_token,p_email_id:emailId,p_error:error,p_retry:retry}));
   if(emailId)sent++;else failed++;
  }
  return Response.json({processed:rows.length,sent,failed});
 }catch{return Response.json({error:'worker_failed'},{status:503});}
});
