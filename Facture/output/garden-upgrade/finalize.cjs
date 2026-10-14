const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../../..');const source=path.join(root,'premium-sites');
const file=path.join(source,'scripts/export.mjs');let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('  const css = await readFile(');const end=s.indexOf('  const hero =',start);
if(start<0||end<start)throw Error('Export block missing');
s=s.slice(0,start)+`  const start = await readFile(path.join(source, p.id, "index.html"), "utf8");
  const styles = [...start.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^\"]+)"/g)].map(match => match[1]);
  const css = (await Promise.all(styles.map(url => readFile(path.join(source, url.replace(/^\\/demos\\//, "")), "utf8")))).join("\\n");
`+s.slice(end);
fs.writeFileSync(file,s);
fs.writeFileSync(path.join(source,'public/images/garden-vision.prompt.md'),`# Jardin d’inspiration — Vert & Pierre

Created with the built-in image generation tool on 13 October 2026. AI-generated architectural concept, not a real completed client project. The website labels this explicitly. WebP sizes are compression/resizing variants of the same original scene.

## Final generation prompt

Create a photorealistic premium landscape architecture editorial photograph, wide landscape 16:9, for a Belgian garden design website. A breathtaking but believable private garden at golden hour, warm low sunlight grazing ornamental grasses and pale limestone. Composition: left third is shaded, rich deep green trees and layered vegetation with quiet negative space for white headline overlay. In middle ground center a long pale limestone stepping path winds through soft grasses and white flowering perennials towards a multi-stem tree. Upper right / middle right a contemporary warm cedar timber pergola shelters a simple elegant outdoor lounge on a pale stone terrace. Lower right a shallow reflective rectangular water feature bordered with lush planting. Foreground grasses softly out of focus, intimate beautifully composed living garden, Belgian temperate plants, no palm trees. Sophisticated muted forest greens, warm cream, natural wood. Architectural Digest photographic quality, natural organic realism, detailed textures, soft sun flare only subtle, 35mm lens. No people, no text, no labels, no arrows, no logos, no watermark. Entire image is one coherent scene, no collage.
`);
console.log('Export compatibility and image provenance saved');
