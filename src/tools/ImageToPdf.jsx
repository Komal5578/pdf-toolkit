import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
const SHADOW = '0 0 20px rgba(139, 92, 246, 0.3)';

export default function ImageToPdf() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('auto');
  const [margin, setMargin] = useState('10');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl: e.target.result, name: file.name });
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const convert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(5);
    setError('');
    setResult(null);

    try {
      const images = [];
      for (let i = 0; i < files.length; i++) {
        const data = await loadImage(files[i]);
        images.push(data);
        setProgress(5 + Math.floor((i / files.length) * 50));
      }

      const marginPx = parseInt(margin) || 0;
      let pdf = null;

      for (let i = 0; i < images.length; i++) {
        const { img, dataUrl } = images[i];
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        let ori = orientation;
        if (orientation === 'auto') {
          ori = imgW > imgH ? 'landscape' : 'portrait';
        }

        if (!pdf) {
          pdf = new jsPDF({ orientation: ori, unit: 'mm', format: pageSize });
        } else {
          pdf.addPage(pageSize, ori);
        }

        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const usableW = pw - marginPx * 2;
        const usableH = ph - marginPx * 2;

        const ratio = Math.min(usableW / imgW, usableH / imgH);
        const w = imgW * ratio;
        const h = imgH * ratio;
        const x = marginPx + (usableW - w) / 2;
        const y = marginPx + (usableH - h) / 2;

        const ext = files[i].type === 'image/png' ? 'PNG' : 'JPEG';
        pdf.addImage(dataUrl, ext, x, y, w, h);
        setProgress(55 + Math.floor(((i + 1) / images.length) * 40));
      }

      const outName = files.length === 1
        ? files[0].name.replace(/\.(jpg|jpeg|png|webp)$/i, '.pdf')
        : 'images-to-pdf.pdf';

      pdf.save(outName);
      setProgress(100);
      setResult({ name: outName, count: images.length });
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
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>🖼️</div>
        <div>
          <div className="tool-page-title">Image to PDF</div>
          <div className="tool-page-subtitle">Convert JPG, PNG images to a PDF document</div>
        </div>
      </div>

      <DropZone
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        onFiles={setFiles}
        label="Drop images here or click to browse"
        sublabel="JPG, PNG, WebP — multiple files supported"
        icon="🖼️"
      />

      {files.length > 0 && (
        <div className="options-panel">
          <div className="options-title">PDF Settings</div>
          <div className="option-row">
            <div className="option-label">Page Size</div>
            <select value={pageSize} onChange={e => setPageSize(e.target.value)}>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
              <option value="a3">A3</option>
              <option value="a5">A5</option>
            </select>
          </div>
          <div className="option-row">
            <div className="option-label">Orientation</div>
            <select value={orientation} onChange={e => setOrientation(e.target.value)}>
              <option value="auto">Auto (per image)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div className="option-row">
            <div className="option-label">Margin (mm)</div>
            <input type="number" min="0" max="50" value={margin} onChange={e => setMargin(e.target.value)} style={{ width: '80px' }} />
          </div>
        </div>
      )}

      {processing && (
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">Converting… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button className="btn-primary" onClick={convert} disabled={!files.length || processing}>
        {processing ? '⏳ Converting…' : '🖼️ Convert to PDF'}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">PDF Created!</div>
          <div className="result-subtitle">{result.count} image{result.count !== 1 ? 's' : ''} converted → {result.name}</div>
          <div className="alert alert-info" style={{ marginTop: 12 }}>📥 Your PDF has been automatically downloaded!</div>
        </div>
      )}
    </div>
  );
}
