import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import DropZone from '../components/DropZone';

// ─── pdfjs loaded dynamically from CDN at runtime ────────────────────────────
// This completely bypasses Vite's bundler/optimizer — no version mismatches,
// no 504 Outdated Optimize Dep errors, no worker path problems.
const PDFJS_VERSION = '3.11.174';
const PDFJS_SCRIPT  = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER  = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

let _pdfjsCache = null;
function loadPdfJs() {
  if (_pdfjsCache) return Promise.resolve(_pdfjsCache);
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    _pdfjsCache = window.pdfjsLib;
    return Promise.resolve(_pdfjsCache);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      _pdfjsCache = window.pdfjsLib;
      resolve(_pdfjsCache);
    };
    script.onerror = () => reject(new Error(`Failed to load PDF.js ${PDFJS_VERSION} from CDN`));
    document.head.appendChild(script);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #f59e0b, #ef4444)';
const SHADOW   = '0 0 20px rgba(245, 158, 11, 0.3)';

function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
}

const PRESETS = {
  maximum: { jpegQuality: 0.50, renderScale: 1.2, label: 'Maximum — smallest file' },
  balanced: { jpegQuality: 0.65, renderScale: 1.5, label: 'Balanced — recommended' },
  minimal:  { jpegQuality: 0.82, renderScale: 2.0, label: 'Minimal — best quality'  },
};

async function compressPdfWithImageResampling(arrayBuffer, preset, onProgress) {
  const pdfjsLib = await loadPdfJs();
  const { jpegQuality, renderScale } = preset;

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfJs = await loadingTask.promise;
  const numPages = pdfJs.numPages;
  onProgress(10, 'Loaded PDF…');

  const outDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page     = await pdfJs.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const canvas   = document.createElement('canvas');
    canvas.width   = Math.round(viewport.width);
    canvas.height  = Math.round(viewport.height);
    const ctx      = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Re-encode pixels as JPEG at chosen quality
    const dataUrl   = canvas.toDataURL('image/jpeg', jpegQuality);
    const base64    = dataUrl.split(',')[1];
    const jpegBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // Preserve original page dimensions (points)
    const origVP  = page.getViewport({ scale: 1 });
    const jpgImg  = await outDoc.embedJpg(jpegBytes);
    const outPage = outDoc.addPage([origVP.width, origVP.height]);
    outPage.drawImage(jpgImg, { x: 0, y: 0, width: origVP.width, height: origVP.height });

    const pct = 10 + Math.round((pageNum / numPages) * 82);
    onProgress(pct, `Compressing page ${pageNum} of ${numPages}…`);
  }

  onProgress(95, 'Finalising PDF…');
  const outBytes = await outDoc.save({ useObjectStreams: true });
  onProgress(100, 'Done');
  return outBytes;
}

export default function Compressor() {
  const [files,      setFiles]      = useState([]);
  const [preset,     setPreset]     = useState('balanced');
  const [processing, setProcessing] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  const compress = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setError('');
    setResult(null);
    setStatusMsg('Loading PDF.js…');

    try {
      const file        = files[0];
      const arrayBuffer = await file.arrayBuffer();

      const outBytes = await compressPdfWithImageResampling(
        arrayBuffer,
        PRESETS[preset],
        (pct, msg) => { setProgress(pct); setStatusMsg(msg); }
      );

      const originalSize   = file.size;
      const compressedSize = outBytes.length;
      const reduction      = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

      const blob    = new Blob([outBytes], { type: 'application/pdf' });
      const url     = URL.createObjectURL(blob);
      const outName = file.name.replace(/\.pdf$/i, '_compressed.pdf');

      setResult({ url, name: outName, originalSize, compressedSize, reduction: parseFloat(reduction) });
    } catch (e) {
      setError('Compression failed: ' + e.message);
      console.error(e);
    } finally {
      setProcessing(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>🗜️</div>
        <div>
          <div className="tool-page-title">PDF Compressor</div>
          <div className="tool-page-subtitle">Resamples embedded images to genuinely reduce file size</div>
        </div>
      </div>

      <DropZone
        accept=".pdf,application/pdf"
        multiple={false}
        onFiles={(f) => { setFiles(f); setResult(null); setError(''); }}
        label="Drop your PDF here or click to browse"
        sublabel="Supports PDF files up to 200 MB"
        icon="🗜️"
      />

      {files.length > 0 && (
        <div className="options-panel">
          <div className="options-title">Compression Settings</div>
          <div className="option-row">
            <div className="option-label">
              Quality Preset
              <small>Each page is re-rendered and images re-encoded as JPEG</small>
            </div>
            <select value={preset} onChange={e => { setPreset(e.target.value); setResult(null); }}>
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 10, padding: '10px 0 2px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            {preset === 'maximum' && '⚡ JPEG 50% quality — best size reduction, slight quality loss on text-heavy PDFs'}
            {preset === 'balanced' && '⚖️ JPEG 65% quality — great compression, visually near-identical output'}
            {preset === 'minimal'  && '🔍 JPEG 82% quality — conservative compression, excellent visual fidelity'}
          </div>
        </div>
      )}

      {processing && (
        <div style={{ marginTop: 20 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">{statusMsg || `${progress}%`}</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        onClick={compress}
        disabled={!files.length || processing}
      >
        {processing ? `⏳ ${statusMsg || 'Compressing…'}` : '🗜️ Compress PDF'}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">{result.reduction > 0 ? '✅' : '⚠️'}</div>
          <div className="result-title">
            {result.reduction > 0 ? 'Compressed Successfully!' : 'Compression Complete'}
          </div>
          <div className="result-subtitle">
            <strong>{formatBytes(result.originalSize)}</strong>
            {' → '}
            <strong style={{ color: result.reduction > 0 ? '#10b981' : 'inherit' }}>
              {formatBytes(result.compressedSize)}
            </strong>
            {result.reduction > 0
              ? <span style={{ color: '#10b981', marginLeft: 6 }}>▼ {result.reduction}% smaller</span>
              : <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(no further reduction possible)</span>
            }
          </div>
          <a href={result.url} download={result.name} className="btn-download">
            ⬇️ Download Compressed PDF
          </a>
        </div>
      )}
    </div>
  );
}
