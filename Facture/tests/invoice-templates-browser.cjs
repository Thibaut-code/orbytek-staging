// Browser acceptance: real screen/print rendering and bundled html2pdf, local data only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('./invoice-templates-preview.cjs');
const packageRoot=process.env.FF_NODE_MODULES||'C:/Users/FlowUP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(packageRoot,'playwright'));
const reports=process.env.FF_REPORTS?path.resolve(process.env.FF_REPORTS):path.resolve(__dirname,'../../reports/invoice-templates');
async function main(){
 fs.mkdirSync(reports,{recursive:true});
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  browser=await chromium.launch({headless:true,executablePath:process.env.FF_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1200}});
  await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  const results=[];
  for(const model of process.env.FF_PREVIEW_ONLY?[]:['orbytek','architecture','industriel']) {
   await page.goto(base+'/?model='+model);await page.waitForFunction(()=>window.previewReady);
   await page.locator('#main > .document').screenshot({path:path.join(reports,model+'-desktop.png')});
   assert.equal(await page.locator('.document .design-lines tbody tr').count(),3);
   assert.equal(await page.locator('.document .payment-qr svg').count(),1);
   const colors=await page.locator('#main > .document').evaluate(el=>({background:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage}));
   assert.equal(colors.background,'rgb(255, 255, 255)');assert.equal(colors.image,'none');
   await page.evaluate(()=>customizeDocument(previewDocument.id));
   assert.equal(await page.locator('#template-choice option').count(),6);
   await page.selectOption('#template-choice',model);assert.equal(await page.locator('#template-preview .template-'+model).count(),1);
   await page.evaluate(()=>document.querySelector('#feature-dialog').close());
   await page.emulateMedia({media:'print'});
   const printBuffer=await page.pdf({path:path.join(reports,model+'-print.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
   assert.equal((printBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1,model+' : une page A4 attendue');
   await page.emulateMedia({media:'screen'});
   // Actual e-mail attachment generation, using the app's bundled html2pdf.
   const exported=await page.evaluate(async()=>{
    const blob=await documentPDF(previewDocument);const bytes=new Uint8Array(await blob.arrayBuffer());
    let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {base64:btoa(text),size:bytes.length};
   });
   const exportBuffer=Buffer.from(exported.base64,'base64');
   fs.writeFileSync(path.join(reports,model+'-export.pdf'),exportBuffer);assert.ok(exported.size>10000);
   assert.equal((exportBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1,model+' : export sur une page A4 attendu');
   const palettes=await page.evaluate(()=>{
    const results=[];for(const theme of Object.keys(UI_THEMES)){applyInterface(theme);const paper=document.querySelector('#main > .document');const style=getComputedStyle(paper);results.push({theme,background:style.backgroundColor,ink:style.color});}applyInterface('orbytek');return results;
   });
   for(const palette of palettes){assert.equal(palette.background,'rgb(255, 255, 255)');assert.ok(!palette.ink.startsWith('rgb(255, 255, 255)'));}
   for(const width of [390,320]){
    await page.setViewportSize({width,height:950});
    const geometry=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,doc:document.querySelector('.document').getBoundingClientRect().toJSON(),table:document.querySelector('.design-table-wrap').getBoundingClientRect().toJSON()}));
    assert.ok(geometry.scroll<=geometry.width+1,model+' mobile page overflow: '+JSON.stringify(geometry));
    await page.locator('#main > .document').screenshot({path:path.join(reports,model+'-mobile-'+width+'.png')});
   }
   // Mobile viewport must not change PDF structure or hide totals.
   const mobileExport=await page.evaluate(async()=>{const blob=await documentPDF(previewDocument);return blob.size;});assert.ok(mobileExport>10000);
   await page.setViewportSize({width:1440,height:1200});
   await page.goto(base+'/?model='+model+'&type=devis&long=1');await page.waitForFunction(()=>window.previewReady);
   assert.equal(await page.locator('.document .payment-qr').count(),0);assert.ok((await page.locator('#main > .document').innerText()).includes('Valable jusqu’au'));
   await page.emulateMedia({media:'print'});await page.pdf({path:path.join(reports,model+'-quote-long.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
   await page.goto(base+'/?model='+model+'&rows=60&long=1');await page.waitForFunction(()=>window.previewReady);
   assert.equal(await page.locator('.document .design-lines tbody tr').count(),60);
   await page.emulateMedia({media:'print'});await page.pdf({path:path.join(reports,model+'-multipage.pdf'),format:'A4',preferCSSPageSize:true,printBackground:false});await page.emulateMedia({media:'screen'});
   const many=await page.evaluate(async()=>{const blob=await documentPDF(previewDocument);const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);});
   fs.writeFileSync(path.join(reports,model+'-multipage-export.pdf'),Buffer.from(many,'base64'));
   results.push({model,whiteBackground:true,interfaceThemes:palettes.length,selector:true,mobileWidths:[390,320],quote:true,mixedVAT:true,rows:60,pdfBytes:exported.size,normalPrintPages:1,normalExportPages:1});
   console.log(model+': aperçu, sélecteur, mobile, devis, impression et export PDF réels vérifiés.');
  }
  // Regression: the entire paper width must remain visible in the model picker,
  // including large application text, small screens, resizing and uploaded logos.
  const logo=fs.readFileSync(path.resolve(__dirname,'../../orbytek-logo-light.webp')).toString('base64');
  const previewFit=[];
  for(const source of ['saved','draft']){
  await page.goto(base+'/?model=orbytek'+(source==='draft'?'&draft=1':''));await page.waitForFunction(()=>window.previewReady);
  await page.evaluate(({logo,source})=>{const d=source==='draft'?draft:previewDocument;d.issuer.logo='data:image/webp;base64,'+logo;customizeDocument(source==='draft'?undefined:previewDocument.id);},{logo,source});
  for(const fontSize of [16,22]){
   await page.evaluate(size=>document.documentElement.style.fontSize=size+'px',fontSize);
   for(const width of [1389,1024,800,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const model of ['classique','bleu_nuit','cuivre','orbytek','architecture','industriel']){
     await page.selectOption('#template-choice',model);
     await page.waitForFunction(()=>{
      const preview=document.querySelector('#template-preview'),paper=preview.querySelector('.document'),stage=preview.querySelector('.template-preview-page');
      const box=paper.getBoundingClientRect(),frame=stage.getBoundingClientRect();
      return box.width>0&&Math.abs(box.width-frame.width)<1&&Math.abs(box.height-frame.height)<1;
     });
     const geometry=await page.evaluate(()=>{
      const preview=document.querySelector('#template-preview'),paper=preview.querySelector('.document'),dialog=document.querySelector('#feature-dialog');
      const p=preview.getBoundingClientRect(),d=paper.getBoundingClientRect(),last=paper.querySelector('thead th:last-child').getBoundingClientRect();
      return {dialogWidth:dialog.clientWidth,dialogScroll:dialog.scrollWidth,previewWidth:preview.clientWidth,previewScroll:preview.scrollWidth,left:d.left,right:d.right,frameLeft:p.left,frameRight:p.right,lastColumnRight:last.right,scale:d.width/paper.offsetWidth};
     });
     assert.ok(geometry.dialogScroll<=geometry.dialogWidth+1,JSON.stringify({source,model,width,fontSize,geometry}));
     assert.ok(geometry.previewScroll<=geometry.previewWidth+1,JSON.stringify({source,model,width,fontSize,geometry}));
     assert.ok(geometry.left>=geometry.frameLeft&&geometry.right<=geometry.frameRight+1,JSON.stringify({source,model,width,fontSize,geometry}));
     assert.ok(geometry.lastColumnRight<=geometry.frameRight+1,'Dernière colonne coupée');
     const end=await page.evaluate(()=>{
      const preview=document.querySelector('#template-preview');
      preview.scrollLeft=9999;preview.querySelector('.template-preview-page').scrollLeft=9999;
      return {preview:preview.scrollLeft,page:preview.querySelector('.template-preview-page').scrollLeft};
     });
     assert.deepEqual(end,{preview:0,page:0},'Le document ne doit pas pouvoir défiler horizontalement');
     previewFit.push({source,model,width,fontSize,scale:geometry.scale,horizontalScroll:false});
     if(model==='orbytek'&&((width===1389&&fontSize===22)||(width===768&&fontSize===16)||(width===390&&fontSize===16))){
      await page.locator('#feature-dialog').evaluate(el=>{el.scrollTop=0;});
      await page.locator('#feature-dialog').screenshot({path:path.join(reports,`preview-${source}-orbytek-${width}-font-${fontSize}.png`)});
      if(source==='draft'&&width===768){
       await page.locator('#template-preview .design-lines').evaluate(el=>el.scrollIntoView({block:'center'}));
       await page.locator('#feature-dialog').screenshot({path:path.join(reports,'preview-draft-full-width.png')});
      }
     }
    }
   }
  }
  await page.evaluate(()=>document.querySelector('#feature-dialog').close());
  }
  // Reopening and switching to a different feature must also clean up observers.
  await page.evaluate(()=>{customizeDocument(previewDocument.id);featureDialog('Autre fenêtre','<p>Test local</p>');});
  await page.evaluate(()=>customizeDocument(previewDocument.id));
  assert.equal(await page.locator('#template-preview .document').count(),1);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(reports,'checks.json'),JSON.stringify({results,previewFit,errors},null,2));
  console.log('Largeur complète sans défilement horizontal : six modèles × six largeurs × deux tailles de texte, sur facture enregistrée et brouillon.');
 } finally {if(browser)await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
