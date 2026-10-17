import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Use the actual homepage and its shared stylesheet to keep the preview current.
const root = new URL("../../", import.meta.url);
const homepage = await readFile(new URL("Chauffagiste/index.html", root), "utf8");
const css = (await readFile(new URL("Chauffagiste/style.css", root), "utf8"))
  .replace(/url\((['"]?)(images\/[^)'"\s]+)\1\)/g, 'url("Chauffagiste/$2")');
const header = homepage.match(/<header\b[\s\S]*?<\/header>/)?.[0];
const hero = homepage.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0];
if (!header || !hero) throw new Error("Accueil chauffage introuvable");
const head = homepage.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  .replace(/<script\b[\s\S]*?<\/script>/g, "");
if (!head) throw new Error("En-tête chauffage introuvable");
let preview = `<!DOCTYPE html>
<html lang="fr" data-theme="dark"><head>
${head.replace(/<link\b[^>]*href="style\.css"[^>]*>/, () => `<style>${css}</style>`)}
<meta name="robots" content="noindex">
<style>html{scroll-behavior:auto}body{overflow:hidden}*,*::before,*::after{animation:none!important;transition:none!important}</style>
</head><body>${header}<main>${hero.replace(/src="images\//g, 'src="Chauffagiste/images/')}</main></body></html>
`;
// A sandboxed iframe opened from file:// cannot load neighbouring image files.
// Embed the actual homepage photos so both local and hosted previews work.
const images = new Set(preview.match(/Chauffagiste\/images\/[\w.-]+\.webp/g));
for (const image of images) {
  const bytes = await readFile(new URL(image, root));
  preview = preview.replaceAll(image, `data:image/webp;base64,${bytes.toString("base64")}`);
}
const version = createHash("sha256").update(preview).update(css).digest("hex").slice(0, 12);
const portfolioUrl = new URL("creations.html", root);
const portfolio = await readFile(portfolioUrl, "utf8");
const updated = portfolio.replace(/src="creation-preview-2\.html(?:\?[^"\s]*)?"/g,
  `src="creation-preview-2.html?v=${version}"`);
if (updated === portfolio && !portfolio.includes(`creation-preview-2.html?v=${version}`))
  throw new Error("Carte chauffage introuvable");
await writeFile(new URL("creation-preview-2.html", root), preview);
await writeFile(portfolioUrl, updated);
console.log(`Aperçu chauffage sombre actualisé (${version}).`);
