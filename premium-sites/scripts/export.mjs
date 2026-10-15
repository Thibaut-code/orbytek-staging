import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../", import.meta.url));
const source = fileURLToPath(new URL("../out/", import.meta.url));
const target = path.join(root, "demos");
// Pass a route name to update one demo without rebuilding the published others.
const selected = new Set(process.argv.slice(2));
for (const id of selected) {
  if (!["immobilier", "restaurant", "paysagiste"].includes(id))
    throw new Error(`Démo inconnue : ${id}`);
}
await mkdir(target, { recursive: true });
// Only generated Next assets are replaced; portfolio and source files are kept.
const generatedAssets = path.resolve(target, "_next");
if (generatedAssets !== path.join(path.resolve(root), "demos", "_next"))
  throw new Error("Chemin d’export inattendu");
if (selected.size) {
  // Older published routes still need their existing hashed assets.
  await cp(path.join(source, "_next"), generatedAssets, { recursive: true });
  for (const id of selected)
    await cp(path.join(source, id), path.join(target, id), { recursive: true });
} else {
  await rm(generatedAssets, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}
await cp(fileURLToPath(new URL("../public/", import.meta.url)), target, {
  recursive: true,
});
const portfolio = path.join(root, "creations.html");
let html = await readFile(portfolio, "utf8");
const entries = [
  {
    id: "immobilier",
    name: "Aurelia",
    type: "Site catalogue · Immobilier",
    n: "05",
    accent: "#c3ab81",
    promise: "Des lieux singuliers.<br>Une expérience à leur hauteur.",
    text: "Une agence immobilière premium : collection filtrable, pages de biens, favoris, comparateur et demandes de visite.",
    tags: ["Recherche & filtres", "Comparateur", "Estimation"],
    hero: "estate-hero",
  },
  {
    id: "restaurant",
    name: "Maison Braise",
    type: "Site vitrine · Brasserie",
    n: "06",
    accent: "#cf9d79",
    promise: "Le goût du lieu,<br>avant la première bouchée.",
    text: "Une brasserie chaleureuse : carte interactive, sélection de vins, réservation, panier à emporter et bons cadeaux.",
    tags: ["Carte interactive", "Réservation", "À emporter"],
    hero: "restaurant-hero",
  },
  {
    id: "paysagiste",
    name: "Vert & Pierre",
    type: "Site vitrine · Paysagisme",
    n: "07",
    accent: "#c4d394",
    promise: "Des jardins à vivre.<br>Des projets qui prennent racine.",
    text: "Un univers paysager : avant/après interactif, réalisations filtrables, calculateur de budget et devis guidé.",
    tags: ["Avant / après", "Devis guidé", "Réalisations"],
    hero: "garden-hero",
  },
];
for (const p of entries) {
  if (selected.size && !selected.has(p.id)) continue;
  const start = await readFile(path.join(source, p.id, "index.html"), "utf8");
  const styles = [...start.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match => match[1]);
  const css = (await Promise.all(styles.map(url => readFile(path.join(source, url.replace(/^\/demos\//, "")), "utf8")))).join("\n");
  const hero = start.match(
    /<section class="hero"[^>]*>[\s\S]*?<\/section>/,
  )?.[0];
  if (!hero) throw new Error(`Hero absent : ${p.id}`);
  await writeFile(
    path.join(root, `creation-preview-${p.n}.html`),
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aperçu ${p.name}</title><style>${css}\nhtml{scroll-behavior:auto}body{overflow:hidden}.hero{min-height:800px!important}.hero-media video{display:none}.hero-content{padding-top:80px!important}*{animation:none!important}</style></head><body><div class="experience ${p.id === "immobilier" ? "estate" : p.id === "restaurant" ? "restaurant" : "garden"}">${hero}</div></body></html>`,
  );
  if (!html.includes(`data-premium="${p.id}"`)) {
    const card = `\n<article class="creation-card" data-premium="${p.id}" style="--project-accent:${p.accent}"><a class="creation-preview" href="demos/${p.id}/" target="_blank" rel="noopener" aria-label="Découvrir ${p.name} (nouvel onglet)"><div class="browser-bar" aria-hidden="true"><span class="browser-dots"><i></i><i></i><i></i></span><span>${p.name}</span><span class="preview-label">APERÇU</span></div><div class="preview-window"><iframe src="creation-preview-${p.n}.html" title="Aperçu de ${p.name}" loading="lazy" tabindex="-1" aria-hidden="true" sandbox="" scrolling="no"></iframe><span class="preview-open">Explorer le projet</span></div></a><div class="creation-copy"><div class="creation-meta"><span>${p.type}</span><span class="creation-number">${p.n}</span></div><h3>${p.name}</h3><p class="creation-promise">${p.promise}</p><p class="creation-description">${p.text}</p><ul class="creation-tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul><a class="creation-link" href="demos/${p.id}/" target="_blank" rel="noopener">Découvrir le projet <span class="sr-only">${p.name} (nouvel onglet)</span></a></div></article>`;
    html = html.replace(
      '</div><p class="portfolio-note">',
      `${card}</div><p class="portfolio-note">`,
    );
  }
  // Change the iframe URL whenever its actual content changes, so an older
  // portfolio preview cannot survive a new static export in the browser cache.
  const previewFile = path.join(root, `creation-preview-${p.n}.html`);
  const version = createHash("sha256").update(await readFile(previewFile)).digest("hex").slice(0, 12);
  html = html.replace(
    new RegExp(`src="creation-preview-${p.n}\\.html(?:\\?[^"\\s]*)?"`, "g"),
    `src="creation-preview-${p.n}.html?v=${version}"`,
  );
}
html = html
  .replace(
    "Quatre univers, une même ambition",
    "Sept univers, une même ambition",
  )
  .replace(
    "Découvrez Facture Facile, Chauffage Courtois, AutoPrime et Maison Élégance.",
    "Découvrez sept univers : facturation, chauffage, automobile, coiffure, immobilier, restauration et paysagisme.",
  );
await writeFile(portfolio, html);
console.log(
  "Export statique prêt dans /demos et 3 cartes ajoutées à Créations.",
);
