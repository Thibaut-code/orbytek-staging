// Export only the paysagiste route. Retain existing shared chunks for other demos.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../../..');const source=path.join(root,'premium-sites/out');const target=path.join(root,'demos');
for(const name of ['paysagiste','_next'])fs.cpSync(path.join(source,name),path.join(target,name),{recursive:true});
for(const name of fs.readdirSync(path.join(source,'images')).filter(n=>n.startsWith('garden-vision')))fs.copyFileSync(path.join(source,'images',name),path.join(target,'images',name));
const html=fs.readFileSync(path.join(source,'paysagiste/index.html'),'utf8');
const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m=>m[1]);
const css=styles.map(url=>fs.readFileSync(path.join(source,url.replace(/^\/demos\//,'')),'utf8')).join('\n');
const hero=html.match(/<section class="hero"[^>]*>[\s\S]*?<\/section>/)?.[0];
if(!hero)throw Error('Hero missing');
fs.writeFileSync(path.join(root,'creation-preview-07.html'),`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aperçu Vert & Pierre</title><style>${css}\nhtml{scroll-behavior:auto}body{overflow:hidden}.hero{min-height:800px!important}.hero-content{padding-top:80px!important}*{animation:none!important}</style></head><body><div class="experience garden">${hero}</div></body></html>`);
console.log('Paysagiste export and portfolio preview updated; other demo pages preserved.');
