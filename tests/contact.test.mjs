import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as domain from '../Facture/supabase/functions/_shared/contact-domain.mjs';

const id='49f75e8b-3467-49db-8ced-758763e95004';
const origin='https://orbytek.be';
const fields={id,name:'Alice',email:'alice@example.com',phone:'',company:'',project:'Site web',message:'Un site pour mon activité.',token:'challenge'};
const digest=async text=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
const checked=result=>{if(result.error)throw Error('database_unavailable');return result.data;};
function harness(name,options={}){
 let serve;const calls=[];
 const config={CONTACT_WORKER_TOKEN:'worker-secret',RESEND_API_KEY:'resend-secret',CONTACT_FROM:'Orbytek <contact@example.com>',CONTACT_TO:'owner@example.com',TURNSTILE_SECRET_KEY:'challenge-secret',CONTACT_HASH_SECRET:'hash-secret',...options.config};
 const db={from(){const chain={select(){return this;},eq(){return this;},async maybeSingle(){return {data:options.existing||null,error:options.dbError||null};}};return chain;},async rpc(name,args){calls.push({name,args});return {data:name==='orbytek_contact_claim'?(options.rows||[]):name==='orbytek_contact_enqueue'?(options.enqueue||'accepted'):null,error:options.dbError||null};}};
 const source=stripTypeScriptTypes(readFileSync(new URL(`../Facture/supabase/functions/${name}/index.ts`,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
 vm.runInNewContext(source,{...domain,Request,Response,URL,AbortSignal,TextEncoder,crypto,env:key=>config[key]||'',origins:()=>[origin],admin:()=>{calls.push({name:'admin'});return db;},checked,digest,Deno:{serve:fn=>serve=fn},fetch:async(url,init)=>{calls.push({name:'fetch',url,init});if(options.fetch)return options.fetch(url,init);return Response.json({success:true,hostname:'orbytek.be',action:'contact'});}});
 return {serve,calls};
}
function request(body=fields,headers={}){return new Request('https://example.invalid/contact',{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'203.0.113.2',...headers},body:JSON.stringify(body)});}
test('validation normalizes email and rejects invalid fields and header injection',()=>{
 assert.equal(domain.validateContact({...fields,email:' Alice@Example.com '},origin).data.email,'alice@example.com');
 for(const change of [{id:'bad'},{email:'a@example.com\r\nBcc: other@example.com'},{project:'Spam'},{message:'x'.repeat(5001)},{name:''},{phone:null}])assert.throws(()=>domain.validateContact({...fields,...change},origin));
 const payload=domain.emailPayload({...fields,to:'attacker@example.com'},'sender@example.com','owner@example.com');
 assert.deepEqual(payload.to,['owner@example.com']);assert.equal(payload.reply_to,fields.email);assert.ok(!payload.html);
});
test('request body is bounded even without content-length',async()=>{
 await assert.rejects(domain.readBody(request(),10),error=>error.status===413);
});
test('accepted response follows durable enqueue, with no email sent by reception',async()=>{
 const h=harness('orbytek-contact');const res=await h.serve(request());
 assert.equal(res.status,202);assert.deepEqual(await res.json(),{accepted:true,id});
 assert.equal(h.calls.at(-1).name,'orbytek_contact_enqueue');assert.equal(h.calls.filter(c=>c.name==='fetch').length,1);
 assert.equal(h.calls.at(-1).args.p_buckets.length,2);
});
test('origins, rate limits, database and captcha failures never acknowledge a saved request',async()=>{
 for(const [options,headers,status] of [[{}, {origin:'https://attacker.example'},403],[{dbError:{message:'private database error'}},{},503],[{enqueue:'limited'},{},429],[{fetch:async()=>Response.json({success:true,hostname:'attacker.example',action:'contact'})},{},400],[{fetch:async()=>Response.json({success:true,hostname:'orbytek.be',action:'other'})},{},400]]){
  const h=harness('orbytek-contact',options),res=await h.serve(request(fields,headers));assert.equal(res.status,status);const data=await res.json();assert.notEqual(data.accepted,true);assert.ok(!JSON.stringify(data).includes('private database error'));
  if(status!==429)assert.ok(!h.calls.some(c=>c.name==='orbytek_contact_enqueue'));
 }
});
test('a lost confirmation can be retried after captcha consumption, but changed payload conflicts',async()=>{
 const hash=await digest(JSON.stringify(domain.validateContact(fields,origin).data));
 const h=harness('orbytek-contact',{existing:{payload_hash:hash}});
 assert.equal((await h.serve(request({...fields,token:''}))).status,202);assert.ok(!h.calls.some(c=>c.name==='fetch'));
 assert.equal((await h.serve(request({...fields,message:'changed'}))).status,409);
});
const row={...fields,origin,lease_token:'lease'};
const workReq=token=>new Request('https://example.invalid/worker',{method:'POST',headers:{Authorization:`Bearer ${token}`}});
test('worker authorization and complete configuration required before claiming',async()=>{
 for(const [config,token,status] of [[{},'bad',401],[{RESEND_API_KEY:''},'worker-secret',503]]){
  const h=harness('orbytek-contact-worker',{config});assert.equal((await h.serve(workReq(token))).status,status);assert.equal(h.calls.length,0);
 }
});
test('worker retries transient failures with the same provider key and acknowledges successful sends',async()=>{
 for(const [providerStatus,retry,emailId] of [[503,true,null],[429,true,null],[401,false,null],[200,true,'provider-id']]){
  const h=harness('orbytek-contact-worker',{rows:[row],fetch:async()=>Response.json(providerStatus===200?{id:'provider-id'}:{error:'secret detail'},{status:providerStatus})});
  assert.equal((await h.serve(workReq('worker-secret'))).status,200);
  const sent=h.calls.find(c=>c.name==='fetch');assert.equal(sent.init.headers['Idempotency-Key'],`orbytek-contact/${id}`);
  assert.equal(JSON.parse(sent.init.body).to[0],'owner@example.com');
  const ack=h.calls.at(-1);assert.equal(ack.name,'orbytek_contact_finish');assert.equal(ack.args.p_retry,retry);assert.equal(ack.args.p_email_id,emailId);assert.equal(ack.args.p_lease,'lease');
 }
 const h=harness('orbytek-contact-worker',{rows:[row],fetch:async()=>{throw Error('timeout');}});await h.serve(workReq('worker-secret'));assert.equal(h.calls.at(-1).args.p_retry,true);
});
test('webhook signature verifies exact body, time and rotating signatures',async()=>{
 const raw=new TextEncoder().encode('test-only-signing-key'),secret=`whsec_${Buffer.from(raw).toString('base64')}`;
 const body=JSON.stringify({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:'provider-id'}}),stamp=Math.floor(Date.now()/1000).toString();
 const key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`event-1.${stamp}.${body}`))).toString('base64');
 const headers=new Headers({'svix-id':'event-1','svix-timestamp':stamp,'svix-signature':`v1,AAAA v1,${signature}`});
 assert.equal(await domain.verifyWebhook(secret,headers,body),true);
 assert.equal(await domain.verifyWebhook(secret,headers,body+' '),false);
 assert.equal(await domain.verifyWebhook(secret,headers,body,Date.now()+301000),false);
 const h=harness('orbytek-contact-webhook',{config:{RESEND_WEBHOOK_SECRET:secret}});
 assert.equal((await h.serve(new Request('https://example.invalid/webhook',{method:'POST',headers,body}))).status,204);
 assert.equal(h.calls.at(-1).args.p_status,'delivered');
 const bad=harness('orbytek-contact-webhook',{config:{RESEND_WEBHOOK_SECRET:secret}});
 assert.equal((await bad.serve(new Request('https://example.invalid/webhook',{method:'POST',headers,body:body+' '}))).status,401);assert.equal(bad.calls.length,0);
});
