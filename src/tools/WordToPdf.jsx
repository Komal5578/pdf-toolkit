import { useState } from 'react';
import { Link } from 'react-router-dom';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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

      const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer });
      setProgress(40);

      // Create a hidden container with proper styles to preserve tables
      const container = document.createElement('div');
      container.style.cssText = `
        width: 794px;
        padding: 60px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.7;
        color: #000000;
        background: #ffffff;
        position: fixed;
        left: -9999px;
        top: 0;
        box-sizing: border-box;
      `;

      // Inject table styles so tables render correctly
      container.innerHTML = `
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          td, th {
            border: 1px solid #000;
            padding: 6px 10px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          p { margin: 6px 0; }
          h1 { font-size: 22px; font-weight: bold; margin: 14px 0 8px; }
          h2 { font-size: 18px; font-weight: bold; margin: 12px 0 6px; }
          h3 { font-size: 15px; font-weight: bold; margin: 10px 0 5px; }
          ul, ol { margin: 6px 0; padding-left: 24px; }
          li { margin: 3px 0; }
          strong { font-weight: bold; }
          em { font-style: italic; }
        </style>
        ${html}
      `;

      document.body.appendChild(container);
      setProgress(55);

      // Use html2canvas to capture the full rendered HTML including tables
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      document.body.removeChild(container);
      setProgress(80);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgWidthMm = pageWidth;
      const imgHeightMm = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeightMm;
      let position = 0;

      // Add image across multiple pages if needed
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
        heightLeft -= pageHeight;
      }

      setProgress(95);

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
          <div className="tool-page-subtitle">Convert DOCX/DOC documents to PDF — tables and formatting preserved</div>
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
        ℹ️ Tables, headings, bold, italic, and lists are fully preserved in the output PDF.
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
