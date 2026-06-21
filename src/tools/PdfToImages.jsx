import { useState } from 'react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import DropZone from '../components/DropZone';

// ─── pdfjs loaded dynamically from CDN at runtime ────────────────────────────
// Completely bypasses Vite's bundler/optimizer — no version mismatches,
// no 504 Outdated Optimize Dep errors, no worker path issues.
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

const GRADIENT = 'linear-gradient(135deg, #7c3aed, #8b5cf6)';
const SHADOW   = '0 0 20px rgba(124, 58, 237, 0.3)';

export default function PdfToImages() {
  const [files,      setFiles]      = useState([]);
  const [format,     setFormat]     = useState('jpeg');
  const [scale,      setScale]      = useState('2');
  const [processing, setProcessing] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [previews,   setPreviews]   = useState([]);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  const convert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(5);
    setStatusMsg('Loading PDF.js…');
    setError('');
    setResult(null);
    setPreviews([]);

    try {
      const pdfjsLib    = await loadPdfJs();
      const arrayBuffer = await files[0].arrayBuffer();

      setStatusMsg('Parsing PDF…');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf         = await loadingTask.promise;
      const numPages    = pdf.numPages;
      setProgress(15);

      const zip       = new JSZip();
      const folder    = zip.folder('pdf-pages');
      const newPreviews = [];
      const dpr       = parseFloat(scale) || 2;
      const mimeType  = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality   = format === 'jpeg' ? 0.92 : undefined;
      const ext       = format === 'png' ? 'png' : 'jpg';

      for (let i = 1; i <= numPages; i++) {
        setStatusMsg(`Rendering page ${i} of ${numPages}…`);

        const page     = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: dpr });

        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        const ctx      = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64  = dataUrl.split(',')[1];
        const fileName = `page-${String(i).padStart(3, '0')}.${ext}`;

        folder.file(fileName, base64, { base64: true });
        newPreviews.push({ dataUrl, label: `Page ${i}` });

        const pct = 15 + Math.floor((i / numPages) * 75);
        setProgress(pct);
        setPreviews([...newPreviews]);
      }

      setStatusMsg('Packaging ZIP…');
      setProgress(92);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url     = URL.createObjectURL(zipBlob);
      const base    = files[0].name.replace(/\.pdf$/i, '');

      setProgress(100);
      setStatusMsg('Done');
      setResult({ url, name: `${base}-pages.zip`, count: numPages });
    } catch (e) {
      setError('Conversion failed: ' + e.message);
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
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>📸</div>
        <div>
          <div className="tool-page-title">PDF to Images</div>
          <div className="tool-page-subtitle">Extract every PDF page as a high-quality image</div>
        </div>
      </div>

      <DropZone
        accept=".pdf,application/pdf"
        multiple={false}
        onFiles={(f) => { setFiles(f); setResult(null); setError(''); setPreviews([]); }}
        label="Drop your PDF here or click to browse"
        sublabel="Each page will be extracted as a separate image"
        icon="📸"
      />

      {files.length > 0 && (
        <div className="options-panel">
          <div className="options-title">Export Settings</div>
          <div className="option-row">
            <div className="option-label">Image Format</div>
            <select value={format} onChange={e => setFormat(e.target.value)}>
              <option value="jpeg">JPEG (smaller size)</option>
              <option value="png">PNG (lossless quality)</option>
            </select>
          </div>
          <div className="option-row">
            <div className="option-label">
              Resolution / Scale
              <small>Higher = better quality but larger files</small>
            </div>
            <select value={scale} onChange={e => setScale(e.target.value)}>
              <option value="1">1× (72 DPI)</option>
              <option value="1.5">1.5× (108 DPI)</option>
              <option value="2">2× (144 DPI) — Recommended</option>
              <option value="3">3× (216 DPI)</option>
            </select>
          </div>
        </div>
      )}

      {processing && (
        <div style={{ marginTop: 20 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: GRADIENT }} />
          </div>
          <div className="progress-text">{statusMsg || `${progress}%`}</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
        onClick={convert}
        disabled={!files.length || processing}
      >
        {processing ? `⏳ ${statusMsg || 'Converting…'}` : '📸 Convert to Images'}
      </button>

      {previews.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="options-title" style={{ marginBottom: 12 }}>
            Preview ({previews.length} page{previews.length !== 1 ? 's' : ''} rendered)
          </div>
          <div className="image-preview-grid">
            {previews.slice(0, 12).map((p, i) => (
              <div key={i} className="image-preview-item">
                <img src={p.dataUrl} alt={p.label} />
                <div className="image-preview-label">{p.label}</div>
              </div>
            ))}
            {previews.length > 12 && (
              <div className="image-preview-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', fontSize: 14, color: 'var(--text-muted)' }}>
                +{previews.length - 12} more
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">Conversion Complete!</div>
          <div className="result-subtitle">
            {result.count} page{result.count !== 1 ? 's' : ''} extracted as {format.toUpperCase()} images
          </div>
          <a href={result.url} download={result.name} className="btn-download">
            ⬇️ Download ZIP ({result.count} images)
          </a>
        </div>
      )}
    </div>
  );
}
