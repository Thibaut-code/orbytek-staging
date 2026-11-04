import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const configSource=readFileSync(new URL('../contact-config.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../contact.js',import.meta.url),'utf8');
const co='https://formsubmit.co/ajax/thibaut@orbytek.be';
const io='https://formsubmit.io/f/4382ad7d-2454-4cc2-bf13-3991d13cc309';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const okCo=()=>Response.json({success:'true'});
const okIo=()=>Response.json({received:true,id:'received-test-id',processed:false},{status:202});
function harness(){
 const handlers={},calls=[],nodes=[],timers=new Map();let timerId=0;
 const fields={name:'Alice Test',email:'alice@example.com',phone:'',company:'',project:'Site web',message:'Demande de test locale.',website:''};
 const submit={disabled:true,textContent:''},status={textContent:'',setAttribute(){}};
 const form={querySelector:()=>submit,reportValidity:()=>true,addEventListener:(event,fn)=>{handlers.submit=fn;}};
 const dialog={querySelector:()=>form,addEventListener(){},showModal(){},close(){}};
 const elements={'contact-dialog':dialog,'contact-status':status,'open-contact-form':{addEventListener:(_,fn)=>{handlers.open=fn;}},'close-contact-form':{addEventListener(){}}};
 class TestFormData extends FormData {constructor(target){super();if(target)for(const [key,value]of Object.entries(fields))this.append(key,value);}}
 const window={location:{href:'https://orbytek.be/index.html'},addEventListener:(name,fn)=>{handlers[name]=fn;},removeEventListener:(name)=>{delete handlers[name];}};
 const document={getElementById:id=>elements[id],body:{append(){}},documentElement:{style:{}},createElement:tag=>{
  const node={tag,children:[],contentWindow:{},append(...items){this.children.push(...items);},remove(){this.removed=true;},focus(){}};
  node.submit=()=>{
   const frame=nodes.find(n=>n.name===node.target),body=new FormData();
   for(const input of node.children)body.append(input.name,input.value);
   const timeout=()=>{for(const fn of [...timers.values()])fn();};
   calls.push({url:node.action,options:{method:node.method,body},frame,relay:node,reject:timeout,
    resolve:async response=>{let result;try{result=await response.json();}catch{return timeout();}
     if(response.ok&&result.received===true)handlers.message?.({origin:'https://orbytek.be',source:frame.contentWindow,data:{type:'orbytek-contact-received'}});else timeout();
    }});
  };
  nodes.push(node);return node;
 }};
 const context={window,document,URL,FormData:TestFormData,AbortSignal,crypto,
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
  fetch:(url,options)=>{const pending=deferred();calls.push({url,options,...pending});return pending.promise;}};
 vm.runInNewContext(configSource,context);vm.runInNewContext(source,context);handlers.open();
 return {fields,submit,status,calls,nodes,handlers,send:()=>handlers.submit({preventDefault(){}}),screens:()=>nodes.filter(n=>n.className==='contact-confirmation')};
}

for(const winner of ['co','io'])test(`${winner} success displays merci immediately while the other stays pending`,async()=>{
 const h=harness(),done=h.send();
 assert.deepEqual(h.calls.map(c=>c.url),[co,io]);assert.ok(h.submit.disabled);
 for(const c of h.calls)assert.equal(c.options.body.get('message'),h.fields.message);
 assert.equal(h.calls[0].options.keepalive,true);
 assert.equal(h.calls[0].options.body.get('reference'),h.calls[1].options.body.get('reference'));
 assert.equal(h.calls[0].options.body.get('_honey'),'');assert.equal(h.calls[1].options.body.get('_formsubmit_id'),'');
 const chosen=winner==='co'?0:1;await h.calls[chosen].resolve(chosen===0?okCo():okIo());await done;
 assert.equal(h.screens().length,1);assert.equal(h.screens()[0].src,'https://orbytek.be/merci.html');
 if(chosen===0)assert.ok(!h.calls[1].frame.removed);
 else assert.equal(h.calls[0].options.signal.aborted,false);
 await h.calls[1-chosen].resolve(chosen===0?okIo():okCo());await Promise.resolve();assert.equal(h.screens().length,1);
});

test('first failure never masks a later success',async()=>{
 const h=harness(),done=h.send();h.calls[0].reject(new Error('522'));await Promise.resolve();assert.equal(h.screens().length,0);
 await h.calls[1].resolve(okIo());await done;assert.equal(h.screens().length,1);
});

for(const failure of ['network','timeout','http','json','unconfirmed'])test(`both ${failure} failures keep inputs and allow retry`,async()=>{
 const h=harness(),done=h.send();
 for(const c of h.calls){
  if(failure==='network'||failure==='timeout')c.reject(new Error(failure));
  else if(failure==='http')await c.resolve(Response.json({success:true,received:true,id:'x'},{status:503}));
  else if(failure==='json')await c.resolve(new Response('<html>Cloudflare 522</html>'));
  else await c.resolve(Response.json({success:false,received:false}));
 }
 await done;assert.equal(h.screens().length,0);assert.equal(h.fields.message,'Demande de test locale.');
 assert.match(h.status.textContent,/Vos champs sont conservés/);assert.equal(h.submit.disabled,false);
 const retry=h.send();assert.equal(h.calls[2].options.body.get('reference'),h.calls[0].options.body.get('reference'));
 h.calls[2].resolve(okCo());await h.calls[3].resolve(okIo());await retry;
});

test('double click cannot send four requests',async()=>{
 const h=harness(),done=h.send();await h.send();assert.equal(h.calls.length,2);
 h.calls[0].resolve(okCo());await h.calls[1].resolve(okIo());await done;
});

test('honeypot and invalid form send nothing',async()=>{
 const h=harness();h.fields.website='spam';await h.send();assert.equal(h.calls.length,0);
 h.fields.website='';h.fields.name='   ';await h.send();assert.equal(h.calls.length,0);
});

test('untrusted messages and ordinary iframe loads never confirm receipt',async()=>{
 const h=harness(),done=h.send(),frame=h.calls[1].frame;
 h.handlers.message({origin:'https://attacker.example',source:frame.contentWindow,data:{type:'orbytek-contact-received'}});
 h.handlers.message({origin:'https://orbytek.be',source:{},data:{type:'orbytek-contact-received'}});
 h.handlers.message({origin:'https://orbytek.be',source:frame.contentWindow,data:{type:'other'}});
 assert.equal(h.screens().length,0);assert.ok(!frame.removed);
 h.calls[0].reject(new Error('522'));await h.calls[1].resolve(okIo());await done;assert.equal(h.screens().length,1);
 assert.ok(frame.removed);
});

test('co request fits the 64 KiB keepalive quota at maximum input lengths',async()=>{
 const h=harness();Object.assign(h.fields,{name:'\uFFFF'.repeat(120),email:'a'.repeat(242)+'@example.com',phone:'\uFFFF'.repeat(80),company:'\uFFFF'.repeat(160),message:'\uFFFF'.repeat(5000)});
 const done=h.send(),call=h.calls[0];
 const length=(await new Request(call.url,{method:'POST',body:call.options.body}).arrayBuffer()).byteLength;
 assert.ok(length<65536,`request body: ${length}`);
 call.resolve(okCo());await h.calls[1].resolve(okIo());await done;
});

test('receipt bridge sends only a success flag and does nothing at top level',()=>{
 const bridge=readFileSync(new URL('../contact-receipt.js',import.meta.url),'utf8'),sent=[];
 const parent={postMessage:(data,target)=>sent.push({data,target})};
 vm.runInNewContext(bridge,{window:{parent}});assert.equal(sent.length,1);assert.equal(sent[0].data.type,'orbytek-contact-received');
 const top={postMessage(){throw Error('not expected');}};top.parent=top;vm.runInNewContext(bridge,{window:top});
});
