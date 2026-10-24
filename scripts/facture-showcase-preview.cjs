// Aperçu de présentation : données fictives uniquement, aucun accès à Supabase.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const bootstrap=`
account={id:'showcase',user_metadata:{full_name:'Alex'}};
company={name:'Atelier Démo',address:'Adresse de démonstration · Belgique',vat:'',iban:'',email:'contact@example.com',ui_theme:'orbytek'};
clients=[{id:'c1',name:'Émilie Laurent',address:'Bruxelles',country:'BE',email:'emilie.laurent@example.com'},{id:'c2',name:'Nicolas Delcourt',address:'Namur',country:'BE'},{id:'c3',name:'Sophie Martin',address:'Liège',country:'BE'}];
docs=Array.from({length:24},(_,i)=>{const m=5+Math.floor(i/4),day=3+(i%4)*5;return {id:'F-2026-'+String(i+1).padStart(3,'0'),dbId:'demo-'+i,type:'facture',date:'2026-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0'),due:'2026-'+String(m).padStart(2,'0')+'-28',paid:i%4!==3,paidAt:i%4!==3?'2026-'+String(m).padStart(2,'0')+'-25':null,client:'c'+(i%3+1),job:['Entretien de chaudière','Installation de chauffage','Dépannage et entretien'][i%3],lines:[{name:['Entretien de chaudière','Installation de chauffage','Dépannage et entretien'][i%3],qty:1,price:145+(i%5)*95,tax:i%3===0?6:21}],...(i===20?{recurrence:{frequency:'monthly',next:'2026-11-10',active:true}}:{})}}).reverse();
docs.unshift({id:'D-2026-001',dbId:'demo-quote',type:'devis',date:'2026-10-15',due:'2026-11-15',client:'c2',job:'Remplacement de chaudière',lines:[{name:'Fourniture et pose',qty:1,price:2450,tax:21}]});
vatUser='showcase';vatYear=2026;vatQuarter=3;vatPurchases=[{id:'p1',tax_date:'2026-09-10',supplier:'Fournisseur Démo',reference:'ACH-DEMO',net_amount:450,vat_amount:94.5,deduction_percent:100,category:'82'}];
teamContext={owner_id:account.id,role:'owner'};
peppolState={scope:peppolScope(),phase:'ready',rows:Array.from({length:4},(_,i)=>({id:'demo-incoming-'+i,direction:'incoming',kind:'invoice',number:'ACH-2026-00'+(i+1),party_name:['Bois & Ligne','Matériaux Valmont','Élec Horizon','Maison Rivage'][i],party_vat:'',amount:121+i*65,currency:'EUR',due_date:'2026-11-15',status:'received',provider_id:'demo-doc-'+i,created_at:'2026-10-15T10:00:00Z',read_at:i%2?null:'2026-10-16T10:00:00Z',review_state:i%2?'to_review':'verified',parsed:{lines:[{name:'Fourniture de démonstration',quantity:'1',netPriceAmount:'100',vat:{percentage:'21'}}]},failure:[]})),events:[],company:{provider_id:'demo-company',verified:true,reception_enabled:true},environment:'playground',error:'',isOwner:true};
peppolTab='incoming';
dataState='ready';db={from:()=>{throw Error('Aucune connexion dans cet aperçu fictif')},rpc:async(name,{payload})=>{if(name!=='save_document_v2')throw Error('Opération non autorisée dans cet aperçu');return {data:{number:'F-2026-025',id:'fictitious-created-invoice'},error:null}}};
applyTheme('plombier');applyInterface(new URLSearchParams(location.search).get('theme')||'orbytek');
const screen=new URLSearchParams(location.search).get('screen');
if(screen==='factures'||screen==='devis') {filter=screen==='devis'?'devis':'facture';location.hash='docs';}
else if(['home','clients','payments','recurring','dashboard','peppol'].includes(screen))location.hash=screen;
render();
window.scrollTo(0,0);
`;
http.createServer((req,res)=>{const url=new URL(req.url,'http://127.0.0.1');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/projet-facture-facile.html':url.pathname));if(!file.startsWith(root+path.sep)||file.includes(path.sep+'.git')){res.writeHead(403);return res.end()}
if(url.pathname==='/Facture/capture.html'){let html=fs.readFileSync(path.join(root,'Facture/index.html'),'utf8').replace(/<script src="https:[^"]+"><\/script>/g,'').replace('<script src="config.js"></script>','').replace('</body>','<script>'+bootstrap+'</script></body>').replace('</head>',(url.searchParams.get('hd')==='1'?'<style>html{overflow-y:scroll}body{zoom:2}#main:focus{outline:none!important}html[data-interface] aside{height:calc(100vh / 2)}html[data-interface] .layout{min-height:calc(100vh / 2)}</style>':'')+'</head>');res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html)}
if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');let content=fs.readFileSync(file);if(file===path.join(root,'Facture/app.js'))content=content.toString().replace(/\r?\ninitialize\(\);/,'\n');res.end(content);
}).listen(4188,'127.0.0.1',()=>console.log('Présentation locale : http://127.0.0.1:4188/projet-facture-facile.html · captures : /Facture/capture.html'));

