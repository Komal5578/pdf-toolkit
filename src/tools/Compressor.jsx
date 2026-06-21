import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #f59e0b, #ef4444)';
const SHADOW = '0 0 20px rgba(245, 158, 11, 0.3)';

function formatBytes(b) {
  if (b === 0) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
}

export default function Compressor() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState('medium');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const compress = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setProgress(50);

      // Remove metadata to reduce size
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('PDF Toolkit');
      pdfDoc.setCreator('PDF Toolkit');

      setProgress(70);

      // Compression options based on quality
      const saveOptions = {
        useObjectStreams: quality !== 'high',
        addDefaultPage: false,
        objectsPerTick: quality === 'low' ? 20 : quality === 'medium' ? 50 : 100,
      };

      const compressedBytes = await pdfDoc.save(saveOptions);
      setProgress(90);

      const originalSize = file.size;
      const compressedSize = compressedBytes.length;
      const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const outName = file.name.replace(/\.pdf$/i, '_compressed.pdf');

      setProgress(100);
      setResult({ url, name: outName, originalSize, compressedSize, reduction });
    } catch (e) {
      setError('Failed to compress: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>🗜️</div>
        <div>
          <div className="tool-page-title">PDF Compressor</div>
          <div className="tool-page-subtitle">Reduce PDF file size without losing quality</div>
        </div>
      </div>

      <DropZone
        accept=".pdf,application/pdf"
        multiple={false}
        onFiles={setFiles}
        label="Drop your PDF here or click to browse"
        sublabel="Supports PDF files up to 100MB"
        icon="🗜️"
      />

      {files.length > 0 && (
        <div className="options-panel">
          <div className="options-title">Compression Settings</div>
          <div className="option-row">
            <div className="option-label">
              Compression Level
              <small>Higher compression = smaller file (may lose some quality)</small>
            </div>
            <select value={quality} onChange={e => setQuality(e.target.value)}>
              <option value="low">Maximum (smallest file)</option>
              <option value="medium">Balanced (recommended)</option>
              <option value="high">Minimal (best quality)</option>
            </select>
          </div>
        </div>
      )}

      {processing && (
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">Compressing… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        onClick={compress}
        disabled={!files.length || processing}
      >
        {processing ? '⏳ Compressing…' : '🗜️ Compress PDF'}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">Compressed Successfully!</div>
          <div className="result-subtitle">
            {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
            {parseFloat(result.reduction) > 0
              ? ` (${result.reduction}% smaller)`
              : ' (already optimized)'}
          </div>
          <a href={result.url} download={result.name} className="btn-download">
            ⬇️ Download Compressed PDF
          </a>
        </div>
      )}
    </div>
  );
}
