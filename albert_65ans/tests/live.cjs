// Vérifications réelles en lecture seule. Le code reste en mémoire.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
(async()=>{
  const query=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npx --yes supabase db query --linked --project-ref dpwmxzptfgmkjecpuikb --file supabase/read-access.sql --output json'],{encoding:'utf8',windowsHide:true,timeout:30000});
  const text=query.stdout,code=text.match(/"access_code":\s*"([a-z0-9]+)"/)?.[1];if(!code)throw Error(`Code familial non récupéré (CLI ${query.status} : ${query.stderr?.replace(/[a-zA-Z0-9_-]{24,}/g,'[masqué]').slice(0,500)}).`);
  const context={window:{}};vm.runInNewContext(fs.readFileSync('config.js','utf8'),context);const cfg=context.window.ALBERT_CONFIG;
  async function request(name,body){return fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:cfg.supabaseKey,'Content-Type':'application/json',Origin:'https://orbytek.be'},body:JSON.stringify(body)});}
  const denied=await request('albert_snapshot',{p_code:'invalide'});assert([401,403].includes(denied.status));assert.equal((await denied.json()).code,'42501');
  const response=await request('albert_snapshot',{p_code:code});assert.equal(response.status,200);const data=await response.json();const C=require('../core.js');const thibautRows=data.records.filter(r=>r.person==='thibaut'&&r.kind==='question'&&C.hasContent(r.data));assert(thibautRows.length>0);
  const listed=await request('albert_people',{p_code:code});assert.equal(listed.status,200);assert((await listed.json()).people.some(p=>p.id==='thibaut'));
  const duplicate=await request('albert_add_person',{p_code:code,p_name:' THIBAUT '});assert.equal(duplicate.status,200);assert.deepEqual(await duplicate.json(),{person:{id:'thibaut',name:'Thibaut'},created:false});
  const emptySave=await request('albert_save',{p_code:code,p_person:'thibaut',p_changes:[]});assert.equal(emptySave.status,200);assert.deepEqual(await emptySave.json(),{saved:[],conflicts:[]});
  console.log('OK : API publique, accès familial, registre partagé, doublon reconnu, réponses de Thibaut et sauvegarde vide. Aucune donnée modifiée.');
  const path=require('node:path');let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.ALBERT_NODE_MODULES||'C:/Users/FlowUP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));}
  const browser=await pw.chromium.launch({channel:'msedge',headless:true});
  try{const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const base=process.env.ALBERT_LIVE_URL||'http://127.0.0.1:4189/';await page.goto(base+'#famille='+code);await page.locator('[data-person="maman"]').click();await page.locator('#workspace').waitFor({state:'visible'});assert.equal(await page.locator('.other-response').count(),data.records.filter(r=>r.person!=='maman'&&r.kind==='question'&&C.hasContent(r.data)).length);
    await page.locator('#changePerson').click();await page.locator('#welcome').waitFor({state:'visible'});await page.locator('#addPerson').click();await page.locator('#newPersonName').waitFor({state:'visible'});await page.locator('#cancelNewPerson').click();await page.locator('[data-person="thibaut"]').click();await page.locator('#workspace').waitFor({state:'visible'});assert.equal(await page.locator('#a-s0q0').inputValue(),data.records.find(r=>r.person==='thibaut'&&r.id==='s0q0')?.data.answer||'');assert.equal(await page.locator('#progressCount').innerText(),`${thibautRows.length} / 165`);assert.deepEqual(errors,[]);
    fs.mkdirSync('output',{recursive:true});await page.screenshot({path:'output/verification-reelle.png'});console.log('OK : ouverture réelle du lien familial, ajout de personne disponible, souvenirs existants et profils retrouvés, aucune erreur JavaScript.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
