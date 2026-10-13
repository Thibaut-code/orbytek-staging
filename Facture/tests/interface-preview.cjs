// Aperçu isolé : données fictives, aucun accès à Supabase.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="https:[^"]+"><\/script>/g,'').replace('<script src="config.js"></script>','');
html=html.replace('</body>',`<script>
account={id:'interface-preview',user_metadata:{full_name:'Thibaut'}};company={name:'Orbytek',theme:'plombier',catalogs:{plombier:[['Prestation personnelle',1,80]]}};
clients=[{id:'c1',name:'Client de démonstration',address:'Bruxelles'}];
db={from:()=>{const query={upsert:()=>query,update:()=>query,eq:()=>query,then:resolve=>resolve({data:null,error:null})};return query;}};
docs=Array.from({length:8},(_,i)=>({id:'F-2026-00'+(8-i),type:'facture',date:'2026-10-01',due:'2026-09-30',paid:i<2,client:'c1',job:'Prestation de démonstration',lines:[{name:'Prestation',qty:1,price:100+i*30,tax:21}]}));
dataState='ready';themeColumnReady=false;uiColumnReady=false;
applyTheme('plombier');$('#themebutton').hidden=false;render();
</script></body>`);
http.createServer((req,res)=>{
const url=new URL(req.url,'http://localhost');
if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(url.searchParams.get('empty')==='1'?html.replace(/docs=Array\.from[^;]+;/,'docs=[];'):html)}
const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(fs.readFileSync(file));
}).listen(Number(process.env.PORT)||4175,'127.0.0.1',()=>console.log('Aperçu interfaces prêt.'));
