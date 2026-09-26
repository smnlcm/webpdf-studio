// WebPDF Studio v4.02 - main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const { PDFDocument } = require('pdf-lib');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'WebPDF Studio v4.0.1 by mavvi.online',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    show: true,
    center: true
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenu(null);

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[WebPDF] Failed to load:', code, desc);
  });
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    console.log('[WebPDF Renderer]', msg);
  });

  mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(false);
    }
  }, 1000);
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

function createPdfWorker() {
  const workerPath = path.join(__dirname, '../workers/pdfWorker.js');
  return new Worker(workerPath);
}

// 1. CREATE PDF - Renders HTML to PDF and writes directly to disk
ipcMain.handle('create-pdf', async (event, params, legacyOpts) => {
  let htmlContent;
  let options = {};
  let savePath = null;

  if (typeof params === 'object' && params !== null && params.htmlContent) {
    htmlContent = params.htmlContent;
    options = params.options || {};
    savePath = params.savePath || null;
  } else {
    // Legacy signature: (htmlContent, options)
    htmlContent = params;
    options = legacyOpts || {};
  }

  if (!htmlContent || !htmlContent.trim()) {
    throw new Error('HTML content is empty');
  }

  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });

  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    // Wait for fonts and complete layout rendering
    try {
      await win.webContents.executeJavaScript('document.fonts ? document.fonts.ready : Promise.resolve()');
    } catch (_) {}

    await new Promise((resolve) => setTimeout(resolve, 150));

    const buf = await win.webContents.printToPDF({
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      printBackground: true,
      landscape: options?.orientation === 'landscape',
      pageSize: options?.paper || 'A4',
      preferCSSPageSize: true
    });

    if (!buf || buf.length < 100) {
      throw new Error('PDF generation produced an empty or invalid buffer');
    }

    // Apply PDF Metadata Watermark
    let finalBuf = buf;
    try {
      const pdfDoc = await PDFDocument.load(buf);
      pdfDoc.setCreator("WebPDF Studio v4.0.1 by mavvi.online - https://mavvi.online");
      pdfDoc.setProducer("mavvi.online");
      finalBuf = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    } catch (_) {
      finalBuf = buf;
    }

    // If a savePath was designated, save directly to disk
    if (savePath) {
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(savePath, finalBuf);

      if (!fs.existsSync(savePath)) {
        throw new Error('PDF file was not created on disk: ' + savePath);
      }
      const st = fs.statSync(savePath);
      if (st.size === 0) {
        throw new Error('PDF file was written with 0 bytes: ' + savePath);
      }

      return {
        success: true,
        path: savePath,
        size: st.size,
        sizeKB: Math.round(st.size / 1024)
      };
    }

    return finalBuf;
  } finally {
    if (!win.isDestroyed()) win.close();
  }
});

// 2. MERGE - Merges multiple PDFs with progress and saves directly to disk
ipcMain.handle('merge-pdfs', async (event, params) => {
  let filePaths;
  let savePath = null;

  if (Array.isArray(params)) {
    filePaths = params;
  } else if (params && typeof params === 'object') {
    filePaths = params.filePaths;
    savePath = params.savePath;
  }

  if (!filePaths || !filePaths.length) {
    throw new Error('No files selected for merging');
  }

  return new Promise((resolve, reject) => {
    const worker = createPdfWorker();

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        event.sender.send('merge-progress', msg);
      } else if (msg.type === 'done') {
        worker.terminate();
        if (msg.path) {
          if (!fs.existsSync(msg.path)) {
            return reject(new Error('Merged file was not created: ' + msg.path));
          }
          const st = fs.statSync(msg.path);
          if (st.size === 0) {
            return reject(new Error('Merged file is 0 bytes: ' + msg.path));
          }
          resolve({
            success: true,
            path: msg.path,
            size: st.size,
            sizeKB: Math.round(st.size / 1024),
            pages: msg.pages
          });
        } else {
          resolve({ success: true, buffer: msg.buffer, pages: msg.pages });
        }
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.error));
      }
    });

    worker.on('error', (err) => {
      worker.terminate();
      reject(err);
    });

    worker.postMessage({ op: 'merge', filePaths, savePath });
  });
});

// 3. SPLIT - Splits PDF with single-page mode, progress, and dedicated output directory
ipcMain.handle('split-pdf', async (event, params, legacyRule) => {
  let filePath;
  let rule;
  let outputDir = null;

  if (typeof params === 'object' && params !== null && params.filePath) {
    filePath = params.filePath;
    rule = params.rule;
    outputDir = params.outputDir || null;
  } else {
    filePath = params;
    rule = legacyRule;
  }

  if (!filePath) throw new Error('No file path provided for splitting');
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);

  return new Promise((resolve, reject) => {
    const worker = createPdfWorker();

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        event.sender.send('split-progress', msg);
      } else if (msg.type === 'done') {
        worker.terminate();
        // Verify output files exist and size > 0
        const verified = [];
        for (const item of msg.outputs) {
          const p = typeof item === 'string' ? item : item.path;
          if (fs.existsSync(p)) {
            const st = fs.statSync(p);
            if (st.size > 0) {
              verified.push({
                path: p,
                name: path.basename(p),
                size: st.size,
                sizeKB: Math.round(st.size / 1024),
                page: item.page,
                range: item.range
              });
            }
          }
        }

        resolve({
          success: true,
          outputs: verified,
          outputDir: msg.outputDir,
          totalPages: msg.totalPages
        });
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.error));
      }
    });

    worker.on('error', (err) => {
      worker.terminate();
      reject(err);
    });

    worker.postMessage({ op: 'split', filePath, rule, outputDir });
  });
});

// 4. GET PDF INFO - Reads page count and file size
ipcMain.handle('get-pdf-info', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const st = fs.statSync(filePath);
    const bytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPageCount();
    return {
      success: true,
      path: filePath,
      name: path.basename(filePath),
      size: st.size,
      sizeKB: Math.round(st.size / 1024),
      pages
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. FILE DIALOGS
ipcMain.handle('open-files', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Documents', extensions: ['pdf', 'PDF'] }],
    title: 'Select PDF Documents'
  });
  return res.filePaths || [];
});

ipcMain.handle('save-file', async (event, defaultName) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'document.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    title: 'Choose Destination - WebPDF Studio v4.02'
  });
  return res.filePath || null;
});

ipcMain.handle('select-folder', async (event, defaultPath) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultPath || undefined,
    title: 'Choose Output Folder'
  });
  return (res.filePaths && res.filePaths[0]) || null;
});

// 6. SAVE PDF FILE - Universal robust binary converter
ipcMain.handle('save-pdf-file', async (event, filePath, buffer) => {
  try {
    if (!filePath) return { success: false, error: 'No file path provided - user cancelled?' };
    if (!buffer) return { success: false, error: 'No buffer data provided' };

    let data;
    if (Buffer.isBuffer(buffer)) {
      data = buffer;
    } else if (buffer instanceof Uint8Array) {
      data = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else if (buffer instanceof ArrayBuffer) {
      data = Buffer.from(buffer);
    } else if (Array.isArray(buffer)) {
      data = Buffer.from(buffer);
    } else if (buffer && buffer.data && Array.isArray(buffer.data)) {
      data = Buffer.from(buffer.data);
    } else if (typeof buffer === 'object' && buffer.buffer instanceof ArrayBuffer) {
      data = Buffer.from(buffer.buffer, buffer.byteOffset || 0, buffer.byteLength || buffer.length);
    } else {
      data = Buffer.from(buffer);
    }

    if (data.length < 50) {
      return { success: false, error: 'Buffer too small: ' + data.length + ' bytes' };
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(filePath, data);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File was not created on disk: ' + filePath };
    }
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { success: false, error: 'Saved file is 0 bytes: ' + filePath };
    }

    return {
      success: true,
      path: filePath,
      size: stat.size,
      sizeKB: Math.round(stat.size / 1024)
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 7. EXPLORER / SYSTEM INTEGRATION
ipcMain.handle('show-in-folder', async (event, targetPath) => {
  try {
    if (!targetPath) return { success: false, error: 'No path specified' };
    if (fs.existsSync(targetPath)) {
      const st = fs.statSync(targetPath);
      if (st.isDirectory()) {
        await shell.openPath(targetPath);
      } else {
        shell.showItemInFolder(targetPath);
      }
      return { success: true };
    }
    const dir = path.dirname(targetPath);
    if (fs.existsSync(dir)) {
      await shell.openPath(dir);
      return { success: true };
    }
    return { success: false, error: 'Target path not found: ' + targetPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist: ' + filePath };
    }
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-file-dialog', async (event, options) => {
  try {
    return await dialog.showOpenDialog(mainWindow, options || {
      properties: ['openFile'],
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
    });
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});
