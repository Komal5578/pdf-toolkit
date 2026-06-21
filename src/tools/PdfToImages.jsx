import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import DropZone from '../components/DropZone';

// Hardcoded to match installed pdfjs-dist@3.11.174 — never use pdfjsLib.version
// as it will resolve to whatever version is installed and may break the CDN URL.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const GRADIENT = 'linear-gradient(135deg, #7c3aed, #8b5cf6)';
const SHADOW = '0 0 20px rgba(124, 58, 237, 0.3)';

export default function PdfToImages() {
  const [files, setFiles] = useState([]);
  const [format, setFormat] = useState('jpeg');
  const [scale, setScale] = useState('2');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const convert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(5);
    setError('');
    setResult(null);
    setPreviews([]);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      setProgress(15);

      const zip = new JSZip();
      const folder = zip.folder('pdf-pages');
      const newPreviews = [];
      const dpr = parseFloat(scale) || 2;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: dpr });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpeg' ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1];
        const fileName = `page-${String(i).padStart(3, '0')}.${format}`;

        folder.file(fileName, base64, { base64: true });
        newPreviews.push({ dataUrl, label: `Page ${i}` });

        setProgress(15 + Math.floor((i / numPages) * 75));
        setPreviews([...newPreviews]);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const baseName = files[0].name.replace(/\.pdf$/i, '');

      setProgress(100);
      setResult({ url, name: `${baseName}-pages.zip`, count: numPages });
    } catch (e) {
      setError('Conversion failed: ' + e.message);
    } finally {
      setProcessing(false);
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
        onFiles={setFiles}
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
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: GRADIENT }} />
          </div>
          <div className="progress-text">
            {progress < 100 ? `Rendering pages… ${progress}%` : 'Packaging ZIP…'}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
        onClick={convert}
        disabled={!files.length || processing}
      >
        {processing ? '⏳ Converting…' : '📸 Convert to Images'}
      </button>

      {previews.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="options-title" style={{ marginBottom: 12 }}>Preview ({previews.length} pages)</div>
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
          <div className="result-subtitle">{result.count} pages extracted as {format.toUpperCase()} images</div>
          <a href={result.url} download={result.name} className="btn-download">
            ⬇️ Download ZIP ({result.count} images)
          </a>
        </div>
      )}
    </div>
  );
}
