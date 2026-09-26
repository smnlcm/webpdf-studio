// SplitPDF.jsx - React Component for WebPDF Studio v4.02
import React, { useState, useEffect } from 'react';

export default function SplitPDF() {
  const [fileInfo, setFileInfo] = useState(null); // { name, path, pages, sizeKB }
  const [splitMode, setSplitMode] = useState('single'); // 'single' | 'chunk' | 'range'
  const [chunkSize, setChunkSize] = useState(2);
  const [ranges, setRanges] = useState('1-5, 6, 10-20');
  const [customFolder, setCustomFolder] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, percent, file }
  const [result, setResult] = useState(null); // { outputs, outputDir }

  // Listen to background progress
  useEffect(() => {
    if (window.webpdf?.onSplitProgress) {
      const cleanup = window.webpdf.onSplitProgress((data) => {
        setProgress(data);
      });
      return cleanup;
    }
  }, []);

  // Handle PDF file selection
  const handleSelectFile = async () => {
    try {
      const files = await window.webpdf.openFiles();
      if (files && files.length > 0) {
        const info = await window.webpdf.getPdfInfo(files[0]);
        if (info && info.success) {
          setFileInfo(info);
          setResult(null);
        } else {
          alert('Could not inspect PDF: ' + (info?.error || 'Invalid file'));
        }
      }
    } catch (err) {
      alert('File selection error: ' + err.message);
    }
  };

  // Change destination folder
  const handleChangeFolder = async () => {
    try {
      const folder = await window.webpdf.selectFolder();
      if (folder) setCustomFolder(folder);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Output Metrics & Button Text
  const totalPages = fileInfo?.pages || 0;
  const baseName = fileInfo?.name ? fileInfo.name.replace(/\.[^/.]+$/, '') : 'document';
  const targetFolder = customFolder || (fileInfo ? `${baseName}_pages/` : 'Default subfolder');

  let outputCount = 0;
  let buttonText = 'Select a PDF file first';
  let modeLabel = 'Single';
  let previewItems = [];

  if (fileInfo) {
    if (splitMode === 'single') {
      modeLabel = 'Single';
      outputCount = totalPages;
      buttonText = `Split into ${totalPages} Single Pages`;
      previewItems = [
        `• ${baseName}_page_1.pdf`,
        totalPages > 2 ? `• ${baseName}_page_2.pdf` : null,
        totalPages > 2 ? `...` : null,
        totalPages >= 2 ? `• ${baseName}_page_${totalPages}.pdf` : null
      ].filter(Boolean);
    } else if (splitMode === 'chunk') {
      modeLabel = 'Chunk';
      const n = Math.max(1, parseInt(chunkSize, 10) || 1);
      outputCount = Math.ceil(totalPages / n);
      buttonText = `Split into ${outputCount} Files (${n} pages each)`;
      
      for (let s = 0; s < totalPages && previewItems.length < 3; s += n) {
        const e = Math.min(s + n, totalPages);
        previewItems.push(`• ${baseName}_part_${s + 1}-${e}.pdf (pages ${s + 1}–${e})`);
      }
      if (outputCount > 3) {
        previewItems.push(`...and ${outputCount - 3} more file(s)`);
      }
    } else if (splitMode === 'range') {
      modeLabel = 'Custom';
      const parts = ranges.split(',').map((s) => s.trim()).filter(Boolean);
      const valid = [];
      parts.forEach((p) => {
        let s, e;
        if (p.includes('-')) {
          const seg = p.split('-').map((x) => x.trim());
          s = parseInt(seg[0], 10);
          e = parseInt(seg[1] || seg[0], 10);
        } else {
          s = parseInt(p, 10);
          e = s;
        }
        if (!isNaN(s) && !isNaN(e) && s >= 1 && s <= totalPages && e >= s) {
          valid.push({ s, e: Math.min(e, totalPages) });
        }
      });
      outputCount = valid.length;
      buttonText = `Split into ${outputCount} Custom Files`;
      previewItems = valid.slice(0, 4).map((v) => `• ${v.s === v.e ? `Page ${v.s}` : `Pages ${v.s}–${v.e}`}`);
      if (outputCount > 4) previewItems.push(`...and ${outputCount - 4} more range(s)`);
    }
  }

  // Trigger Split Operation
  const handleSplit = async () => {
    if (!fileInfo) return;
    setIsSplitting(true);
    setResult(null);

    let rule;
    if (splitMode === 'single') {
      rule = { mode: 'single' };
    } else if (splitMode === 'chunk') {
      rule = { mode: 'chunk', size: Math.max(1, parseInt(chunkSize, 10) || 1) };
    } else {
      rule = { mode: 'range', ranges };
    }

    try {
      const res = await window.webpdf.splitPdf({
        filePath: fileInfo.path,
        rule,
        outputDir: customFolder || null
      });

      if (res && res.success) {
        setResult(res);
      } else {
        alert('Split failed: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Split error: ' + err.message);
    } finally {
      setIsSplitting(false);
      setProgress(null);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Split PDF Document</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 18 }}>
        Extract single pages or custom chunks into dedicated, organized PDF files.
      </p>

      {/* File Drop/Selection Area */}
      <div
        onClick={handleSelectFile}
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          background: '#f8fafc',
          cursor: 'pointer'
        }}
      >
        {fileInfo ? (
          <div>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>{fileInfo.name}</strong>
            <div style={{ marginTop: 4, color: '#16a34a', fontWeight: 600 }}>
              {fileInfo.pages} pages • {fileInfo.sizeKB} KB
            </div>
            <button
              type="button"
              style={{ marginTop: 10, padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Change File
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>Select or drop a PDF file to split</div>
            <button
              type="button"
              style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Choose PDF File
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Selection & Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginTop: 20 }}>
        {/* Left Column: Radio Modes */}
        <div>
          {/* MODE A: Single Page Mode */}
          <div
            onClick={() => setSplitMode('single')}
            style={{
              border: `1.5px solid ${splitMode === 'single' ? '#2563eb' : '#e2e8f0'}`,
              background: splitMode === 'single' ? '#f0f7ff' : '#ffffff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              cursor: 'pointer'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
              <input
                type="radio"
                name="splitModeRadio"
                checked={splitMode === 'single'}
                onChange={() => setSplitMode('single')}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <span>Split into Single Pages (1 page = 1 PDF)</span>
              <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10 }}>Default</span>
            </label>
            {splitMode === 'single' && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>
                Extracts every page into a standalone 1-page PDF file.<br />
                <span>e.g. {totalPages || 20}-page PDF → {totalPages || 20} separate files (<code>_page_1.pdf</code> ... <code>_page_{totalPages || 20}.pdf</code>)</span>
              </div>
            )}
          </div>

          {/* MODE B: Chunk Mode */}
          <div
            onClick={() => setSplitMode('chunk')}
            style={{
              border: `1.5px solid ${splitMode === 'chunk' ? '#2563eb' : '#e2e8f0'}`,
              background: splitMode === 'chunk' ? '#f0f7ff' : '#ffffff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              cursor: 'pointer'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
              <input
                type="radio"
                name="splitModeRadio"
                checked={splitMode === 'chunk'}
                onChange={() => setSplitMode('chunk')}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <span>Split by Every X Pages (Chunk Mode)</span>
            </label>
            {splitMode === 'chunk' && (
              <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Pages per chunk:</span>
                  <input
                    type="number"
                    value={chunkSize}
                    min={1}
                    max={1000}
                    onChange={(e) => setChunkSize(e.target.value)}
                    style={{ width: 80, padding: '6px 10px', border: '1.5px solid #cbd5e1', borderRadius: 6, textAlign: 'center', fontWeight: 600 }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  e.g. {totalPages || 20} pages / {chunkSize} pages each → {Math.ceil((totalPages || 20) / (parseInt(chunkSize, 10) || 1))} files (pages 1-{chunkSize}, ...)
                </div>
              </div>
            )}
          </div>

          {/* MODE C: Custom Ranges */}
          <div
            onClick={() => setSplitMode('range')}
            style={{
              border: `1.5px solid ${splitMode === 'range' ? '#2563eb' : '#e2e8f0'}`,
              background: splitMode === 'range' ? '#f0f7ff' : '#ffffff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              cursor: 'pointer'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
              <input
                type="radio"
                name="splitModeRadio"
                checked={splitMode === 'range'}
                onChange={() => setSplitMode('range')}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <span>Custom Ranges</span>
            </label>
            {splitMode === 'range' && (
              <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={ranges}
                  placeholder="e.g. 1-5, 8, 10-20"
                  onChange={(e) => setRanges(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Specify comma-separated ranges or single page numbers (e.g. 1-5, 6, 10-20).
                </div>
              </div>
            )}
          </div>

          {/* Output Folder Selector */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Output Folder:</span>
              <button
                type="button"
                onClick={handleChangeFolder}
                style={{ padding: '4px 10px', fontSize: 11.5, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}
              >
                Change Folder
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>
              {targetFolder}
            </div>
          </div>

          {/* Split Execution Button */}
          <button
            type="button"
            disabled={!fileInfo || isSplitting || (splitMode === 'range' && outputCount === 0)}
            onClick={handleSplit}
            style={{
              width: '100%',
              marginTop: 16,
              padding: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: !fileInfo || isSplitting ? '#94a3b8' : '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: !fileInfo || isSplitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSplitting ? 'Splitting PDF...' : buttonText}
          </button>
        </div>

        {/* Right Column: Output Preview */}
        <div>
          <h3 style={{ fontSize: 14, color: '#334155', marginBottom: 10 }}>Split Plan & Output Preview</h3>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, fontSize: 13, color: '#475569' }}>
            {fileInfo ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Source Pages:</span>
                    <strong style={{ color: '#0f172a' }}>{totalPages}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Mode:</span>
                    <strong style={{ color: '#2563eb' }}>{modeLabel}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Output Count:</span>
                    <strong style={{ color: '#16a34a', fontSize: 14 }}>{outputCount} files</strong>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  <strong>Planned Outputs:</strong>
                  <div style={{ marginTop: 4 }}>
                    {previewItems.map((item, idx) => (
                      <div key={idx}>{item}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Output Folder:</strong> <code>{targetFolder}</code>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>Please load a PDF to view split details.</div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {isSplitting && progress && (
        <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
            <span>Splitting page {progress.current} of {progress.total} ({progress.file})...</span>
            <span>{progress.percent}%</span>
          </div>
          <div style={{ height: 8, background: '#dbeafe', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', background: '#2563eb', width: `${progress.percent}%`, transition: 'width 0.15s ease' }} />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {result && (
        <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#166534', marginBottom: 8 }}>
            ✅ PDF Split Completed Successfully!
          </div>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
            <strong>Total Files Created:</strong> {result.outputs.length} verified PDFs<br />
            <strong>Output Folder:</strong> {result.outputDir}
          </div>
          <button
            type="button"
            onClick={() => window.webpdf.showInFolder(result.outputDir)}
            style={{ marginTop: 12, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            Open Output Folder
          </button>
        </div>
      )}
    </div>
  );
}
