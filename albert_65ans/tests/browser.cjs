// Parcours navigateur isolés. Aucune écriture sur Supabase réel.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.ALBERT_NODE_MODULES||'C:/Users/FlowUP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));}
const C=require('../core.js'),{chromium}=playwright;
const rows={'thibaut/s0q0':{person:'thibaut',id:'s0q0',kind:'question',revision:1,data:{answer:'20 octobre 1961',memory:'Date confirmée',photos:[]}}};
const people=[{id:'maman',name:'Maman'},{id:'jean-paul',name:'Jean-Paul'},{id:'thibaut',name:'Thibaut'}];
let requests=[],offline=false,errors=[];
async function mock(route){
  const name=route.request().url().split('/').pop(),body=route.request().postDataJSON();requests.push({name,body});
  if(offline)return route.abort('internetdisconnected');
  if(body.p_code!=='courtois')return route.fulfill({status:403,json:{code:'42501',message:'Code familial incorrect'}});
  if(name==='albert_people')return route.fulfill({json:{people}});
  if(name==='albert_add_person'){
    const clean=body.p_name.trim().replace(/\s+/g,' '),existing=people.find(p=>p.name.toLocaleLowerCase('fr')===clean.toLocaleLowerCase('fr'));
    if(existing)return route.fulfill({json:{person:existing,created:false}});
    const person={id:'p-'+require('node:crypto').randomUUID(),name:clean};people.push(person);return route.fulfill({json:{person,created:true}});
  }
  if(name==='albert_snapshot')return route.fulfill({json:{people,records:Object.values(rows)}});
  if(name!=='albert_save')throw Error('Unexpected endpoint');
  const result={saved:[],conflicts:[]};
  for(const change of body.p_changes){const k=C.key(body.p_person,change.id),old=rows[k];if((old?.revision||0)!==change.baseRevision){result.conflicts.push(old);continue;}rows[k]={person:body.p_person,id:change.id,kind:change.kind,data:change.data,revision:(old?.revision||0)+1};result.saved.push(rows[k]);}
  return route.fulfill({json:result});
}
async function login(context,person){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('http://127.0.0.1:4189/');await page.locator(`[data-person="${person}"]`).click();await page.locator('#workspace').waitFor({state:'visible'});return page;}
async function save(page){await page.locator('#saveNow').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Enregistré en ligne'));}
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const a=await browser.newContext({viewport:{width:1440,height:1080}}),b=await browser.newContext({viewport:{width:390,height:844}});a.setDefaultTimeout(12000);b.setDefaultTimeout(12000);
  await a.route('https://dpwmxzptfgmkjecpuikb.supabase.co/**',mock);await b.route('https://dpwmxzptfgmkjecpuikb.supabase.co/**',mock);
  try{
    const welcome=await a.newPage();await welcome.goto('http://127.0.0.1:4189/');assert.equal(await welcome.locator('#workspace').isVisible(),false);
    fs.mkdirSync(path.join(__dirname,'../output'),{recursive:true});await welcome.screenshot({path:path.join(__dirname,'../output/accueil-desktop.png'),fullPage:true});await welcome.close();
    const maman=await login(a,'maman');console.log('Profils : Maman ouverte');assert.equal(await maman.locator('.qcard').count(),165);
    await maman.locator('#q-s0q0 [data-copy="agree"]').click();assert.equal(await maman.locator('#a-s0q0').inputValue(),'20 octobre 1961');assert.equal(await maman.locator('#a-s0q0').getAttribute('readonly'),'');await save(maman);
    console.log('Accord de Maman enregistré');const jean=await login(b,'jean-paul');assert.match(await jean.locator('#q-s0q0 .others').innerText(),/Maman/);
    await jean.locator('#q-s0q0 [data-source="maman"][data-copy="precision"]').click();await jean.locator('#a-s0q0').fill('Le 20 octobre, à vérifier sur le livret.');await save(jean);
    assert.equal(rows['maman/s0q0'].data.answer,'20 octobre 1961');assert.equal(rows['thibaut/s0q0'].data.answer,'20 octobre 1961');
    console.log('Précision de Jean-Paul enregistrée');await maman.locator('#saveNow').click();await maman.waitForFunction(()=>document.querySelector('#q-s0q0 .others').textContent.includes('Jean-Paul'));
    await jean.locator('#addAnecdote').click();const anecdote=jean.locator('.scene').last();assert.equal(await anecdote.locator('input[type=text]').count(),0);await anecdote.locator('textarea').fill('Le fou rire au bord de la mer.');await save(jean);
    await jean.locator('#addDialog').click();const scene=jean.locator('.scene').last();assert.equal(await scene.locator('input[type=text]').count(),4);await scene.locator('[data-field="when"]').fill('À la mer, en été');await scene.locator('[data-field="words"]').fill('Albert : On y va !');await save(jean);
    await maman.locator('#saveNow').click();await maman.waitForFunction(()=>document.querySelector('#sceneList').textContent.includes('Le fou rire au bord de la mer.'));assert.equal(await maman.locator('#sceneList textarea').count(),0);console.log('Conversations et anecdotes partagées');
    // Brouillon hors ligne, reprise après retour du réseau, sauvegarde automatique à 60 s.
    offline=true;await jean.locator('#a-s0q1').fill('Couillet, souvenir hors connexion');await jean.clock.runFor(250);await jean.locator('#saveNow').click();await jean.waitForFunction(()=>document.querySelector('#status').textContent.includes('partage en attente'));assert(!rows['jean-paul/s0q1']);
    offline=false;await jean.clock.fastForward(60000);await jean.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Enregistré en ligne'));assert.equal(rows['jean-paul/s0q1'].data.answer,'Couillet, souvenir hors connexion');
    // Deux appareils du même profil : conflit affiché, pas d’écrasement silencieux.
    await jean.locator('#a-s0q1').fill('Mon brouillon concurrent');rows['jean-paul/s0q1']={...rows['jean-paul/s0q1'],revision:2,data:{answer:'Autre appareil',photos:[]}};await jean.locator('#saveNow').click();await jean.locator('#q-s0q1 .conflict').waitFor({state:'visible'});assert.equal(rows['jean-paul/s0q1'].data.answer,'Autre appareil');assert.equal(await jean.locator('#a-s0q1').inputValue(),'Mon brouillon concurrent');await jean.locator('#q-s0q1 [data-resolve="keep"]').click();await jean.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Enregistré en ligne'));assert.equal(rows['jean-paul/s0q1'].data.answer,'Mon brouillon concurrent');
    await jean.locator('#search').fill('chorale');assert.equal(await jean.locator('#section-0').isVisible(),false);assert.equal(await jean.locator('#section-2').isVisible(),true);await jean.locator('#search').fill('');
    await jean.locator('#collapse').click();assert.equal(await jean.locator('#form>.section[open]').count(),0);await jean.locator('#section-0>summary').click();
    assert.equal(await jean.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await jean.evaluate(()=>scrollTo(0,0));await jean.screenshot({path:path.join(__dirname,'../output/questionnaire-mobile.png'),fullPage:false});await maman.evaluate(()=>scrollTo(0,0));await maman.screenshot({path:path.join(__dirname,'../output/questionnaire-desktop.png'),fullPage:false});
    // Photo compressée et sauvegardée, puis retirée uniquement dans le profil actif.
    await maman.locator('#f-s0q0').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(__dirname,'../output/accueil-desktop.png'))});await maman.locator('#q-s0q0 .own-photos img').waitFor();await save(maman);assert.equal(rows['maman/s0q0'].data.photos.length,1);await maman.locator('#q-s0q0 [data-remove-photo]').click();await save(maman);assert.equal(rows['maman/s0q0'].data.photos.length,0);
    // Export réimportable et changement de profil sans fuite de champs éditables.
    const download=maman.waitForEvent('download');await maman.locator('.backup>summary').click();await maman.locator('#export').click();assert.match((await download).suggestedFilename(),/maman/);
    await maman.locator('#changePerson').click();await maman.locator('#welcome').waitFor({state:'visible'});await maman.locator('[data-person="thibaut"]').click();await maman.locator('#workspace').waitFor({state:'visible'});assert.equal(await maman.locator('#a-s0q0').inputValue(),'20 octobre 1961');
    // Un nouveau participant rejoint la liste et répond avec son propre profil.
    await jean.locator('#changePerson').click();await jean.locator('#welcome').waitFor({state:'visible'});await jean.locator('#addPerson').click();await jean.locator('#newPersonName').fill('  Élodie  ');await jean.locator('#createPerson').click();await jean.locator('#workspace').waitFor({state:'visible'});assert.match(await jean.locator('#changePerson').innerText(),/Élodie/);
    const newcomer=people.find(p=>p.name==='Élodie');assert(newcomer);await jean.locator('#a-s0q1').fill('Mon souvenir personnel');await save(jean);assert.equal(rows[C.key(newcomer.id,'s0q1')].data.answer,'Mon souvenir personnel');assert.equal(rows['jean-paul/s0q1'].data.answer,'Mon brouillon concurrent');
    await maman.locator('#changePerson').click();await maman.locator('#welcome').waitFor({state:'visible'});await maman.locator(`[data-person="${newcomer.id}"]`).waitFor({state:'visible'});await maman.locator(`[data-person="${newcomer.id}"]`).click();await maman.locator('#workspace').waitFor({state:'visible'});assert.equal(await maman.locator('#a-s0q1').inputValue(),'Mon souvenir personnel');
    await jean.locator('#changePerson').click();await jean.locator('#welcome').waitFor({state:'visible'});await jean.locator('#addPerson').click();await jean.locator('#newPersonName').fill('élodie');await jean.locator('#createPerson').click();await jean.locator('#workspace').waitFor({state:'visible'});assert.equal(people.filter(p=>p.name==='Élodie').length,1);assert.equal(await jean.locator('#a-s0q1').inputValue(),'Mon souvenir personnel');
    await jean.locator('#changePerson').click();await jean.locator('#welcome').waitFor({state:'visible'});assert.equal(await jean.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await jean.screenshot({path:path.join(__dirname,'../output/participants-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('OK : profils partagés, ajout de participant sur mobile, doublons évités, réponses du nouveau profil retrouvées sur un autre appareil ; parcours précédents préservés.');console.log(requests.filter(r=>r.name==='albert_save').length+' sauvegardes simulées ; aucune écriture sur Supabase réel.');
  }catch(error){for(const context of [a,b])for(const page of context.pages()){console.error('Page :',await page.locator('body').innerText().then(t=>t.slice(0,3500)));console.error('Erreurs JS :',errors);await page.screenshot({path:path.join(__dirname,'../output/erreur.png')}).catch(()=>{});}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
