import { useState } from 'react';
import { Link } from 'react-router-dom';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #f43f5e, #ec4899)';
const SHADOW = '0 0 20px rgba(244, 63, 94, 0.3)';

export default function WordToPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const handleFiles = async (newFiles) => {
    setFiles(newFiles);
    setResult(null);
    setPreviewHtml('');
    if (newFiles.length > 0) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(html);
      } catch (_) {}
    }
  };

  const convert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      setProgress(25);

      // Convert DOCX to HTML using mammoth
      const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer });
      setProgress(50);

      // Create a temporary element to render HTML
      const container = document.createElement('div');
      container.style.cssText = `
        width: 800px;
        padding: 60px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: #000;
        background: #fff;
        position: fixed;
        left: -9999px;
        top: 0;
      `;
      container.innerHTML = html;
      document.body.appendChild(container);

      setProgress(60);

      // Use jsPDF with html method
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      // Convert HTML text content to PDF using jsPDF's text wrapping
      const plainText = container.innerText || container.textContent || '';
      document.body.removeChild(container);

      const lines = plainText.split('\n').filter(l => l.trim());
      const pageWidth = 190; // A4 width minus margins
      const pageHeight = 267; // A4 height minus margins
      const margin = 15;
      const lineHeight = 6;
      let y = margin;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      for (const line of lines) {
        const splitLines = pdf.splitTextToSize(line, pageWidth);
        for (const sl of splitLines) {
          if (y + lineHeight > pageHeight) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(sl, margin, y);
          y += lineHeight;
        }
        y += 2; // paragraph spacing
      }

      setProgress(90);

      const outName = files[0].name.replace(/\.(docx?|doc)$/i, '.pdf');
      pdf.save(outName);

      setProgress(100);
      setResult({ name: outName, warnings: messages.filter(m => m.type === 'warning').length });
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
        <div className="tool-page-icon" style={{ background: GRADIENT, boxShadow: SHADOW }}>📝</div>
        <div>
          <div className="tool-page-title">Word to PDF</div>
          <div className="tool-page-subtitle">Convert DOCX/DOC documents to PDF in the browser</div>
        </div>
      </div>

      <DropZone
        accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple={false}
        onFiles={handleFiles}
        label="Drop your Word document here"
        sublabel="Supports .docx and .doc files"
        icon="📝"
      />

      {previewHtml && (
        <div className="options-panel" style={{ marginTop: 20 }}>
          <div className="options-title">Document Preview</div>
          <div
            style={{
              maxHeight: 300,
              overflowY: 'auto',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              paddingTop: 8,
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {processing && (
        <div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: GRADIENT }} />
          </div>
          <div className="progress-text">Converting… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <div className="alert alert-info" style={{ marginTop: files.length ? 16 : 0 }}>
        ℹ️ Complex formatting (tables, images, special fonts) may be simplified. Text content will be preserved.
      </div>

      <button
        className="btn-primary"
        style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(244,63,94,0.35)' }}
        onClick={convert}
        disabled={!files.length || processing}
      >
        {processing ? '⏳ Converting…' : '📝 Convert to PDF'}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">Converted Successfully!</div>
          <div className="result-subtitle">
            {result.name} has been downloaded
            {result.warnings > 0 && ` (${result.warnings} formatting notes)`}
          </div>
          <div className="alert alert-info" style={{ marginTop: 12 }}>📥 Your PDF has been automatically downloaded!</div>
        </div>
      )}
    </div>
  );
}
