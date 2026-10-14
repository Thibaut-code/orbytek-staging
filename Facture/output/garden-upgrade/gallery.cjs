const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),site=path.join(root,'premium-sites');
const sharp=require(path.join(site,'node_modules/sharp'));
const generated='C:/Users/FlowUP/.codex/generated_images/01a0e8a2-6b96-72f0-9158-5bcc0cbccd3b/';
(async()=>{
 for(const [name,file] of [['garden-collection-meadow','exec-6d9b5006-cbca-4a73-90ee-db7cdac5ac4a.png'],['garden-collection-terrace','exec-f66ae66a-7666-4c44-b4a6-0aa1d5b9d705.png']]){
  await sharp(generated+file).resize({width:1440,withoutEnlargement:true}).webp({quality:85}).toFile(path.join(site,'public/images',name+'.webp'));
 }
 const dataFile=path.join(site,'lib/data.ts');let s=fs.readFileSync(dataFile,'utf8');
 const index=s.indexOf('export const projects =');let collection=s.slice(index);
 collection=collection.replace('image: "garden-vision"','image: "garden-collection-meadow"').replace('image: "garden-vision"','image: "garden-collection-terrace"');
 collection=collection.replace('Des graminées, des cheminements en pierre et des espaces de vie reliés par une même palette végétale.','Une allée de gravier clair, des vivaces et des graminées mènent à un banc sous les bouleaux. Un jardin pour prendre le temps.');
 collection=collection.replace('Une pergola en bois, un salon ouvert sur le jardin et une terrasse en pierre claire, enveloppés de plantations.','Une pergola végétalisée, une grande table en bois et une terrasse en pierre claire, bordée d’hortensias pour recevoir au jardin.');
 fs.writeFileSync(dataFile,s.slice(0,index)+collection);
 const css=path.join(site,'components/garden-immersive.css');let style=fs.readFileSync(css,'utf8').replace('object-position: 95% center','object-position: center');fs.writeFileSync(css,style);
 fs.writeFileSync(path.join(site,'public/images/garden-collection.prompt.md'),`# Collection garden imagery
Created using the built-in image generation tool. Fictional AI-generated inspiration, identified as such in the collection. Assets: garden-collection-meadow.webp and garden-collection-terrace.webp. Optimized to WebP without scene alteration.

## Meadow prompt
Photorealistic editorial landscape architecture photograph for a premium Belgian garden designer portfolio. Wide landscape 3:2 composition. A distinct contemporary Belgian countryside garden, gently curving pale gravel path weaving through abundant purple salvia, white echinacea, airy ornamental grasses and clipped rounded shrubs, leading toward a simple weathered oak bench beneath an elegant mature birch. Soft hazy early morning light, tranquil fresh green and lavender palette, beautiful depth, restrained immaculate landscape design, lush realistic temperate plants. Eye level 35mm architectural photography, exquisite natural detail, no pergola, no pond, no house dominating, no people, no text, no logo, no collage. Entire scene coherent. This is a fictional inspirational landscape concept.

## Terrace prompt
Photorealistic premium Belgian landscape architecture editorial photograph. Portrait 4:5 framing for a portfolio terrace card. A beautifully designed intimate contemporary outdoor dining terrace beside a warm pale brick townhouse. Generous pale limestone paving in foreground, solid natural oak dining table set simply with ceramic vase and six tasteful woven chairs in middle, slim black steel pergola supporting light climbing greenery overhead. Lush white hydrangeas and ferns border the terrace with a clipped dark green privacy hedge, warm discreet integrated garden lights. Quiet late afternoon soft light, refined natural beige/ivory/forest green palette, magazine architecture photography, realistic materials and construction, eye-level perspective, table and pergola centrally composed for both portrait and square crops. No water, no pond, no sofa, no people, no lettering, no logo, no collage. A fictional garden design inspiration.
`);
 console.log('Gallery images and descriptions updated.');
})();
