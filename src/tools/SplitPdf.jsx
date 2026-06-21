import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #06b6d4, #3b82f6)';
const SHADOW = '0 0 20px rgba(6, 182, 212, 0.3)';

function parsePageRanges(rangeStr, totalPages) {
  const pages = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= totalPages) pages.add(i - 1);
        }
      }
    } else {
      const n = parseInt(trimmed);
      if (!isNaN(n) && n >= 1 && n <= totalPages) pages.add(n - 1);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

export default function SplitPdf() {
  const [files, setFiles] = useState([]);
  const [pageRange, setPageRange] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [splitMode, setSplitMode] = useState('range');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFiles = async (newFiles) => {
    setFiles(newFiles);
    setResult(null);
    setTotalPages(0);
    if (newFiles.length > 0) {
      try {
        const buf = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setTotalPages(doc.getPageCount());
      } catch (_) {}
    }
  };

  const split = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);

    try {
      const buf = await files[0].arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = srcDoc.getPageCount();
      setProgress(30);

      const results = [];

      if (splitMode === 'each') {
        // Split each page into separate PDF
        for (let i = 0; i < total; i++) {
          const newDoc = await PDFDocument.create();
          const [page] = await newDoc.copyPages(srcDoc, [i]);
          newDoc.addPage(page);
          const bytes = await newDoc.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          results.push({ url, name: `page-${i + 1}.pdf` });
          setProgress(30 + Math.floor(((i + 1) / total) * 60));
        }
      } else {
        const indices = parsePageRanges(pageRange, total);
        if (indices.length === 0) {
          setError('No valid pages specified. Use format: 1,3,5-8');
          setProcessing(false);
          return;
        }
        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, indices);
        pages.forEach(p => newDoc.addPage(p));
        setProgress(80);
        const bytes = await newDoc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const baseName = files[0].name.replace(/\.pdf$/i, '');
        results.push({ url, name: `${baseName}_pages_${pageRange.replace(/,/g, '_')}.pdf` });
      }

      setProgress(100);
      setResult({ files: results, mode: splitMode });
    } catch (e) {
      setError('Split failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>✂️</div>
        <div>
          <div className="tool-page-title">Split PDF</div>
          <div className="tool-page-subtitle">Extract specific pages from a PDF file</div>
        </div>
      </div>

      <DropZone
        accept=".pdf,application/pdf"
        multiple={false}
        onFiles={handleFiles}
        label="Drop your PDF here or click to browse"
        sublabel="Upload a PDF to split or extract pages"
        icon="✂️"
      />

      {files.length > 0 && totalPages > 0 && (
        <div className="options-panel">
          <div className="options-title">Split Options{totalPages > 0 && ` — ${totalPages} pages detected`}</div>
          <div className="option-row">
            <div className="option-label">Split Mode</div>
            <select value={splitMode} onChange={e => setSplitMode(e.target.value)}>
              <option value="range">Extract page range</option>
              <option value="each">Split every page</option>
            </select>
          </div>
          {splitMode === 'range' && (
            <div className="option-row">
              <div className="option-label">
                Page Range
                <small>e.g. 1,3,5-8 or 2-4</small>
              </div>
              <input
                type="text"
                className="page-range-input"
                placeholder="e.g. 1-3, 5, 7-10"
                value={pageRange}
                onChange={e => setPageRange(e.target.value)}
                style={{ flex: 1, maxWidth: 240 }}
              />
            </div>
          )}
        </div>
      )}

      {processing && (
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: GRADIENT }} />
          </div>
          <div className="progress-text">Splitting… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}
        onClick={split}
        disabled={!files.length || processing || (splitMode === 'range' && !pageRange.trim())}
      >
        {processing ? '⏳ Splitting…' : '✂️ Split PDF'}
      </button>

      {result && (
        <div className="result-box multi">
          <div className="result-icon">✅</div>
          <div className="result-title">Split Complete!</div>
          <div className="result-subtitle" style={{ marginBottom: 16 }}>
            {result.files.length} file{result.files.length !== 1 ? 's' : ''} created
          </div>
          <div className="file-list" style={{ marginTop: 0 }}>
            {result.files.map((f, i) => (
              <div key={i} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{f.name}</span>
                <a href={f.url} download={f.name} className="btn-download" style={{ width: 'auto', marginTop: 0, padding: '6px 12px', fontSize: 12 }}>
                  ⬇️ Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
