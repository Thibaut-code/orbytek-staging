import {readBody,verifyWebhook} from '../_shared/contact-domain.mjs';
import {env,admin,checked} from '../_shared/contact-server.ts';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response(null,{status:405});
 try{
  const body=await readBody(req,100000),secret=env('RESEND_WEBHOOK_SECRET');
  if(!secret||!await verifyWebhook(secret,req.headers,body))return new Response(null,{status:401});
  const event=JSON.parse(body),states:Record<string,string>={'email.delivered':'delivered','email.bounced':'bounced','email.failed':'failed','email.delivery_delayed':'delayed'};
  const status=states[event.type];if(!status)return new Response(null,{status:204});
  if(typeof event.data?.email_id!=='string'||!Number.isFinite(Date.parse(event.created_at)))return new Response(null,{status:400});
  checked(await admin().rpc('orbytek_contact_event',{p_event:req.headers.get('svix-id'),p_email:event.data.email_id,p_status:status,p_time:event.created_at}));
  return new Response(null,{status:204});
 }catch{return new Response(null,{status:503});}
});
