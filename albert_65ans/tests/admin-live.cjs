// Accès réel en lecture seule ; aucune suppression et aucun profil de test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.ALBERT_NODE_MODULES||'C:/Users/FlowUP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));}
(async()=>{
  const env={window:{}};vm.runInNewContext(fs.readFileSync('config.js','utf8'),env);vm.runInNewContext(fs.readFileSync('questionnaire-data.js','utf8'),env);const cfg=env.window.ALBERT_CONFIG;
  const wrong=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/albert_admin_snapshot`,{method:'POST',headers:{apikey:cfg.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({p_password:'incorrect'})});assert([401,403].includes(wrong.status));assert.equal((await wrong.json()).code,'42501');
  const browser=await pw.chromium.launch({channel:'msedge',headless:true});
  try{const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.ALBERT_LIVE_URL||'http://127.0.0.1:4189/')+'admin.html');
    await page.locator('#adminPassword').fill('vasco');const result=page.waitForResponse(r=>r.url().endsWith('/rpc/albert_admin_snapshot'));await page.locator('#adminEnter').click();assert.equal((await result).status(),200);await page.locator('#adminWorkspace').waitFor({state:'visible'});
    // Le snapshot avec photos peut dépasser le cache réseau de l’inspecteur.
    // Vérifier les compteurs dans la page sans recopier les souvenirs et photos via CDP.
    const expected=await page.evaluate(()=>{const data=window.AlbertAdmin.compile(snapshot,window.ALBERT_DATA.sections);return {stats:data.stats,merged:data.questions.length+data.scenes.length,photos:data.gallery.length,people:data.people.length,characters:snapshot.characters.length,referencePhotos:snapshot.characters.reduce((n,c)=>n+c.photos.filter(p=>window.AlbertAdmin.safePhoto(p.data)).length,0)};});
    assert.equal(await page.locator('#statPeople').innerText(),String(expected.stats.people));assert.equal(await page.locator('#statQuestions').innerText(),String(expected.stats.questions));assert.equal(await page.locator('#mergedList .merged-question').count(),expected.merged);
    await page.locator('[data-tab="photos"]').click();assert.equal(await page.locator('.gallery-card').count(),expected.photos);await page.locator('[data-tab="people"]').click();assert.equal(await page.locator('[data-delete-person]').count(),expected.people);
    await page.locator('[data-tab="characters"]').click();assert.equal(await page.locator('[data-edit-character]').count(),expected.characters);assert.equal(await page.locator('[data-character-photo]').count(),expected.referencePhotos);
    await page.locator('#adminLogout').click();await page.locator('#adminLogin').waitFor({state:'visible'});assert.deepEqual(errors,[]);
    console.log('OK : administration réelle accessible avec vasco, mauvais mot de passe refusé, regroupement, galerie, participants et fiches personnages avec leurs photos vérifiés. Aucune donnée modifiée.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
