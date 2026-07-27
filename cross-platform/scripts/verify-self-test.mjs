import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDocument,
  OPS
} from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_FILES = Object.freeze([
  "code-asymmetric.pdf",
  "letter-landscape.pdf",
  "scale-100.pdf",
  "scale-150.pdf",
  "background-on.pdf",
  "background-off.pdf",
  "header-footer.pdf",
  "file-relative-assets.pdf",
  "save-flow.pdf"
]);
const POINTS_PER_MILLIMETRE = 72 / 25.4;
const PAGE_TOLERANCE_POINTS = 2;
const GEOMETRY_TOLERANCE_POINTS = 2;
const SCALE_RATIO_TOLERANCE = 0.03;
const RELATIVE_CSS_LEFT_MARGIN_MM = 12;
const FILL_OPERATOR_IDS = new Set([
  "fill",
  "eoFill",
  "fillStroke",
  "eoFillStroke",
  "closeFillStroke",
  "closeEOFillStroke",
  "setFillColorSpace",
  "setFillColor",
  "setFillColorN",
  "setFillGray",
  "setFillRGBColor",
  "setFillCMYKColor",
  "shadingFill",
  "paintSolidColorImageMask",
  "constructPath",
  "setFillTransparent",
  "rawFillPath"
].map((name) => OPS[name]).filter(Number.isInteger));
const IMAGE_OPERATOR_IDS = new Set([
  "paintImageMaskXObject",
  "paintImageMaskXObjectGroup",
  "paintImageMaskXObjectRepeat",
  "paintImageXObject",
  "paintImageXObjectGroup",
  "paintImageXObjectRepeat",
  "paintInlineImageXObject"
].map((name) => OPS[name]).filter(Number.isInteger));

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertNear(actual, expected, tolerance, label) {
  const difference = Math.abs(actual - expected);
  assert(
    Number.isFinite(actual) && difference <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ± ${tolerance.toFixed(3)} pt, `
      + `received ${Number.isFinite(actual) ? actual.toFixed(3) : String(actual)} pt.`
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseOutputDirectory(argumentsList) {
  const equalsArgument = argumentsList.find((argument) =>
    argument.startsWith("--self-test-output=")
  );
  if (equalsArgument) {
    return path.resolve(equalsArgument.slice("--self-test-output=".length));
  }

  const optionIndex = argumentsList.indexOf("--self-test-output");
  if (optionIndex >= 0 && argumentsList[optionIndex + 1]) {
    return path.resolve(argumentsList[optionIndex + 1]);
  }

  const positionalArgument = argumentsList.find((argument) =>
    !argument.startsWith("-")
  );
  if (positionalArgument) {
    return path.resolve(positionalArgument);
  }

  fail(
    "Self-test output directory is required. Pass a directory path or "
      + "--self-test-output=<directory>."
  );
}

function normalizeGeneratedFile(entry) {
  if (typeof entry === "string") {
    return path.basename(entry);
  }
  if (entry && typeof entry === "object") {
    const candidate = entry.file ?? entry.name ?? entry.path;
    return typeof candidate === "string" ? path.basename(candidate) : "";
  }
  return "";
}

async function verifyManifest(outputDirectory) {
  const manifestPath = path.join(outputDirectory, "self-test.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    fail(`Cannot read a valid self-test manifest at ${manifestPath}: ${error.message}`);
  }

  assert(
    ["win32", "darwin", "linux"].includes(manifest.platform),
    `Manifest platform is invalid: ${String(manifest.platform)}.`
  );
  assert(
    ["x64", "arm64"].includes(manifest.arch),
    `Manifest architecture is invalid: ${String(manifest.arch)}.`
  );
  assert(
    typeof manifest.version === "string"
      && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version),
    `Manifest version is invalid: ${String(manifest.version)}.`
  );
  assert(
    manifest.cacheEqual === true,
    "Manifest cacheEqual must be true; preview and export bytes were not identical."
  );
  assert(
    manifest.saveFlow?.exactBytes === true
      && Number.isInteger(manifest.saveFlow?.size)
      && manifest.saveFlow.size >= 256,
    "Packaged save-flow verification did not preserve the exact rendered PDF bytes."
  );
  assert(
    manifest.ui?.passed === true,
    "Manifest UI self-test did not pass."
  );
  assert(
    manifest.ui?.dirtyStatus === "Settings changed; updating the preview…",
    "UI did not expose the expected stale-preview status."
  );
  assert(
    manifest.ui?.preferencesRestored === true,
    "Language, theme and accent preferences were not restored after relaunch."
  );
  assert(
    manifest.ui?.invalidSourceHandled === true,
    "Invalid source input left the automatic preview in a busy state."
  );
  assert(
    Array.isArray(manifest.generatedFiles),
    "Manifest generatedFiles must be an array."
  );

  const generatedFiles = new Set(
    manifest.generatedFiles.map(normalizeGeneratedFile).filter(Boolean)
  );
  for (const fileName of PDF_FILES) {
    assert(
      generatedFiles.has(fileName),
      `Manifest generatedFiles is missing ${fileName}.`
    );
  }

  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    await readFile(path.resolve(scriptDirectory, "..", "package.json"), "utf8")
  );
  assert(
    manifest.version === packageJson.version,
    `Manifest version ${manifest.version} does not match package version `
      + `${packageJson.version}.`
  );
  assert(
    manifest.platform === process.platform,
    `Manifest platform ${manifest.platform} does not match verification host `
      + `${process.platform}.`
  );
  assert(
    manifest.arch === process.arch,
    `Manifest architecture ${manifest.arch} does not match verification host `
      + `${process.arch}.`
  );

  return manifest;
}

function fingerprintValue(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(8) : String(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    return `${value.constructor.name}:${value.length}:${sha256(bytes)}`;
  }
  if (value instanceof ArrayBuffer) {
    return `ArrayBuffer:${value.byteLength}:${sha256(Buffer.from(value))}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) =>
      fingerprintValue(item, seen, depth + 1)
    ).join(",")}]`;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (depth > 8) {
    return `[${value.constructor?.name ?? "Object"}]`;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);
  const keys = Object.keys(value).sort();
  const result = `{${keys.map((key) =>
    `${JSON.stringify(key)}:${fingerprintValue(value[key], seen, depth + 1)}`
  ).join(",")}}`;
  seen.delete(value);
  return result;
}

function numericValues(value, result = []) {
  if (typeof value === "number" && Number.isFinite(value)) {
    result.push(value);
  } else if (typeof value === "string") {
    const colorMatch = /^#([0-9a-f]{6})$/i.exec(value);
    if (colorMatch) {
      result.push(
        Number.parseInt(colorMatch[1].slice(0, 2), 16),
        Number.parseInt(colorMatch[1].slice(2, 4), 16),
        Number.parseInt(colorMatch[1].slice(4, 6), 16)
      );
    }
  } else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    for (const entry of value) {
      numericValues(entry, result);
    }
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      numericValues(entry, result);
    }
  }
  return result;
}

function containsRgbColor(value, expected) {
  const values = numericValues(value);
  for (let index = 0; index <= values.length - 3; index += 1) {
    const triplet = values.slice(index, index + 3);
    const asBytes = triplet.every((component) => component >= 0 && component <= 255)
      && Math.abs(triplet[0] - expected[0]) <= 2
      && Math.abs(triplet[1] - expected[1]) <= 2
      && Math.abs(triplet[2] - expected[2]) <= 2;
    const asFractions = triplet.every((component) => component >= 0 && component <= 1)
      && Math.abs(triplet[0] - (expected[0] / 255)) <= 0.01
      && Math.abs(triplet[1] - (expected[1] / 255)) <= 0.01
      && Math.abs(triplet[2] - (expected[2] / 255)) <= 0.01;
    if (asBytes || asFractions) {
      return true;
    }
  }
  return false;
}

function summarizeOperators(operatorList) {
  const allHasher = createHash("sha256");
  const fillHasher = createHash("sha256");
  let fillOperatorCount = 0;
  let imageOperatorCount = 0;
  let hasRoseFillColor = false;
  let hasBlueFillColor = false;

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const operator = operatorList.fnArray[index];
    const argumentsValue = operatorList.argsArray[index];
    const fragment = `${operator}:${fingerprintValue(argumentsValue)};`;
    allHasher.update(fragment);

    if (FILL_OPERATOR_IDS.has(operator)) {
      fillOperatorCount += 1;
      fillHasher.update(fragment);
      if (
        operator === OPS.setFillRGBColor
      ) {
        hasRoseFillColor ||= containsRgbColor(argumentsValue, [225, 29, 72]);
        hasBlueFillColor ||= containsRgbColor(argumentsValue, [37, 99, 235]);
      }
    }
    if (IMAGE_OPERATOR_IDS.has(operator)) {
      imageOperatorCount += 1;
    }
  }

  return {
    operatorCount: operatorList.fnArray.length,
    operatorHash: allHasher.digest("hex"),
    fillOperatorCount,
    fillHash: fillHasher.digest("hex"),
    imageOperatorCount,
    hasRoseFillColor,
    hasBlueFillColor
  };
}

async function inspectPdf(filePath) {
  const bytes = await readFile(filePath);
  assert(bytes.length >= 256, `${path.basename(filePath)} is unexpectedly small.`);
  assert(
    bytes.subarray(0, 5).toString("ascii") === "%PDF-",
    `${path.basename(filePath)} does not start with a PDF signature.`
  );
  assert(
    bytes.subarray(Math.max(0, bytes.length - 2048)).includes(Buffer.from("%%EOF")),
    `${path.basename(filePath)} does not contain a PDF end marker.`
  );

  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true
  });

  try {
    const document = await loadingTask.promise;
    assert(document.numPages > 0, `${path.basename(filePath)} has no pages.`);
    const pages = [];
    const textItems = [];
    const combinedOperatorHasher = createHash("sha256");
    const combinedFillHasher = createHash("sha256");
    let operatorCount = 0;
    let fillOperatorCount = 0;
    let imageOperatorCount = 0;
    let hasRoseFillColor = false;
    let hasBlueFillColor = false;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const operatorSummary = summarizeOperators(await page.getOperatorList());
      combinedOperatorHasher.update(operatorSummary.operatorHash);
      combinedFillHasher.update(operatorSummary.fillHash);
      operatorCount += operatorSummary.operatorCount;
      fillOperatorCount += operatorSummary.fillOperatorCount;
      imageOperatorCount += operatorSummary.imageOperatorCount;
      hasRoseFillColor ||= operatorSummary.hasRoseFillColor;
      hasBlueFillColor ||= operatorSummary.hasBlueFillColor;

      for (const item of textContent.items) {
        if (!("str" in item) || typeof item.str !== "string") {
          continue;
        }
        textItems.push({
          pageNumber,
          str: item.str,
          x: Number(item.transform?.[4]),
          y: Number(item.transform?.[5]),
          width: Number(item.width),
          height: Number(item.height)
        });
      }

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation
      });
    }

    return {
      fileName: path.basename(filePath),
      size: bytes.length,
      fileHash: sha256(bytes),
      pageCount: document.numPages,
      pages,
      textItems,
      joinedText: textItems.map((item) => item.str).join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      operatorCount,
      operatorHash: combinedOperatorHasher.digest("hex"),
      fillOperatorCount,
      fillHash: combinedFillHasher.digest("hex"),
      imageOperatorCount,
      hasRoseFillColor,
      hasBlueFillColor
    };
  } finally {
    await loadingTask.destroy();
  }
}

function firstPage(pdf) {
  assert(pdf.pages.length > 0, `${pdf.fileName} has no inspectable first page.`);
  return pdf.pages[0];
}

function assertPageSize(pdf, expectedWidth, expectedHeight, label) {
  const page = firstPage(pdf);
  assertNear(
    page.width,
    expectedWidth,
    PAGE_TOLERANCE_POINTS,
    `${label} width`
  );
  assertNear(
    page.height,
    expectedHeight,
    PAGE_TOLERANCE_POINTS,
    `${label} height`
  );
}

function findTextItem(pdf, text) {
  const exactItem = pdf.textItems.find((item) => item.str.trim() === text);
  assert(exactItem, `${pdf.fileName} is missing text marker ${text}.`);
  return exactItem;
}

function verifyAsymmetricMargins(pdf) {
  const page = firstPage(pdf);
  const topLeft = findTextItem(pdf, "TOPLEFT");
  const topRight = findTextItem(pdf, "TOPRIGHT");
  const bottomLeft = findTextItem(pdf, "BOTTOMLEFT");
  const bottomRight = findTextItem(pdf, "BOTTOMRIGHT");
  const expected = {
    top: 10 * POINTS_PER_MILLIMETRE,
    right: 20 * POINTS_PER_MILLIMETRE,
    bottom: 30 * POINTS_PER_MILLIMETRE,
    left: 40 * POINTS_PER_MILLIMETRE
  };

  assertNear(
    topLeft.x,
    expected.left,
    GEOMETRY_TOLERANCE_POINTS,
    "TOPLEFT left margin"
  );
  assertNear(
    bottomLeft.x,
    expected.left,
    GEOMETRY_TOLERANCE_POINTS,
    "BOTTOMLEFT left margin"
  );
  assertNear(
    topRight.x + topRight.width,
    page.width - expected.right,
    GEOMETRY_TOLERANCE_POINTS,
    "TOPRIGHT right margin"
  );
  assertNear(
    bottomRight.x + bottomRight.width,
    page.width - expected.right,
    GEOMETRY_TOLERANCE_POINTS,
    "BOTTOMRIGHT right margin"
  );
  assertNear(
    topLeft.y + topLeft.height,
    page.height - expected.top,
    GEOMETRY_TOLERANCE_POINTS,
    "TOPLEFT top margin"
  );
  assertNear(
    topRight.y + topRight.height,
    page.height - expected.top,
    GEOMETRY_TOLERANCE_POINTS,
    "TOPRIGHT top margin"
  );
  assertNear(
    bottomLeft.y,
    expected.bottom,
    GEOMETRY_TOLERANCE_POINTS,
    "BOTTOMLEFT bottom margin"
  );
  assertNear(
    bottomRight.y,
    expected.bottom,
    GEOMETRY_TOLERANCE_POINTS,
    "BOTTOMRIGHT bottom margin"
  );
}

function verifyScale(scale100, scale150) {
  const marker100 = findTextItem(scale100, "SCALEMARKER");
  const marker150 = findTextItem(scale150, "SCALEMARKER");
  assert(marker100.width > 0, "SCALEMARKER at scale 1.0 has no measurable width.");
  const ratio = marker150.width / marker100.width;
  assertNear(
    ratio,
    1.5,
    SCALE_RATIO_TOLERANCE,
    "SCALEMARKER width ratio"
  );
}

function verifyHeaderFooter(pdf) {
  const header = findTextItem(pdf, "WEBPDFSELFTEST");
  const body = findTextItem(pdf, "HEADERBODY");
  assert(
    header.y > body.y,
    "WEBPDFSELFTEST header text is not positioned above HEADERBODY."
  );
  assert(
    /1\s*\/\s*1/.test(pdf.joinedText),
    `${pdf.fileName} is missing the expected footer page number "1 / 1".`
  );
  const numericFooterItems = pdf.textItems.filter((item) =>
    /^[\d/\s]+$/.test(item.str) && item.str.trim()
  );
  assert(
    numericFooterItems.some((item) => item.y < body.y),
    `${pdf.fileName} footer page-number text is not below HEADERBODY.`
  );
}

function verifyRelativeCss(pdf) {
  const marker = findTextItem(pdf, "RELATIVECSS");
  const expectedX = 60
    + (RELATIVE_CSS_LEFT_MARGIN_MM * POINTS_PER_MILLIMETRE);
  assertNear(
    marker.x,
    expectedX,
    GEOMETRY_TOLERANCE_POINTS,
    "RELATIVECSS external margin-left position"
  );
  assert(
    pdf.imageOperatorCount > 0 || pdf.hasBlueFillColor,
    "The relative SVG asset did not produce an image operator or its blue fill."
  );
}

function verifyBackground(backgroundOn, backgroundOff) {
  findTextItem(backgroundOn, "BACKGROUNDMARKER");
  findTextItem(backgroundOff, "BACKGROUNDMARKER");
  assert(
    backgroundOn.pageCount === backgroundOff.pageCount,
    "Background on/off PDFs have different page counts."
  );
  assert(
    backgroundOn.fileHash !== backgroundOff.fileHash,
    "Background on/off PDFs are byte-identical."
  );
  assert(
    backgroundOn.operatorHash !== backgroundOff.operatorHash,
    "Background on/off PDFs have identical PDF.js operator hashes."
  );

  const reliableFillDifference = backgroundOn.hasRoseFillColor
    && !backgroundOff.hasRoseFillColor
    && backgroundOn.fillHash !== backgroundOff.fillHash;
  if (reliableFillDifference) {
    return "rose-fill-operator";
  }

  const structuralFallback = backgroundOn.fillHash !== backgroundOff.fillHash
    || (
      backgroundOn.operatorCount !== backgroundOff.operatorCount
      && backgroundOn.fillOperatorCount !== backgroundOff.fillOperatorCount
    );
  assert(
    structuralFallback,
    "Background color was not detectable and operator count/hash fallback "
      + "did not show a fill-structure difference."
  );
  return "operator-hash-fallback";
}

async function main() {
  const outputDirectory = parseOutputDirectory(process.argv.slice(2));
  await verifyManifest(outputDirectory);

  const inspected = new Map();
  for (const fileName of PDF_FILES) {
    inspected.set(
      fileName,
      await inspectPdf(path.join(outputDirectory, fileName))
    );
  }

  const a4Width = 210 * POINTS_PER_MILLIMETRE;
  const a4Height = 297 * POINTS_PER_MILLIMETRE;
  const asymmetric = inspected.get("code-asymmetric.pdf");
  assertPageSize(asymmetric, a4Width, a4Height, "A4 portrait");
  assert(
    firstPage(asymmetric).height > firstPage(asymmetric).width,
    "code-asymmetric.pdf is not portrait."
  );
  verifyAsymmetricMargins(asymmetric);

  const letterLandscape = inspected.get("letter-landscape.pdf");
  assertPageSize(letterLandscape, 11 * 72, 8.5 * 72, "Letter landscape");
  assert(
    firstPage(letterLandscape).width > firstPage(letterLandscape).height,
    "letter-landscape.pdf is not landscape."
  );

  verifyScale(
    inspected.get("scale-100.pdf"),
    inspected.get("scale-150.pdf")
  );
  verifyHeaderFooter(inspected.get("header-footer.pdf"));
  verifyRelativeCss(inspected.get("file-relative-assets.pdf"));
  const backgroundVerification = verifyBackground(
    inspected.get("background-on.pdf"),
    inspected.get("background-off.pdf")
  );

  console.log(
    `SELF_TEST_VERIFY_PASS ${outputDirectory} ${PDF_FILES.length} PDFs `
      + `background=${backgroundVerification}`
  );
}

main().catch((error) => {
  console.error(`SELF_TEST_VERIFY_FAIL ${error.message}`);
  process.exitCode = 1;
});
