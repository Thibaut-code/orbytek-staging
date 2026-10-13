// Isolated browser checks: no connection to Supabase or Recommand, only synthetic fixtures.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="https:[^"]+"><\/script>/g,'').replace('<script src="config.js"></script>','');
const setup=`
account={id:'peppol-preview',user_metadata:{full_name:'Thibaut'}};company={name:'Orbytek',country:'BE'};
teamContext={owner_id:account.id,role:'owner'};dataState='ready';
clients=[];docs=[{id:'F-2026-001',dbId:'11111111-1111-4111-8111-111111111111',type:'facture',date:'2026-10-12',due:'2026-11-12',customer:{name:'Client démo',peppol_id:'0208:0428643097'},lines:[{name:'Conseil',qty:1,price:100,tax:21}]}];
const fixtureRows=Array.from({length:13},(_,i)=>({id:'22222222-2222-4222-8222-'+String(i).padStart(12,'0'),direction:'incoming',kind:i===12?'creditNote':'invoice',number:'INV-2026-'+(i+1),party_name:i===0?'Électricité démo':i===1?'<img src=x onerror=alert(1)>':'Fournisseur '+(i+1),party_vat:'BE0428643097',amount:121+i,currency:'EUR',due_date:'2026-11-12',status:'received',provider_id:'doc_'+i,created_at:'2026-10-12T10:00:00Z',read_at:i%2?null:'2026-10-12T10:00:00Z',review_state:'to_review',parsed:{lines:[{name:'Conseil',quantity:'1',netPriceAmount:'100',vat:{percentage:'21'}}]},failure:[]}));
peppolState={scope:peppolScope(),phase:'ready',rows:fixtureRows,events:[],company:{provider_id:'c_demo',verified:true,reception_enabled:true},environment:'playground',error:'',isOwner:true};
peppolTab='incoming';
window.apiCalls=[];db={functions:{invoke:async(name,{body})=>{window.apiCalls.push(body);return {data:{isValid:true,companyName:'Test'}}}}};
applyInterface('bleu');location.hash='peppol';render();
`;
html=html.replace('</body>',`<script>${setup}</script></body>`);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PEPPOL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1536,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.peppol-page').waitFor();
 assert.equal(await page.locator('#peppol-table tbody tr').count(),10);
 await page.getByRole('button',{name:'Suivant',exact:true}).click();assert.equal(await page.locator('#peppol-table tbody tr').count(),3);
 await page.getByRole('searchbox',{name:'Rechercher une facture Peppol'}).fill('electricite');assert.equal(await page.locator('#peppol-table tbody tr').count(),1);assert.match(await page.locator('#peppol-table').textContent(),/Électricité/);
 await page.getByRole('searchbox',{name:'Rechercher une facture Peppol'}).fill('');assert.equal(await page.locator('.peppol-party img').count(),0);
 await page.evaluate(()=>{peppolState.rows[1].party_name='Atelier démo';});
 const themes=await page.evaluate(()=>Object.keys(UI_THEMES));
 const screenshots=path.join(root,'output','peppol');fs.mkdirSync(screenshots,{recursive:true});
 for(const theme of themes){
  await page.evaluate(t=>{applyInterface(t);render();},theme);
  assert.equal(await page.locator('.peppol-page h1').textContent(),' Peppol');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,theme+' overflow');
  if(['bleu','violet','orbytek'].includes(theme))await page.screenshot({path:path.join(screenshots,theme+'.png'),fullPage:true});
 }
 await page.getByRole('button',{name:'Paramètres',exact:true}).click();assert.match(await page.locator('.peppol-settings').textContent(),/Réception activée/);
 await page.getByRole('button',{name:'Factures émises',exact:true}).click();await page.getByRole('button',{name:'Envoyer',exact:true}).click();
 assert.match(await page.locator('dialog[open]').textContent(),/PLAYGROUND/);assert.equal((await page.evaluate(()=>window.apiCalls)).length,0,'Opening confirmation must not send');
 await page.evaluate(()=>document.querySelector('dialog[open]').close());
 await page.getByRole('button',{name:'Vérifier un destinataire'}).click();await page.locator('[name=address]').fill('0208:0428643097');await page.getByRole('button',{name:'Vérifier',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#peppol-verify-result').textContent.includes('joignable'));
 await page.evaluate(()=>document.querySelector('dialog[open]').close());
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{peppolSelectTab('incoming');applyInterface('orbytek');});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page overflow');
 await page.screenshot({path:path.join(screenshots,'mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('Browser checks passed: 12 themes, mobile, pagination, search, escaped provider content, confirmation and recipient lookup.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
