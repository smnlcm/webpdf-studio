import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(projectRoot, "node_modules", "pdfjs-dist");
const destinationRoot = path.join(
  projectRoot,
  "src",
  "renderer",
  "vendor",
  "pdfjs"
);

await mkdir(destinationRoot, { recursive: true });

for (const fileName of ["pdf.mjs", "pdf.worker.mjs"]) {
  await cp(
    path.join(sourceRoot, "build", fileName),
    path.join(destinationRoot, fileName)
  );
}

const license = await readFile(path.join(sourceRoot, "LICENSE"), "utf8");
await writeFile(path.join(destinationRoot, "LICENSE"), license, "utf8");

console.log("PDF.js browser files are ready.");
