import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../contact.js',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(url='https://test.orbytek.be/index.html',key='public-form-test-key'){
 const handlers={},calls=[],redirects=[];
 const fields={name:'Alice Test',email:'alice@example.com',phone:'',company:'',project:'Site web',message:'Test local uniquement.',website:''};
 const submit={disabled:true,textContent:'',setAttribute(){}},status={textContent:'',setAttribute(){}};
 const form={querySelector:()=>submit,reportValidity:()=>true,addEventListener:(event,fn)=>handlers[event]=fn};
 const dialog={querySelector:()=>form,showModal(){},close(){},addEventListener(){}};
 const elements={'contact-dialog':dialog,'contact-status':status,'open-contact-form':{addEventListener:(_,fn)=>handlers.open=fn},'close-contact-form':{addEventListener(){}}};
 class TestFormData extends FormData{constructor(){super();for(const [k,v]of Object.entries(fields))this.append(k,v);}}
 const window={ORBYTEK_CONTACT:{enabled:true,accessKey:key},location:{href:url,assign:target=>redirects.push(target)}};
 vm.runInNewContext(source,{window,document:{getElementById:id=>elements[id]},URL,crypto,FormData:TestFormData,AbortSignal,fetch:(url,options)=>{const pending=deferred();calls.push({url,options,...pending});return pending.promise;}});
 handlers.open();return {fields,submit,status,calls,redirects,send:()=>handlers.submit({preventDefault(){}})};
}
for(const url of ['https://test.orbytek.be/index.html','https://orbytek.be/','file:///C:/site/index.html'])test('one accepted Web3Forms request navigates directly to merci: '+url,async()=>{
 const h=harness(url),done=h.send();assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'https://api.web3forms.com/submit');
 const payload=JSON.parse(h.calls[0].options.body);assert.equal(payload.access_key,'public-form-test-key');assert.equal(payload.replyto,h.fields.email);assert.equal(payload.message,h.fields.message);assert.equal(payload.botcheck,'');
 assert.deepEqual(h.redirects,[]);h.calls[0].resolve(Response.json({success:true}));await done;assert.deepEqual(h.redirects,[new URL('merci.html',url).href]);
});
for(const scenario of ['network','timeout','http','invalid-json','false','string-false','missing-success'])test('no false confirmation and fields retained: '+scenario,async()=>{
 const h=harness(),done=h.send(),call=h.calls[0];
 if(scenario==='network'||scenario==='timeout')call.reject(Error(scenario));
 else if(scenario==='http')call.resolve(Response.json({success:true},{status:429}));
 else if(scenario==='invalid-json')call.resolve(new Response('<html>Error</html>'));
 else call.resolve(Response.json(scenario==='false'?{success:false}:scenario==='string-false'?{success:'false'}:{}));
 await done;assert.deepEqual(h.redirects,[]);assert.equal(h.fields.message,'Test local uniquement.');assert.equal(h.submit.disabled,false);assert.equal(h.submit.textContent,'Réessayer l’envoi →');
 const retry=h.send();assert.equal(JSON.parse(h.calls[1].options.body).reference,JSON.parse(call.options.body).reference);h.calls[1].resolve(Response.json({success:true}));await retry;
});
test('double click creates only one provider request',async()=>{
 const h=harness(),done=h.send();await h.send();assert.equal(h.calls.length,1);h.calls[0].resolve(Response.json({success:true}));await done;
});
test('missing key never sends and never navigates',async()=>{
 const h=harness(undefined,'');assert.equal(h.submit.disabled,true);await h.send();assert.equal(h.calls.length,0);assert.deepEqual(h.redirects,[]);
});
test('honeypot and missing mandatory fields send nothing',async()=>{
 const h=harness();h.fields.website='bot';await h.send();h.fields.website='';h.fields.message=' ';await h.send();assert.equal(h.calls.length,0);
});
test('changed contents after an unconfirmed attempt receive a new reference',async()=>{
 const h=harness(),first=h.send();h.calls[0].reject(Error('timeout'));await first;h.fields.message='Changed';const second=h.send();assert.notEqual(JSON.parse(h.calls[0].options.body).reference,JSON.parse(h.calls[1].options.body).reference);h.calls[1].resolve(Response.json({success:true}));await second;
});
test('main form has no old provider transport or hidden confirmation frames',()=>{
 const config=readFileSync(new URL('../contact-config.js',import.meta.url),'utf8');
 assert.doesNotMatch(source+config,/formsubmit|Promise.any|iframe|postMessage/i);
});
