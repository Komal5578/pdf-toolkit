import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #10b981, #06b6d4)';
const SHADOW = '0 0 20px rgba(16, 185, 129, 0.3)';

export default function MergePdfs() {
  const [files, setFiles] = useState([]);
  const [order, setOrder] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFiles = (newFiles) => {
    setFiles(newFiles);
    setOrder(newFiles.map((_, i) => i));
    setResult(null);
  };

  const moveItem = (from, to) => {
    const newOrder = [...order];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setOrder(newOrder);
  };

  const merge = async () => {
    if (files.length < 2) { setError('Please add at least 2 PDF files to merge.'); return; }
    setProcessing(true);
    setProgress(5);
    setError('');
    setResult(null);

    try {
      const merged = await PDFDocument.create();
      const orderedFiles = order.map(i => files[i]);

      for (let i = 0; i < orderedFiles.length; i++) {
        const buf = await orderedFiles[i].arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(10 + Math.floor(((i + 1) / orderedFiles.length) * 85));
      }

      const mergedBytes = await merged.save();
      setProgress(100);
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult({ url, name: 'merged.pdf', pages: merged.getPageCount(), count: files.length });
    } catch (e) {
      setError('Merge failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-page">
      <div className="tool-page-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>🔗</div>
        <div>
          <div className="tool-page-title">Merge PDFs</div>
          <div className="tool-page-subtitle">Combine multiple PDF files into one document</div>
        </div>
      </div>

      <DropZone
        accept=".pdf,application/pdf"
        multiple
        onFiles={handleFiles}
        label="Drop multiple PDFs here or click to browse"
        sublabel="Add 2 or more PDF files — drag to reorder below"
        icon="🔗"
      />

      {files.length >= 2 && (
        <div className="options-panel" style={{ marginTop: 20 }}>
          <div className="options-title">Merge Order (drag to reorder)</div>
          <div className="draggable-list">
            {order.map((fileIdx, listIdx) => (
              <div
                key={fileIdx}
                className="draggable-item"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', listIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData('text/plain'));
                  moveItem(from, listIdx);
                }}
              >
                <span className="drag-handle">⠿</span>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{files[fileIdx]?.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{listIdx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {processing && (
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: GRADIENT }} />
          </div>
          <div className="progress-text">Merging… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
        onClick={merge}
        disabled={files.length < 2 || processing}
      >
        {processing ? '⏳ Merging…' : '🔗 Merge PDFs'}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">Merged Successfully!</div>
          <div className="result-subtitle">{result.count} files combined → {result.pages} pages total</div>
          <a href={result.url} download={result.name} className="btn-download">
            ⬇️ Download Merged PDF
          </a>
        </div>
      )}
    </div>
  );
}
