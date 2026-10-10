import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(root, "dist");
if (!output.startsWith(root + sep)) throw new Error("Diretório de saída inválido.");

const assets = ["index.html", "app.js", "math.js", "styles.css", "studio.css", "icon.svg"];
for (const asset of assets) {
  const info = await stat(join(root, asset));
  if (!info.isFile()) throw new Error(`Arquivo ausente: ${asset}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(assets.map(asset => copyFile(join(root, asset), join(output, asset))));
console.log(`Build estático concluído: ${assets.length} arquivos em dist/.`);
