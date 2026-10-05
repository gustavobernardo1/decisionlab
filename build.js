import { cpSync, mkdirSync, rmSync } from "node:fs";

const output = new URL("./dist/", import.meta.url);
rmSync(output, { recursive: true, force: true });
mkdirSync(output);

for (const file of ["index.html", "app.js", "math.js", "styles.css", "studio.css", "icon.svg"]) {
  cpSync(new URL(file, import.meta.url), new URL(file, output));
}
