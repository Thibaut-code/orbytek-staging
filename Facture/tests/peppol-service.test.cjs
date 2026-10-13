const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto,createHmac}=require('node:crypto');
const SOURCE='11111111-1111-4111-8111-111111111111',LOCAL='22222222-2222-4222-8222-222222222222';
async function harness({sendStatus=200,sendTimeout=false,member='owner',webhook=false}={}){
 const domain=await import('../supabase/functions/_shared/peppol-domain.mjs'),calls=[];
 const doc={id:SOURCE,user_id:'owner',number:'F1',type:'facture',issue_date:'2026-10-12',due_date:'2026-11-12',issuer_snapshot:{iban:'BE68539007547034'},customer_snapshot:{name:'Client',street:'Rue 1',city:'Bruxelles',postal_code:'1000',country:'BE',vat:'BE0428643097',peppol_id:'0208:0428643097'}};
 const data={company_members:[{member_id:'actor',owner_id:'owner',role:member}],peppol_companies:[{user_id:'owner',environment:'playground',provider_id:'c_test',team_id:'t_test',verified:true}],documents:[doc],document_lines:[{document_id:SOURCE,user_id:'owner',name:'Conseil',quantity:1,unit_price:100,vat_rate:21,position:0}],peppol_documents:[],peppol_events:[],peppol_webhook_events:[]};
 function query(table){
  const filters=[];let operation='select',values,one=false,ignore=false;
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},order(){return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},insert(v){operation='insert';values=v;return q;},update(v){operation='update';values=v;return q;},upsert(v,o){operation='upsert';values=v;ignore=o?.ignoreDuplicates;return q;},then(resolve,reject){
   try {let rows=data[table]||[];let found=rows.filter(r=>filters.every(f=>f(r)));
    if(operation==='insert'){const v={id:LOCAL,...structuredClone(values)};rows.push(v);found=[v];}
    if(operation==='update')found.forEach(r=>Object.assign(r,structuredClone(values)));
    if(operation==='upsert'){let existing=rows.find(r=>values.digest?r.digest===values.digest:r.user_id===values.user_id&&r.environment===values.environment);if(!existing){existing={id:LOCAL,...structuredClone(values)};rows.push(existing);}else if(!ignore)Object.assign(existing,structuredClone(values));found=[existing];}
    data[table]=rows;return Promise.resolve({data:structuredClone(one?found[0]||null:found),error:null}).then(resolve,reject);
   }catch(e){return Promise.reject(e).then(resolve,reject);}
  }};return q;
 }
 const admin={auth:{getUser:async token=>token==='good'?{data:{user:{id:'actor'}}}:{data:{user:null},error:{}}},from:query,
  rpc:async(name,args)=>{
   calls.push({rpc:name});const prev=data.peppol_documents.find(r=>r.source_id===args.source);
   if(prev&&!['draft','failed'].includes(prev.status))return {error:{message:'Duplicate send blocked'}};
   const row={id:LOCAL,user_id:'owner',environment:'playground',source_id:SOURCE,direction:'outgoing',kind:args.body.documentType,number:'F1',payload:args.body,status:'sending',attempts:1};
   if(prev)Object.assign(prev,row);else data.peppol_documents.push(row);return {data:LOCAL};
  },storage:{from:()=>({upload:async()=>({data:{}}),createSignedUrl:async p=>({data:{signedUrl:'https://storage.invalid/'+p}})})}};
 const transmitted={id:'doc_sent',companyId:'c_test',teamId:'t_test',direction:'outgoing',type:'invoice',sentOverPeppol:true,deliveryStatus:'delivered',deliveries:[{channel:'peppol',status:'delivered'}],parsed:{invoiceNumber:'F1',buyer:{name:'Client'},lines:[],totals:{taxInclusiveAmount:'121'},currency:'EUR'},xml:'<Invoice/>',createdAt:'2026-10-12T10:00:00Z'};
 let handler;
 const context=vm.createContext({...domain,Request,Response,URL,TextEncoder,Uint8Array,AbortSignal,crypto:webcrypto,btoa,console,
  createClient:()=>admin,Deno:{env:{get:name=>({INTEGRATION_ACCOUNTS:JSON.stringify({owner:{recommandKey:'key',recommandSecret:'secret',peppolEnvironment:'test',testCompanyId:'c_test'}}),SUPABASE_URL:'https://db.invalid'})[name]||''},serve:fn=>handler=fn},
  fetch:async(url,options)=>{
   const u=new URL(url);calls.push({path:u.pathname,method:options.method,body:options.body&&JSON.parse(options.body)});
   if(u.pathname.endsWith('/send')){if(sendTimeout)throw Error('timeout');if(sendStatus!==200)return Response.json({errors:{document:'refused'}},{status:sendStatus});return Response.json({success:true,id:'doc_sent',companyId:'c_test',sentOverPeppol:true,deliveryStatus:'delivered'});}
   if(u.pathname.endsWith('/generate'))return Response.json({success:true,xml:'<Invoice/>'});
   if(u.pathname.endsWith('/render/pdf'))return new Response(new Uint8Array([37,80,68,70]));
   if(u.pathname.includes('/companies/'))return Response.json({company:{id:'c_test',teamId:'t_test',isVerified:true,isSmpRecipient:true,enterpriseNumber:'0428643097'}});
   if(u.pathname.includes('/documents/'))return Response.json({document:transmitted});
   throw Error('Unexpected provider request: '+url);
  }});
 for(const file of ['_shared/peppol-service.ts',webhook?'peppol-webhook/index.ts':'peppol/index.ts']){
  const code=fs.readFileSync('supabase/functions/'+file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(stripTypeScriptTypes(code),context);
 }
 const request=(body,token='good')=>handler(new Request('https://db.invalid/functions/v1/peppol',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://orbytek.be'},body:JSON.stringify(body)}));
 return {request,handler,data,calls,transmitted};
}
const send={action:'send',sourceId:SOURCE,confirm:true,environment:'playground'};
test('envoi validé, archivé et protégé contre un second clic',async()=>{
 const h=await harness();assert.equal((await h.request(send)).status,200);assert.equal(h.data.peppol_documents[0].status,'delivered');assert.match(h.data.peppol_documents[0].xml_path,/\.xml$/);assert.match(h.data.peppol_documents[0].pdf_path,/\.pdf$/);
 assert.equal((await h.request(send)).status,400);assert.equal(h.calls.filter(c=>c.path?.endsWith('/send')).length,1);
});
test('le timeout ne permet pas un renvoi automatique',async()=>{
 const h=await harness({sendTimeout:true});assert.equal((await h.request(send)).status,400);assert.equal(h.data.peppol_documents[0].status,'unknown');await h.request(send);assert.equal(h.calls.filter(c=>c.path?.endsWith('/send')).length,1);
});
test('un rejet explicite est corrigible et son erreur est conservée',async()=>{
 const h=await harness({sendStatus:422});await h.request(send);assert.equal(h.data.peppol_documents[0].status,'failed');assert.match(h.data.peppol_documents[0].failure[0].message,/refused/);assert.equal(h.data.documents[0].peppol,null);
});
test('un JWT invalide, une autre société ou une confirmation absente ne transmet rien',async()=>{
 const h=await harness();assert.equal((await h.request(send,'bad')).status,401);assert.equal((await h.request({...send,confirm:false})).status,400);
 h.data.documents[0].user_id='other';assert.equal((await h.request(send)).status,400);assert.equal(h.calls.filter(c=>c.path?.endsWith('/send')).length,0);
});
test('un employé ne modifie pas l’activation et un téléchargement extérieur est refusé',async()=>{
 const h=await harness({member:'employee'});assert.equal((await h.request({action:'receive',confirm:true})).status,400);
 h.data.peppol_documents.push({id:LOCAL,user_id:'other',environment:'playground',provider_id:'doc_other'});
 assert.equal((await h.request({action:'download',id:LOCAL,type:'xml'})).status,400);assert.equal(h.calls.length,0);
});
test('les webhooks signés se rejouent sans dupliquer, les signatures invalides sont refusées',async()=>{
 const h=await harness({webhook:true});h.transmitted.direction='incoming';h.transmitted.readAt='2026-10-12';
 const body=JSON.stringify({eventType:'document.received',companyId:'c_test',teamId:'t_test',documentId:'doc_sent'});
 const secret=require('node:crypto').createHash('sha256').update('secret:facture-facile-webhook-v1:c_test').digest('hex');
 const signature='sha256='+createHmac('sha256',secret).update(body).digest('hex');
 const request=signature=>new Request('https://db.invalid/functions/v1/peppol-webhook',{method:'POST',body,headers:{'X-Signature':signature}});
 assert.equal((await h.handler(request('invalid'))).status,401);assert.equal(h.data.peppol_webhook_events.length,0);
 assert.equal((await h.handler(request(signature))).status,200);assert.equal((await h.handler(request(signature))).status,200);assert.equal(h.data.peppol_documents.length,1);assert.equal(h.data.peppol_webhook_events.length,1);assert(h.data.peppol_webhook_events[0].processed_at);
});
