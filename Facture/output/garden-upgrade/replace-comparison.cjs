const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const sharp=require(path.join(root,'premium-sites/node_modules/sharp'));
(async()=>{
 for(const state of ['before','after']){
   const filename=`garden-real-${state}.webp`;
   await sharp(path.join(__dirname,`real-${state}.jpg`)).resize({width:1600}).webp({quality:85}).toFile(path.join(root,'premium-sites/public/images',filename));
 }
 const file=path.join(root,'premium-sites/components/garden.tsx');
 let s=fs.readFileSync(file,'utf8');
 s=s.replace('className="section contrast-section">','className="section contrast-section" id="avant-apres">');
 s=s.replace('Le même espace.','D’une pelouse').replace('<em>Une autre vie.</em>','<em>à un jardin vivant.</em>');
 s=s.replace('Faites glisser le curseur pour explorer deux ambiances de jardin.','Un même jardin, avant et après la création d’un massif de gestion des eaux de pluie.');
 s=s.replace('className="before-after"','className="before-after garden-real-comparison"');
 s=s.replace('image("garden-after")','image("garden-real-after")').replace('image("garden-before")','image("garden-real-before")');
 s=s.replace('Inspiration après : jardin paysager aux lignes structurées','Le même jardin en 2016 : massif planté au milieu de la pelouse, devant la clôture et la maison grise');
 s=s.replace('Inspiration avant : espace de jardin à aménager','Le jardin en 2013 : pelouse devant la clôture en bois et la maison grise');
 s=s.replace('AVANT · INSPIRATION','AVANT · 2013').replace('APRÈS · INSPIRATION','APRÈS · 2016');
 s=s.replace(/Deux photos d’inspiration pour démontrer le comparateur\. Elles ne\s+représentent pas la transformation réelle d’un même terrain\./,`Transformation réelle documentée par Arlington County, présentée comme exemple extérieur à notre atelier. Photos : {" "}
              <a href="https://commons.wikimedia.org/wiki/File:Rain_garden_(before).jpg" target="_blank" rel="noopener noreferrer">avant</a>{" · "}
              <a href="https://commons.wikimedia.org/wiki/File:Rain_garden_(after).jpg" target="_blank" rel="noopener noreferrer">après</a>{" — "}
              <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 2.0</a>. Images redimensionnées et converties en WebP, sans retouche du jardin. Les prises de vue ont un cadrage légèrement différent.`);
 fs.writeFileSync(file,s);
 fs.appendFileSync(path.join(root,'premium-sites/components/garden-immersive.css'),'\n.garden .before-after.garden-real-comparison{width:min(100%,980px);height:auto;aspect-ratio:4/3;margin-inline:auto}.garden .garden-real-comparison img{object-fit:contain}.garden #avant-apres .fine-print a{text-decoration:underline;text-underline-offset:3px}\n');
 fs.writeFileSync(path.join(root,'premium-sites/public/images/garden-real-credits.md'),`# Rain garden before / after

Photographs: Arlington County. License: CC BY-SA 2.0 https://creativecommons.org/licenses/by-sa/2.0/
Before (5 August 2013): https://commons.wikimedia.org/wiki/File:Rain_garden_(before).jpg
Original: https://live.staticflickr.com/4745/26376753458_ed4f8265af_o.jpg
After (5 June 2016): https://commons.wikimedia.org/wiki/File:Rain_garden_(after).jpg
Original: https://live.staticflickr.com/4676/40248900091_503e4965a2_o.jpg

Changes: resized to 1600 pixels wide, converted to WebP. No alteration of scene. These image versions remain CC BY-SA 2.0. The website credits the photographer, links to both sources and license, describes the changes, and identifies the project as an external example, not a Vert & Pierre project. Same house, wooden fence and small shed visible in both photographs; viewpoint/framing differs.
`);
 console.log('Real before/after images, source credit and comparator updated.');
})();
