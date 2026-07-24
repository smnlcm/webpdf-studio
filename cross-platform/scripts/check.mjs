import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const requiredFiles = [
  "forge.config.js",
  "src/main.js",
  "src/preload.js",
  "src/renderer/index.html",
  "src/renderer/styles.css",
  "src/renderer/app.js",
  "src/renderer/vendor/pdfjs/pdf.mjs",
  "src/renderer/vendor/pdfjs/pdf.worker.mjs"
];

for (const relativePath of requiredFiles) {
  await access(path.join(projectRoot, relativePath));
}

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (["node_modules", "vendor", "out"].includes(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScript(fullPath));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const filePath of await collectJavaScript(projectRoot)) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8")
);
const forgeConfig = await readFile(
  path.join(projectRoot, "forge.config.js"),
  "utf8"
);

if (packageJson.productName !== "WebPDF Studio") {
  throw new Error("Unexpected product name.");
}

if (!forgeConfig.includes('executableName: "WebPDF"')) {
  throw new Error("The executable name must remain WebPDF.");
}

console.log("WebPDF Studio checks passed.");
