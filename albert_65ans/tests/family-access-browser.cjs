// Régression : nouvel appareil, ancien code mémorisé et ancien lien d’invitation.
// Les inscriptions sont simulées ; aucune donnée réelle n’est créée.
const assert=require('node:assert/strict'),path=require('node:path');
let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.ALBERT_NODE_MODULES||'C:/Users/FlowUP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));}
(async()=>{
  const browser=await pw.chromium.launch({channel:'msedge',headless:true});
  try{
    for(const scenario of ['nouvel appareil','ancien code mémorisé','ancien lien']){
      const context=await browser.newContext();context.setDefaultTimeout(12000);
      const people=[{id:'thibaut',name:'Thibaut'}],requests=[],errors=[];
      await context.route('https://dpwmxzptfgmkjecpuikb.supabase.co/**',async route=>{
        const name=route.request().url().split('/').pop(),body=route.request().postDataJSON();requests.push({name,body});
        if(body.p_code!=='courtois')return route.fulfill({status:403,json:{code:'42501',message:'Code familial incorrect'}});
        if(name==='albert_people')return route.fulfill({json:{people}});
        if(name==='albert_add_person'){const person={id:'p-'+require('node:crypto').randomUUID(),name:body.p_name};people.push(person);return route.fulfill({json:{person,created:true}});}
        if(name==='albert_snapshot')return route.fulfill({json:{people,records:[]}});
        throw Error('Requête inattendue : '+name);
      });
      if(scenario!=='nouvel appareil')await context.addInitScript(()=>localStorage.setItem('albert-v2-code','ancien-code'));
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4189/'+(scenario==='ancien lien'?'#famille=ancien-lien':''));
      await page.locator('#addPerson').click();
      assert.equal(await page.locator('#newPersonCodeField').isVisible(),false);
      await page.locator('#newPersonName').fill('Nouvelle personne');
      await page.locator('#createPerson').click();await page.locator('#workspace').waitFor({state:'visible'});
      assert.match(await page.locator('#changePerson').innerText(),/Nouvelle personne/);
      assert(requests.some(r=>r.name==='albert_add_person'));
      assert(requests.every(r=>r.body.p_code==='courtois'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('albert-v2-code')),'courtois');
      assert.equal(new URL(page.url()).hash,'');
      await page.locator('#changePerson').click();await page.locator('[data-person="thibaut"]').click();
      await page.locator('#workspace').waitFor({state:'visible'});
      assert.match(await page.locator('#changePerson').innerText(),/Thibaut/);
      assert.deepEqual(errors,[]);console.log('OK : '+scenario+' — inscription et ouverture avec courtois sans saisie du code.');
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
