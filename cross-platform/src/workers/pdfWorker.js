// WebPDF Studio v4.0.1 FINAL BASIC - pdfWorker.js - High-performance PDF Worker (Optimized)
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

parentPort.on('message', async (msg) => {
  try {
    if (msg.op === 'merge') {
      const merged = await PDFDocument.create();
      let totalPages = 0;

      for (let i = 0; i < msg.filePaths.length; i++) {
        const fp = msg.filePaths[i];
        if (!fs.existsSync(fp)) throw new Error('File not found: ' + fp);
        const bytes = fs.readFileSync(fp);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        const pageIndices = doc.getPageIndices();
        const pages = await merged.copyPages(doc, pageIndices);
        pages.forEach((p) => merged.addPage(p));
        totalPages += pages.length;

        parentPort.postMessage({
          type: 'progress',
          current: i + 1,
          total: msg.filePaths.length,
          pages: totalPages,
          percent: Math.round(((i + 1) / msg.filePaths.length) * 100)
        });
      }

      // Fast serialization without object streams overhead
      merged.setCreator("WebPDF Studio v4.0.1 by mavvi.online - https://mavvi.online");
      merged.setProducer("mavvi.online");
      const outBytes = await merged.save({ useObjectStreams: false });

      if (msg.savePath) {
        const dir = path.dirname(msg.savePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(msg.savePath, outBytes);

        if (!fs.existsSync(msg.savePath)) throw new Error('Failed to write merged file');
        const st = fs.statSync(msg.savePath);
        if (st.size === 0) throw new Error('Merged file was written as 0 bytes');

        parentPort.postMessage({
          type: 'done',
          path: msg.savePath,
          size: st.size,
          sizeKB: Math.round(st.size / 1024),
          pages: totalPages
        });
      } else {
        parentPort.postMessage({ type: 'done', buffer: outBytes, pages: totalPages });
      }
    }

    if (msg.op === 'split') {
      if (!fs.existsSync(msg.filePath)) throw new Error('Source file not found: ' + msg.filePath);
      const srcBytes = fs.readFileSync(msg.filePath);
      const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true, updateMetadata: false });
      const total = src.getPageCount();
      const dir = path.dirname(msg.filePath);
      const fileExt = path.extname(msg.filePath);
      const baseName = path.basename(msg.filePath, fileExt);

      // Save split files into an organized dedicated folder
      const outDir = msg.outputDir || path.join(dir, `${baseName}_pages`);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const outputs = [];

      if (msg.rule.mode === 'single') {
        // MODE A: Single Page Mode (1 page = 1 PDF)
        for (let i = 0; i < total; i++) {
          const singleDoc = await PDFDocument.create();
          const [page] = await singleDoc.copyPages(src, [i]);
          singleDoc.addPage(page);
          singleDoc.setCreator("WebPDF Studio v4.0.1 by mavvi.online - https://mavvi.online");
          singleDoc.setProducer("mavvi.online");
          const bytes = await singleDoc.save({ useObjectStreams: false });
          const outName = `${baseName}_page_${i + 1}.pdf`;
          const outPath = path.join(outDir, outName);
          fs.writeFileSync(outPath, bytes);

          const st = fs.statSync(outPath);
          outputs.push({
            path: outPath,
            name: outName,
            size: st.size,
            sizeKB: Math.round(st.size / 1024),
            page: i + 1
          });

          parentPort.postMessage({
            type: 'progress',
            current: i + 1,
            total,
            mode: 'single',
            percent: Math.round(((i + 1) / total) * 100),
            file: outName
          });
        }
      } else if (msg.rule.mode === 'chunk') {
        // MODE B: Chunk Mode (Split every X pages)
        const size = Math.max(1, parseInt(msg.rule.size, 10) || 1);
        let partIndex = 1;
        const totalChunks = Math.ceil(total / size);

        for (let start = 0; start < total; start += size) {
          const chunkDoc = await PDFDocument.create();
          const end = Math.min(start + size - 1, total - 1);
          const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
          const pages = await chunkDoc.copyPages(src, indices);
          pages.forEach((p) => chunkDoc.addPage(p));
          chunkDoc.setCreator("WebPDF Studio v4.0.1 by mavvi.online - https://mavvi.online");
          chunkDoc.setProducer("mavvi.online");
          const bytes = await chunkDoc.save({ useObjectStreams: false });

          const outName = (start === end)
            ? `${baseName}_page_${start + 1}.pdf`
            : `${baseName}_part_${start + 1}-${end + 1}.pdf`;
          const outPath = path.join(outDir, outName);
          fs.writeFileSync(outPath, bytes);

          const st = fs.statSync(outPath);
          outputs.push({
            path: outPath,
            name: outName,
            size: st.size,
            sizeKB: Math.round(st.size / 1024),
            range: `${start + 1}-${end + 1}`
          });

          parentPort.postMessage({
            type: 'progress',
            current: partIndex,
            total: totalChunks,
            mode: 'chunk',
            percent: Math.round((partIndex / totalChunks) * 100),
            file: outName
          });
          partIndex++;
        }
      } else if (msg.rule.mode === 'range') {
        // MODE C: Custom Ranges (e.g. "1-5, 6, 10-20")
        const ranges = (msg.rule.ranges || '').split(',').map((s) => s.trim()).filter(Boolean);
        for (let idx = 0; idx < ranges.length; idx++) {
          const r = ranges[idx];
          let s, e;
          if (r.includes('-')) {
            const parts = r.split('-').map((p) => p.trim());
            s = parseInt(parts[0], 10) - 1;
            e = parseInt(parts[1] || parts[0], 10) - 1;
          } else {
            // Single page like "6"
            s = parseInt(r, 10) - 1;
            e = s;
          }

          if (isNaN(s) || isNaN(e) || s < 0 || e >= total || s > e) continue;

          const rangeDoc = await PDFDocument.create();
          const indices = Array.from({ length: e - s + 1 }, (_, k) => s + k);
          const pages = await rangeDoc.copyPages(src, indices);
          pages.forEach((p) => rangeDoc.addPage(p));
          rangeDoc.setCreator("WebPDF Studio v4.0.1 by mavvi.online - https://mavvi.online");
          rangeDoc.setProducer("mavvi.online");
          const bytes = await rangeDoc.save({ useObjectStreams: false });

          const outName = (s === e)
            ? `${baseName}_page_${s + 1}.pdf`
            : `${baseName}_part_${s + 1}-${e + 1}.pdf`;
          const outPath = path.join(outDir, outName);
          fs.writeFileSync(outPath, bytes);

          const st = fs.statSync(outPath);
          outputs.push({
            path: outPath,
            name: outName,
            size: st.size,
            sizeKB: Math.round(st.size / 1024),
            range: (s === e) ? `${s + 1}` : `${s + 1}-${e + 1}`
          });

          parentPort.postMessage({
            type: 'progress',
            current: idx + 1,
            total: ranges.length,
            mode: 'range',
            percent: Math.round(((idx + 1) / ranges.length) * 100),
            file: outName
          });
        }
      }

      parentPort.postMessage({
        type: 'done',
        outputs,
        outputDir: outDir,
        totalPages: total
      });
    }
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      error: err.message + '\n' + (err.stack || '')
    });
  }
});
