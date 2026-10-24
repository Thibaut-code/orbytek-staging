// Local-only review server. No credentials, network calls or live account writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sample={id:'F-2026-025',dbId:'preview-only',type:'facture',date:'2026-10-18',due:'2026-11-17',paid:false,client:'preview-client',job:'Installation et optimisation du chauffage',site:'Avenue des Tilleuls 28 · Bruxelles',
 issuer:{name:'ORBYTEK',address:'Rue de l’Atelier 12\n5000 Namur\nBE',vat:'BE0123456789',email:'contact@example.com',iban:'BE68539007547034'},
 customer:{name:'Émilie Laurent',address:'Avenue des Tilleuls 28\n1000 Bruxelles\nBE',email:'emilie@example.com',vat:'BE0987654321'},
 lines:[{name:'Thermostat connecté — fourniture et installation',qty:1,price:720,tax:21},{name:'Mise en service et réglages',qty:2,price:80,tax:21},{name:'Déplacement',qty:1,price:45,tax:21}]};
function createServer(){return http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'){
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="https:[^"]+"><\/script>/g,'').replace('<script src="config.js"></script>','');
  const bootstrap=`const params=new URLSearchParams(location.search);window.previewDocument=${JSON.stringify(sample)};
   const previewModel=params.get('model')||'orbytek';const previewType=params.get('type')||'facture';
   previewDocument.appearance={template:previewModel};previewDocument.type=previewType;
   if(previewType==='devis')previewDocument.id='D-2026-025';
   if(params.has('long')){previewDocument.issuer.name='Entreprise de construction, rénovation et maintenance de bâtiments';previewDocument.customer.name='Société de gestion immobilière et de coordination des interventions';previewDocument.customer.address='Résidence des Jardins, bâtiment B, appartement 28, quatrième étage\\nAvenue des Tilleuls et des Chênes 128\\n1000 Bruxelles\\nBE';previewDocument.lines[0].name='Fourniture et installation complète du thermostat connecté avec paramétrage de la régulation, tests et explications détaillées au client';}
   const count=Number(params.get('rows')||3);if(count>3)previewDocument.lines=Array.from({length:count},(_,i)=>({...previewDocument.lines[i%3],name:'Prestation '+(i+1)+' — '+previewDocument.lines[i%3].name,tax:[0,6,12,21][i%4]}));
   account={id:'local-preview'};company={...previewDocument.issuer};clients=[{id:'preview-client',...previewDocument.customer}];docs=[previewDocument];dataState='ready';
   db={from(){throw Error('Aucune écriture autorisée dans cet aperçu');},rpc(){throw Error('Aucune écriture autorisée dans cet aperçu');}};
   if(params.has('draft')){draft={...previewDocument,id:'',dbId:null};delete draft.customer;step=3;}
   document.querySelector('#main').innerHTML=params.has('draft')?wizard():view(previewDocument.id);window.previewReady=true;`;
  html=html.replace('</body>','<script>'+bootstrap+'</script></body>');
  res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||file.includes(path.sep+'.git')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const types={'.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 let content=fs.readFileSync(file);if(file===path.join(root,'app.js'))content=content.toString().replace(/\r?\ninitialize\(\);/,'\n');
 res.end(content);
 });}
if(require.main===module)createServer().listen(4190,'127.0.0.1',()=>console.log('Aperçu des factures : http://127.0.0.1:4190/?model=orbytek'));
module.exports={createServer};
