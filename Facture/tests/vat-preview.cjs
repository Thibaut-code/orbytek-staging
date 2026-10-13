// Aperçu local avec données fictives : node tests/vat-preview.cjs
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="https:[^"]+"><\/script>/g,'').replace('<script src="config.js"></script>','');
html=html.replace('</body>',`<script>
account={id:'test'};company={name:'Entreprise de test',vat:'BE0123456789'};
docs=[{id:'FAC-TEST',dbId:'test-document',type:'facture',date:'2026-09-01',due:'2026-10-01',customer:{name:'Client test',country:'BE'},lines:[{name:'Prestation',qty:1,price:1000,tax:21}]}];
vatYear=2026;vatQuarter=3;vatUser='test';vatPurchases=[];
db={from:()=>{let values,id,mode;const q={insert:v=>{values=v;mode='insert';return q},update:v=>{values=v;mode='update';return q},delete:()=>{mode='delete';return q},eq:(k,v)=>{if(k==='id')id=v;return q},select:()=>q,single:async()=>({data:{...values,id:id||crypto.randomUUID()}}),then:resolve=>resolve({data:[{id}]})};return q}};
render=()=>document.querySelector('#main').innerHTML=dashboard();render();
</script></body>`);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html)}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');
 let content=fs.readFileSync(file);if(file===path.join(root,'app.js'))content=content.toString().replace(/\r?\ninitialize\(\);/,'\n');
 res.end(content);
}).listen(8765,'127.0.0.1',()=>console.log('Aperçu fictif : http://127.0.0.1:8765'));
