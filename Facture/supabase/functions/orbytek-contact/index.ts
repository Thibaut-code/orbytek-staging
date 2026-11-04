import {ContactError,validateContact,readBody,hmac} from '../_shared/contact-domain.mjs';
import {env,origins,admin,checked,digest} from '../_shared/contact-server.ts';
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',allowed=origins().includes(origin);
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'};
 if(allowed)headers['Access-Control-Allow-Origin']=origin;
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(!allowed)return reply({error:'Origine non autorisée.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 try{
  if(!env('TURNSTILE_SECRET_KEY')||!env('CONTACT_HASH_SECRET'))throw new ContactError('Le formulaire est momentanément indisponible. Contactez-nous par e-mail.',503);
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new ContactError('Format invalide.',415);
  const raw=await readBody(req);let input;try{input=JSON.parse(raw);}catch{throw new ContactError('Demande invalide.');}
  const {id,data}=validateContact(input,origin),hash=await digest(JSON.stringify(data));
  if(input.website)return reply({accepted:true,id},202);
  const db=admin();
  const existing=checked(await db.from('orbytek_contact_requests').select('payload_hash').eq('id',id).maybeSingle());
  if(existing){if(existing.payload_hash!==hash)throw new ContactError('Cette référence a déjà été utilisée.',409);return reply({accepted:true,id},202);}
  if(typeof input.token!=='string'||input.token.length>2048||!input.token)throw new ContactError('Validez la protection anti-robot.');
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env('TURNSTILE_SECRET_KEY'),response:input.token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new ContactError('La vérification anti-robot est indisponible. Réessayez.',503);
  const challenge=await response.json();
  const host=new URL(origin).hostname;
  if(!challenge.success||challenge.hostname!==host||challenge.action!=='contact')throw new ContactError('La vérification anti-robot a expiré. Réessayez.');
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if(!ip)throw new ContactError('La demande ne peut pas être vérifiée.',503);
  const hour=new Date().toISOString().slice(0,13),secret=env('CONTACT_HASH_SECRET');
  const buckets=await Promise.all([hmac(secret,`ip:${ip}:${hour}`),hmac(secret,`email:${data.email}:${hour}`)]);
  const result=checked(await db.rpc('orbytek_contact_enqueue',{p_id:id,p_hash:hash,p_data:data,p_buckets:buckets}));
  if(result==='limited')throw new ContactError('Trop de demandes. Réessayez plus tard ou contactez-nous par e-mail.',429);
  if(result!=='accepted')throw new ContactError('Veuillez recommencer cette demande.',409);
  // Acknowledge persistence, never claim the notification was delivered.
  return reply({accepted:true,id},202);
 }catch(error){const known=error instanceof ContactError;return reply({error:known?error.message:'La demande n’a pas pu être enregistrée. Réessayez ou contactez-nous par e-mail.'},known?error.status:503);}
});
