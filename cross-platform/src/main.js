const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session
} = require("electron");
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
const MAX_HTML_SOURCE_LENGTH = 12 * 1024 * 1024;
const LOAD_TIMEOUT_MS = 30_000;
const DEFAULT_PREFERENCES = Object.freeze({
  language: "tr",
  theme: "light",
  accent: "#2563eb"
});

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

async function normalizePdfRequest(rawRequest) {
  if (!rawRequest || typeof rawRequest !== "object") {
    throw new Error("Invalid PDF request.");
  }

  const mode = rawRequest.mode === "file" ? "file" : "code";
  const normalized = {
    mode,
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
      throw new Error("Please select an HTML file.");
    }

    const fileStat = await fs.stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("The selected HTML path is not a file.");
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
      throw new Error("HTML code cannot be empty.");
    }
  }

  return normalized;
}

function millimetresToInches(value) {
  return value / 25.4;
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
      top: millimetresToInches(request.margins.top),
      right: millimetresToInches(request.margins.right),
      bottom: millimetresToInches(request.margins.bottom),
      left: millimetresToInches(request.margins.left)
    },
    headerTemplate,
    footerTemplate,
    preferCSSPageSize: false,
    generateTaggedPDF: true,
    generateDocumentOutline: true
  };
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

async function renderPdf(request) {
  const requestKey = JSON.stringify(request);
  if (cachedPdf && cachedRequestKey === requestKey) {
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

function registerIpcHandlers() {
  registerTrustedHandler("source:select-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select HTML file",
      properties: ["openFile"],
      filters: [
        { name: "HTML", extensions: ["html", "htm"] },
        { name: "All files", extensions: ["*"] }
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
    const pdfBuffer = await renderPdf(request);
    return {
      bytes: pdfBuffer,
      size: pdfBuffer.length
    };
  });

  registerTrustedHandler("pdf:save", async (_event, rawRequest) => {
    const request = await normalizePdfRequest(rawRequest);
    const pdfBuffer = await renderPdf(request);
    const suggestedName = request.mode === "file"
      ? `${path.parse(request.filePath).name}.pdf`
      : "WebPDF-document.pdf";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save PDF",
      defaultPath: path.join(app.getPath("documents"), suggestedName),
      filters: [{ name: "PDF document", extensions: ["pdf"] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const finalPath = result.filePath.toLowerCase().endsWith(".pdf")
      ? result.filePath
      : `${result.filePath}.pdf`;
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

    return {
      canceled: false,
      filePath: finalPath,
      size: pdfBuffer.length
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

async function runSmokeTest() {
  const samplePath = path.resolve(
    app.getAppPath(),
    "..",
    "samples",
    "quality-test",
    "quality-test.html"
  );
  const outputPath = path.join(os.tmpdir(), "webpdf-studio-smoke.pdf");
  const request = await normalizePdfRequest({
    mode: "file",
    filePath: samplePath,
    pageSize: "A4",
    landscape: false,
    printBackground: true,
    displayHeaderFooter: false,
    scale: 1,
    margins: { top: 12, right: 12, bottom: 12, left: 12 }
  });
  const buffer = await renderPdf(request);
  await fs.writeFile(outputPath, buffer);
  console.log(`SMOKE_TEST_PASS ${outputPath} ${buffer.length}`);
}

app.whenReady().then(async () => {
  await registerApplicationProtocol();

  if (process.argv.includes("--smoke-test")) {
    try {
      await runSmokeTest();
      app.exit(0);
    } catch (error) {
      console.error("SMOKE_TEST_FAIL", error);
      app.exit(1);
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
