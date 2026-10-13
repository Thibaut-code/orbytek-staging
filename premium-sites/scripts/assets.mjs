import { mkdir, writeFile, stat } from "node:fs/promises";
const photos = {
  "estate-hero": "photo-1600607687920-4e2a09cf159d",
  "estate-interior": "photo-1600210492486-724fe5c67fb0",
  "estate-house": "photo-1600585154340-be6161a56a0c",
  "estate-terrace": "photo-1600607687939-ce8a6c25118c",
  "estate-pool": "photo-1613977257363-707ba9348227",
  "restaurant-hero": "photo-1414235077428-338989a2e8c0",
  "food-steak": "photo-1546833999-b9f581a1996d",
  "food-burrata": "photo-1512621776951-a57141f2eefd",
  "food-fish": "photo-1510130387422-82bed34b37e9",
  "food-risotto": "photo-1473093226795-af9932fe5856",
  "food-dessert": "photo-1578985545062-69928b1d9587",
  "restaurant-room": "photo-1517248135467-4c7edcad34c4",
  chef: "photo-1577219491135-ce391730fb2c",
  "garden-hero": "photo-1585320806297-9794b3e4eeae",
  "garden-terrace": "photo-1600585154526-990dced4db0d",
  "garden-detail": "photo-1416879595882-3373a0480b5b",
  "garden-pool": "photo-1613977257363-707ba9348227",
  "garden-before": "photo-1598902108854-10e335adac99",
  "garden-after": "photo-1585320806297-9794b3e4eeae",
  team: "photo-1522071820081-009f0129c71c",
};
await mkdir("public/images", { recursive: true });
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    try {
      if (
        !process.argv.includes("--refresh") &&
        (await stat(`public/images/${name}.jpg`)).size > 1000
      )
        return;
    } catch {}
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${name.endsWith("hero") ? 1920 : 1000}&q=82`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    await writeFile(
      `public/images/${name}.jpg`,
      new Uint8Array(await r.arrayBuffer()),
    );
    console.log(`Image : ${name}`);
  }),
);
await writeFile("public/images/credits.json", JSON.stringify(photos, null, 2));
await mkdir("public/vendor", { recursive: true });
for (const [file, url] of Object.entries({
  "public/vendor/pannellum.js":
    "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js",
  "public/vendor/pannellum.css":
    "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css",
  "public/vendor/LICENSE-pannellum":
    "https://raw.githubusercontent.com/mpetroff/pannellum/master/COPYING",
  "public/images/panorama.jpg": "https://pannellum.org/images/alma.jpg",
})) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  await writeFile(file, new Uint8Array(await r.arrayBuffer()));
  console.log(`Ressource 360 : ${file}`);
}
