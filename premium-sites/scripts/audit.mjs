import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("reports", { recursive: true });
const chrome = await launch({
  chromePath:
    process.env.CHROME_PATH ||
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  chromeFlags: ["--headless", "--no-sandbox"],
});
try {
  for (const site of process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["immobilier", "restaurant", "paysagiste"]) {
    const result = await lighthouse(`http://localhost:4173/demos/${site}/`, {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    await writeFile(`reports/${site}-mobile.json`, result.report);
    console.log(
      `${site} : ${JSON.stringify(Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)])))}`,
    );
  }
} finally {
  await chrome.kill();
}
process.exit(0);
