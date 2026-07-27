const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session
} = require("electron");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const APP_ORIGIN = "app://bundle";
const RENDERER_ROOT = path.join(__dirname, "renderer");
const PREFERENCES_FILE = "preferences.json";
const PRINT_PAGE_NAME = "webpdf-settings";
const MAX_HTML_SOURCE_LENGTH = 12 * 1024 * 1024;
const LOAD_TIMEOUT_MS = 30_000;
const DEFAULT_PREFERENCES = Object.freeze({
  language: "tr",
  theme: "light",
  accent: "#2563eb"
});
const MAIN_TRANSLATIONS = Object.freeze({
  tr: {
    selectHtmlTitle: "HTML dosyası seç",
    savePdfTitle: "PDF'yi kaydet",
    htmlFilter: "HTML dosyaları",
    allFilesFilter: "Tüm dosyalar",
    pdfFilter: "PDF belgesi",
    invalidHtmlFile: "Lütfen bir HTML dosyası seçin.",
    pathIsNotFile: "Seçilen HTML yolu bir dosya değil.",
    emptyHtmlCode: "HTML kodu boş olamaz.",
    defaultPdfName: "WebPDF-belgesi.pdf"
  },
  en: {
    selectHtmlTitle: "Select an HTML file",
    savePdfTitle: "Save PDF",
    htmlFilter: "HTML files",
    allFilesFilter: "All files",
    pdfFilter: "PDF document",
    invalidHtmlFile: "Please select an HTML file.",
    pathIsNotFile: "The selected HTML path is not a file.",
    emptyHtmlCode: "HTML code cannot be empty.",
    defaultPdfName: "WebPDF-document.pdf"
  }
});
const SELF_TEST_REQUESTED = process.argv.includes("--smoke-test")
  || Boolean(getCommandLineValue("self-test-output"));

if (SELF_TEST_REQUESTED) {
  const testProfilePath = path.join(
    os.tmpdir(),
    `webpdf-studio-self-test-profile-${process.pid}`
  );
  fsSync.mkdirSync(testProfilePath, { recursive: true });
  app.setPath("userData", testProfilePath);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let mainWindow;
let activeRenderWindow;
let activeOperationId = 0;
let cachedPdf = null;
let cachedRequestKey = "";
let isSelfTestRunning = false;

function isTrustedSender(event) {
  return Boolean(
    event.senderFrame
    && event.senderFrame.url.startsWith(`${APP_ORIGIN}/`)
  );
}

function registerTrustedHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event)) {
      throw new Error("Untrusted application request.");
    }

    return handler(event, ...args);
  });
}

function resolveRendererPath(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.host !== "bundle") {
    return null;
  }

  const requestedPath = decodeURIComponent(parsedUrl.pathname);
  const relativePath = requestedPath === "/"
    ? "index.html"
    : requestedPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(RENDERER_ROOT, relativePath);
  const rendererPrefix = `${path.resolve(RENDERER_ROOT)}${path.sep}`;

  if (
    resolvedPath !== path.join(RENDERER_ROOT, "index.html")
    && !resolvedPath.startsWith(rendererPrefix)
  ) {
    return null;
  }

  return resolvedPath;
}

async function registerApplicationProtocol() {
  protocol.handle("app", (request) => {
    const filePath = resolveRendererPath(request.url);
    if (!filePath) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

async function createMainWindow(showWhenReady = true, query = "") {
  const window = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    title: "WebPDF Studio",
    backgroundColor: "#f3f6fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) {
      event.preventDefault();
    }
  });
  await window.loadURL(`${APP_ORIGIN}/index.html${query}`);
  if (showWhenReady) {
    window.show();
  }

  return window;
}

function cleanString(value, maximumLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.slice(0, maximumLength);
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function normalizeLanguage(value) {
  return value === "en" ? "en" : "tr";
}

function mainText(language, key) {
  return MAIN_TRANSLATIONS[normalizeLanguage(language)][key];
}

async function normalizePdfRequest(rawRequest) {
  if (!rawRequest || typeof rawRequest !== "object") {
    throw new Error("Invalid PDF request.");
  }

  const mode = rawRequest.mode === "file" ? "file" : "code";
  const language = normalizeLanguage(rawRequest.language);
  const normalized = {
    mode,
    language,
    filePath: "",
    htmlSource: "",
    pageSize: rawRequest.pageSize === "Letter" ? "Letter" : "A4",
    landscape: Boolean(rawRequest.landscape),
    printBackground: rawRequest.printBackground !== false,
    displayHeaderFooter: Boolean(rawRequest.displayHeaderFooter),
    scale: clampNumber(rawRequest.scale, 0.1, 2, 1),
    margins: {
      top: clampNumber(rawRequest.margins?.top, 0, 100, 12),
      right: clampNumber(rawRequest.margins?.right, 0, 100, 12),
      bottom: clampNumber(rawRequest.margins?.bottom, 0, 100, 12),
      left: clampNumber(rawRequest.margins?.left, 0, 100, 12)
    }
  };

  if (mode === "file") {
    const filePath = path.resolve(cleanString(rawRequest.filePath, 32_768));
    const extension = path.extname(filePath).toLowerCase();
    if (![".html", ".htm"].includes(extension)) {
      throw new Error(mainText(language, "invalidHtmlFile"));
    }

    const fileStat = await fs.stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(mainText(language, "pathIsNotFile"));
    }

    normalized.filePath = filePath;
    normalized.fileIdentity = {
      size: fileStat.size,
      modified: fileStat.mtimeMs
    };
  } else {
    normalized.htmlSource = cleanString(
      rawRequest.htmlSource,
      MAX_HTML_SOURCE_LENGTH
    );
    if (!normalized.htmlSource.trim()) {
      throw new Error(mainText(language, "emptyHtmlCode"));
    }
  }

  return normalized;
}

function createPrintOptions(request) {
  const headerTemplate = request.displayHeaderFooter
    ? '<div style="font-size:8px;width:100%;padding:0 12mm;color:#64748b;">'
      + '<span class="title"></span></div>'
    : "";
  const footerTemplate = request.displayHeaderFooter
    ? '<div style="font-size:8px;width:100%;padding:0 12mm;color:#64748b;'
      + 'text-align:center;"><span class="pageNumber"></span> / '
      + '<span class="totalPages"></span></div>'
    : "";

  return {
    landscape: request.landscape,
    displayHeaderFooter: request.displayHeaderFooter,
    printBackground: request.printBackground,
    scale: request.scale,
    pageSize: request.pageSize,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    headerTemplate,
    footerTemplate,
    preferCSSPageSize: true,
    generateTaggedPDF: true,
    generateDocumentOutline: true
  };
}

function createPrintPageCss(request) {
  const orientation = request.landscape ? "landscape" : "portrait";
  const marginValue = [
    request.margins.top,
    request.margins.right,
    request.margins.bottom,
    request.margins.left
  ].map((value) => `${value}mm`).join(" ");
  const descriptors = [
    `size: ${request.pageSize} ${orientation} !important`,
    `margin: ${marginValue} !important`
  ].join("; ");

  return [
    `html, body, body * { page: ${PRINT_PAGE_NAME} !important; }`,
    `@page ${PRINT_PAGE_NAME} { ${descriptors}; }`,
    `@page ${PRINT_PAGE_NAME}:first { margin: ${marginValue} !important; }`,
    `@page ${PRINT_PAGE_NAME}:left { margin: ${marginValue} !important; }`,
    `@page ${PRINT_PAGE_NAME}:right { margin: ${marginValue} !important; }`,
    `@page ${PRINT_PAGE_NAME}:blank { margin: ${marginValue} !important; }`
  ].join("\n");
}

async function installPrintPageCss(renderWindow, request) {
  const contentsDebugger = renderWindow.webContents.debugger;
  contentsDebugger.attach("1.3");
  await contentsDebugger.sendCommand("DOM.enable");
  await contentsDebugger.sendCommand("CSS.enable");
  const frameTree = await contentsDebugger.sendCommand("Page.getFrameTree");
  const styleSheet = await contentsDebugger.sendCommand(
    "CSS.createStyleSheet",
    { frameId: frameTree.frameTree.frame.id }
  );
  await contentsDebugger.sendCommand("CSS.setStyleSheetText", {
    styleSheetId: styleSheet.styleSheetId,
    text: createPrintPageCss(request)
  });
}

function waitForDocumentReady(renderWindow, operationId) {
  const documentReady = renderWindow.webContents.executeJavaScript(`
    (async () => {
      if (document.readyState !== "complete") {
        await new Promise((resolve) => {
          window.addEventListener("load", resolve, { once: true });
        });
      }
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await Promise.all(Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }));
      await new Promise((resolve) => requestAnimationFrame(
        () => requestAnimationFrame(resolve)
      ));
      return true;
    })();
  `, true);

  const timeout = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("HTML loading timed out.")),
      LOAD_TIMEOUT_MS
    );
  });

  return Promise.race([documentReady, timeout]).then(() => {
    if (operationId !== activeOperationId || renderWindow.isDestroyed()) {
      throw new Error("Operation cancelled.");
    }
  });
}

async function renderPdf(request, options = {}) {
  const requestKey = JSON.stringify(request);
  if (!options.force && cachedPdf && cachedRequestKey === requestKey) {
    return cachedPdf;
  }

  activeOperationId += 1;
  const operationId = activeOperationId;
  const renderSession = session.fromPartition("webpdf-render");
  renderSession.setPermissionRequestHandler((_webContents, _permission, reply) => {
    reply(false);
  });

  const renderWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      partition: "webpdf-render"
    }
  });
  activeRenderWindow = renderWindow;
  renderWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  renderWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  try {
    if (request.mode === "file") {
      await renderWindow.loadFile(request.filePath);
    } else {
      const encodedSource = encodeURIComponent(request.htmlSource);
      await renderWindow.loadURL(`data:text/html;charset=utf-8,${encodedSource}`);
    }

    await waitForDocumentReady(renderWindow, operationId);
    await installPrintPageCss(renderWindow, request);
    const pdfBuffer = await renderWindow.webContents.printToPDF(
      createPrintOptions(request)
    );

    if (
      pdfBuffer.length < 5
      || pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      throw new Error("The browser did not return a valid PDF.");
    }

    cachedPdf = pdfBuffer;
    cachedRequestKey = requestKey;
    return pdfBuffer;
  } finally {
    if (
      !renderWindow.isDestroyed()
      && renderWindow.webContents.debugger.isAttached()
    ) {
      renderWindow.webContents.debugger.detach();
    }
    if (!renderWindow.isDestroyed()) {
      renderWindow.destroy();
    }
    if (activeRenderWindow === renderWindow) {
      activeRenderWindow = null;
    }
  }
}

async function loadPreferences() {
  try {
    const preferencesPath = path.join(
      app.getPath("userData"),
      PREFERENCES_FILE
    );
    const saved = JSON.parse(await fs.readFile(preferencesPath, "utf8"));
    return normalizePreferences(saved);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function normalizePreferences(rawPreferences) {
  const language = rawPreferences?.language === "en" ? "en" : "tr";
  const theme = rawPreferences?.theme === "dark" ? "dark" : "light";
  const accent = /^#[0-9a-f]{6}$/i.test(rawPreferences?.accent)
    ? rawPreferences.accent.toLowerCase()
    : DEFAULT_PREFERENCES.accent;

  return { language, theme, accent };
}

async function savePreferences(rawPreferences) {
  const preferences = normalizePreferences(rawPreferences);
  const preferencesPath = path.join(app.getPath("userData"), PREFERENCES_FILE);
  await fs.mkdir(path.dirname(preferencesPath), { recursive: true });
  await fs.writeFile(
    preferencesPath,
    `${JSON.stringify(preferences, null, 2)}\n`,
    "utf8"
  );
  return preferences;
}

async function writePdfSafely(finalPath, pdfBuffer) {
  const temporaryPath = path.join(
    path.dirname(finalPath),
    `.${path.basename(finalPath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    await fs.writeFile(temporaryPath, pdfBuffer, { flag: "wx" });
    await fs.rm(finalPath, { force: true });
    await fs.rename(temporaryPath, finalPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

function registerIpcHandlers() {
  registerTrustedHandler("source:select-file", async (_event, rawLanguage) => {
    const language = normalizeLanguage(rawLanguage);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mainText(language, "selectHtmlTitle"),
      properties: ["openFile"],
      filters: [
        {
          name: mainText(language, "htmlFilter"),
          extensions: ["html", "htm"]
        },
        { name: mainText(language, "allFilesFilter"), extensions: ["*"] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    return {
      filePath,
      displayName: path.basename(filePath)
    };
  });

  registerTrustedHandler("pdf:preview", async (_event, rawRequest) => {
    const request = await normalizePdfRequest(rawRequest);
    const pdfBuffer = await renderPdf(request, { force: true });
    return {
      bytes: pdfBuffer,
      size: pdfBuffer.length
    };
  });

  registerTrustedHandler("pdf:save", async (_event, rawRequest) => {
    const request = await normalizePdfRequest(rawRequest);
    const pdfBuffer = await renderPdf(request, {
      force: request.mode === "file"
    });
    const suggestedName = request.mode === "file"
      ? `${path.parse(request.filePath).name}.pdf`
      : mainText(request.language, "defaultPdfName");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: mainText(request.language, "savePdfTitle"),
      defaultPath: path.join(app.getPath("documents"), suggestedName),
      filters: [{
        name: mainText(request.language, "pdfFilter"),
        extensions: ["pdf"]
      }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const finalPath = result.filePath.toLowerCase().endsWith(".pdf")
      ? result.filePath
      : `${result.filePath}.pdf`;
    await writePdfSafely(finalPath, pdfBuffer);

    return {
      canceled: false,
      filePath: finalPath,
      size: pdfBuffer.length,
      bytes: pdfBuffer
    };
  });

  registerTrustedHandler("pdf:cancel", () => {
    activeOperationId += 1;
    if (activeRenderWindow && !activeRenderWindow.isDestroyed()) {
      activeRenderWindow.destroy();
      activeRenderWindow = null;
    }
    return true;
  });

  registerTrustedHandler("preferences:load", () => loadPreferences());
  registerTrustedHandler(
    "preferences:save",
    (_event, preferences) => savePreferences(preferences)
  );
  registerTrustedHandler("app:platform", () => ({
    platform: process.platform,
    version: app.getVersion(),
    productName: app.getName()
  }));
}

function createTestRequest(htmlSource, overrides = {}) {
  return {
    mode: "code",
    htmlSource,
    pageSize: "A4",
    landscape: false,
    printBackground: true,
    displayHeaderFooter: false,
    scale: 1,
    margins: { top: 12, right: 12, bottom: 12, left: 12 },
    ...overrides
  };
}

async function writeSelfTestPdf(outputDirectory, fileName, rawRequest) {
  const request = await normalizePdfRequest(rawRequest);
  const buffer = await renderPdf(request, { force: true });
  const outputPath = path.join(outputDirectory, fileName);
  await fs.writeFile(outputPath, buffer);
  return { buffer, outputPath };
}

async function readUiSelfTestSnapshot(window) {
  return window.webContents.executeJavaScript(`
    (() => ({
      status: document.querySelector("#statusText")?.textContent ?? "",
      language: document.querySelector("#languageSelect")?.value ?? "",
      subtitle: document.querySelector("[data-i18n='brandSubtitle']")
        ?.textContent ?? "",
      theme: document.documentElement.dataset.theme ?? "",
      accent: getComputedStyle(document.documentElement)
        .getPropertyValue("--accent").trim(),
      marginTop: document.querySelector("#marginTop")?.value ?? "",
      pageLabel: document.querySelector(".page-label")?.textContent ?? "",
      pdfSize: document.querySelector("#pdfSize")?.textContent ?? "",
      canvasCount: document.querySelectorAll(".pdf-page canvas").length,
      pdfPagesHidden: document.querySelector("#pdfPages")
        ?.classList.contains("hidden") ?? true,
      loadingHidden: document.querySelector("#loadingState")
        ?.classList.contains("hidden") ?? false
    }))();
  `, true);
}

async function waitForUiSelfTest(window, predicate, description) {
  const deadline = Date.now() + 20_000;
  let snapshot = {};

  while (Date.now() < deadline) {
    if (window.isDestroyed()) {
      throw new Error(`UI self-test window closed while waiting for ${description}.`);
    }
    snapshot = await readUiSelfTestSnapshot(window);
    if (predicate(snapshot)) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `UI self-test timed out waiting for ${description}: `
    + JSON.stringify(snapshot)
  );
}

async function waitForSelfTestPreferences(expected) {
  const deadline = Date.now() + 10_000;
  let preferences = {};

  while (Date.now() < deadline) {
    preferences = await loadPreferences();
    if (
      preferences.language === expected.language
      && preferences.theme === expected.theme
      && preferences.accent === expected.accent
    ) {
      return preferences;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `UI preferences were not saved before timeout: ${JSON.stringify(preferences)}`
  );
}

async function runUiSelfTest() {
  mainWindow = await createMainWindow(false, "?preview=1");
  const initial = await waitForUiSelfTest(
    mainWindow,
    (snapshot) => (
      snapshot.status === "Gerçek PDF önizlemesi hazır."
      && snapshot.canvasCount > 0
    ),
    "the initial PDF preview"
  );
  const dirtyStatus = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const language = document.querySelector("#languageSelect");
      language.value = "en";
      language.dispatchEvent(new Event("change", { bubbles: true }));
      document.querySelector("#themeButton").click();
      const accent = document.querySelector("#accentPicker");
      accent.value = "#db2777";
      accent.dispatchEvent(new Event("input", { bubbles: true }));
      accent.dispatchEvent(new Event("change", { bubbles: true }));
      const marginTop = document.querySelector("#marginTop");
      marginTop.value = "25";
      marginTop.dispatchEvent(new Event("input", { bubbles: true }));
      marginTop.dispatchEvent(new Event("change", { bubbles: true }));
      return document.querySelector("#statusText").textContent;
    })();
  `, true);
  if (dirtyStatus !== "Settings changed; updating the preview…") {
    throw new Error(`UI did not mark the preview outdated: ${dirtyStatus}`);
  }

  const updated = await waitForUiSelfTest(
    mainWindow,
    (snapshot) => (
      snapshot.status === "Actual PDF preview is ready."
      && snapshot.language === "en"
      && snapshot.subtitle === "Professional HTML → PDF"
      && snapshot.theme === "dark"
      && snapshot.accent === "#db2777"
      && snapshot.marginTop === "25"
      && snapshot.pageLabel.startsWith("Page ")
      && snapshot.canvasCount > 0
    ),
    "the automatic preview refresh and appearance changes"
  );
  await waitForSelfTestPreferences({
    language: "en",
    theme: "dark",
    accent: "#db2777"
  });
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const editor = document.querySelector("#htmlEditor");
      editor.value = "";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    })();
  `, true);
  const invalidSource = await waitForUiSelfTest(
    mainWindow,
    (snapshot) => (
      snapshot.status === (
        "The operation could not be completed: HTML code cannot be empty."
      )
      && snapshot.canvasCount > 0
      && snapshot.pdfPagesHidden === false
      && snapshot.loadingHidden === true
    ),
    "stable invalid-source feedback with the previous preview still visible"
  );
  mainWindow.destroy();
  mainWindow = null;

  mainWindow = await createMainWindow(false);
  const restored = await waitForUiSelfTest(
    mainWindow,
    (snapshot) => (
      snapshot.language === "en"
      && snapshot.subtitle === "Professional HTML → PDF"
      && snapshot.theme === "dark"
      && snapshot.accent === "#db2777"
    ),
    "persisted language, theme and accent preferences"
  );
  mainWindow.destroy();
  mainWindow = null;

  return {
    passed: true,
    dirtyStatus,
    initialPdfSize: initial.pdfSize,
    updatedPdfSize: updated.pdfSize,
    invalidSourceHandled: invalidSource.loadingHidden,
    preferencesRestored: (
      restored.language === "en"
      && restored.theme === "dark"
      && restored.accent === "#db2777"
    )
  };
}

async function runSelfTest(outputDirectory) {
  const resolvedOutput = path.resolve(outputDirectory);
  await fs.mkdir(resolvedOutput, { recursive: true });

  const markerHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page invoice { size: Letter landscape; margin: 0; }
    html, body { width: 100%; height: 100%; margin: 0; page: invoice; }
    body { font: 12px Arial, sans-serif; }
    .marker { position: fixed; line-height: 12px; }
    .tl { top: 0; left: 0; }
    .tr { top: 0; right: 0; }
    .bl { bottom: 0; left: 0; }
    .br { right: 0; bottom: 0; }
  </style>
</head>
<body>
  <span class="marker tl">TOPLEFT</span>
  <span class="marker tr">TOPRIGHT</span>
  <span class="marker bl">BOTTOMLEFT</span>
  <span class="marker br">BOTTOMRIGHT</span>
</body>
</html>`;
  const scaleHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  body { font: 20px Arial, sans-serif; }
</style></head><body>SCALEMARKER</body></html>`;
  const backgroundHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  #background-box {
    width: 240px;
    height: 80px;
    color: white;
    background: #e11d48;
  }
</style></head><body>
  <div id="background-box">BACKGROUNDMARKER</div>
</body></html>`;
  const headerHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>WEBPDFSELFTEST</title>
<style>html, body { margin: 0; }</style></head>
<body>HEADERBODY</body></html>`;

  const generatedFiles = [];
  const writePdf = async (fileName, request) => {
    const result = await writeSelfTestPdf(resolvedOutput, fileName, request);
    generatedFiles.push(fileName);
    return result.buffer;
  };

  await writePdf(
    "code-asymmetric.pdf",
    createTestRequest(markerHtml, {
      margins: { top: 10, right: 20, bottom: 30, left: 40 }
    })
  );
  await writePdf(
    "letter-landscape.pdf",
    createTestRequest("<!doctype html><html><body>LETTERLANDSCAPE</body></html>", {
      pageSize: "Letter",
      landscape: true
    })
  );
  await writePdf(
    "scale-100.pdf",
    createTestRequest(scaleHtml, { scale: 1 })
  );
  await writePdf(
    "scale-150.pdf",
    createTestRequest(scaleHtml, { scale: 1.5 })
  );
  await writePdf(
    "background-on.pdf",
    createTestRequest(backgroundHtml, { printBackground: true })
  );
  await writePdf(
    "background-off.pdf",
    createTestRequest(backgroundHtml, { printBackground: false })
  );
  await writePdf(
    "header-footer.pdf",
    createTestRequest(headerHtml, {
      displayHeaderFooter: true,
      margins: { top: 18, right: 12, bottom: 18, left: 12 }
    })
  );

  const fixtureDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "webpdf-studio-fixture-")
  );
  try {
    const fixtureHtmlPath = path.join(fixtureDirectory, "relative fixture.html");
    await fs.writeFile(
      path.join(fixtureDirectory, "relative.css"),
      [
        "html, body { margin: 0; }",
        ".relative-marker { margin-left: 80px; font: 16px Arial, sans-serif; }",
        "img { width: 24px; height: 24px; }"
      ].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(fixtureDirectory, "marker.svg"),
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">',
        '<rect width="24" height="24" fill="#2563eb"/>',
        "</svg>"
      ].join(""),
      "utf8"
    );
    await fs.writeFile(
      fixtureHtmlPath,
      [
        "<!doctype html><html><head><meta charset=\"utf-8\">",
        "<link rel=\"stylesheet\" href=\"relative.css\"></head><body>",
        "<div class=\"relative-marker\">RELATIVECSS</div>",
        "<img src=\"marker.svg\" alt=\"relative svg\">",
        "</body></html>"
      ].join(""),
      "utf8"
    );
    await writePdf("file-relative-assets.pdf", {
      mode: "file",
      filePath: fixtureHtmlPath,
      pageSize: "A4",
      landscape: false,
      printBackground: true,
      displayHeaderFooter: false,
      scale: 1,
      margins: { top: 12, right: 12, bottom: 12, left: 12 }
    });
  } finally {
    await fs.rm(fixtureDirectory, { recursive: true, force: true });
  }

  const cacheRequest = await normalizePdfRequest(
    createTestRequest(
      "<!doctype html><html><body>CACHEMARKER</body></html>"
    )
  );
  const firstCachedBuffer = await renderPdf(cacheRequest, { force: true });
  const secondCachedBuffer = await renderPdf(cacheRequest);
  const saveFlowPath = path.join(resolvedOutput, "save-flow.pdf");
  await fs.writeFile(saveFlowPath, "stale file that must be replaced", "utf8");
  await writePdfSafely(saveFlowPath, firstCachedBuffer);
  const savedBuffer = await fs.readFile(saveFlowPath);
  generatedFiles.push("save-flow.pdf");
  const ui = await runUiSelfTest();
  const manifest = {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    cacheEqual: firstCachedBuffer.equals(secondCachedBuffer),
    saveFlow: {
      exactBytes: firstCachedBuffer.equals(savedBuffer),
      size: savedBuffer.length
    },
    ui,
    generatedFiles
  };
  const manifestPath = path.join(resolvedOutput, "self-test.json");
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  console.log(`SELF_TEST_PASS ${manifestPath}`);
  return manifest;
}

function getCommandLineValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : "";
}

app.whenReady().then(async () => {
  await registerApplicationProtocol();

  const selfTestOutput = getCommandLineValue("self-test-output");
  if (process.argv.includes("--smoke-test") || selfTestOutput) {
    isSelfTestRunning = true;
    registerIpcHandlers();
    try {
      const outputDirectory = selfTestOutput
        || path.join(os.tmpdir(), "webpdf-studio-self-test");
      await runSelfTest(outputDirectory);
      app.exit(0);
    } catch (error) {
      console.error("SELF_TEST_FAIL", error);
      app.exit(1);
    } finally {
      isSelfTestRunning = false;
    }
    return;
  }

  registerIpcHandlers();
  const captureUi = process.argv.includes("--capture-ui");
  const capturePreview = process.argv.includes("--capture-preview");
  const isCapture = captureUi || capturePreview;
  mainWindow = await createMainWindow(
    !isCapture,
    capturePreview ? "?preview=1" : ""
  );

  if (isCapture) {
    const delay = capturePreview ? 6_000 : 1_200;
    await new Promise((resolve) => setTimeout(resolve, delay));
    const captureName = capturePreview
      ? "webpdf-studio-preview-ui.png"
      : "webpdf-studio-ui.png";
    const capturePath = path.join(os.tmpdir(), captureName);
    const image = await mainWindow.webContents.capturePage();
    await fs.writeFile(capturePath, image.toPNG());
    console.log(`UI_CAPTURE_PASS ${capturePath}`);
    app.exit(0);
    return;
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!isSelfTestRunning && process.platform !== "darwin") {
    app.quit();
  }
});
