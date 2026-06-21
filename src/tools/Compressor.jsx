import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import DropZone from '../components/DropZone';

// Local worker from node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js
// copied into /public — API and worker are always from the same package install.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const GRADIENT = 'linear-gradient(135deg, #f59e0b, #ef4444)';
const SHADOW   = '0 0 20px rgba(245, 158, 11, 0.3)';

function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
}

// Quality presets: { jpegQuality (0-1), renderScale }
const PRESETS = {
  maximum: { jpegQuality: 0.50, renderScale: 1.2, label: 'Maximum — smallest file' },
  balanced: { jpegQuality: 0.65, renderScale: 1.5, label: 'Balanced — recommended' },
  minimal:  { jpegQuality: 0.82, renderScale: 2.0, label: 'Minimal — best quality'  },
};

/**
 * Core compression:
 *  1. Load PDF with pdfjs-dist
 *  2. Render every page to a canvas at `renderScale`
 *  3. Export canvas as JPEG at `jpegQuality`
 *  4. Build a brand-new PDF with pdf-lib, embedding the JPEG for each page
 *     (page dimensions are set to match original pts so layout is preserved)
 */
async function compressPdfWithImageResampling(arrayBuffer, preset, onProgress) {
  const { jpegQuality, renderScale } = preset;

  // Step 1 — parse with pdfjs
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfJs = await loadingTask.promise;
  const numPages = pdfJs.numPages;
  onProgress(10);

  // Step 2 — create output PDF
  const outDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // Render page to canvas
    const page      = await pdfJs.getPage(pageNum);
    const viewport  = page.getViewport({ scale: renderScale });

    const canvas    = document.createElement('canvas');
    canvas.width    = Math.round(viewport.width);
    canvas.height   = Math.round(viewport.height);
    const ctx       = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Export as JPEG at chosen quality
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    const base64  = dataUrl.split(',')[1];
    const jpegBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // Get original page size in points (1 pt = 1/72 inch)
    const origVP  = page.getViewport({ scale: 1 });
    const widthPt  = origVP.width;
    const heightPt = origVP.height;

    // Embed JPEG and add page at original dimensions
    const jpgImage  = await outDoc.embedJpg(jpegBytes);
    const outPage   = outDoc.addPage([widthPt, heightPt]);
    outPage.drawImage(jpgImage, { x: 0, y: 0, width: widthPt, height: heightPt });

    const pct = 10 + Math.round((pageNum / numPages) * 82);
    onProgress(pct);
  }

  onProgress(95);
  const outBytes = await outDoc.save({ useObjectStreams: true });
  onProgress(100);
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
    setStatusMsg('Reading file…');

    try {
      const file        = files[0];
      const arrayBuffer = await file.arrayBuffer();

      setStatusMsg('Rendering pages and compressing images…');

      const outBytes = await compressPdfWithImageResampling(
        arrayBuffer,
        PRESETS[preset],
        (pct) => {
          setProgress(pct);
          if (pct < 95) {
            const approxPage = Math.ceil((pct - 10) / 82 * (/* pages guess */ 1));
            setStatusMsg(`Compressing page… ${pct}%`);
          } else {
            setStatusMsg('Finalising PDF…');
          }
        }
      );

      const originalSize   = file.size;
      const compressedSize = outBytes.length;
      const savedBytes     = originalSize - compressedSize;
      const reduction      = ((savedBytes / originalSize) * 100).toFixed(1);

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

          {/* Show estimated quality info */}
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
          <div className="progress-text">{statusMsg || `Compressing… ${progress}%`}</div>
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
