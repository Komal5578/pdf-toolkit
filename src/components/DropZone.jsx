import { useState, useRef, useCallback } from 'react';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DropZone({ accept, multiple, onFiles, label, sublabel, icon }) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef();

  const processFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles);
    const updated = multiple ? [...files, ...arr] : arr;
    setFiles(updated);
    onFiles(updated);
  }, [files, multiple, onFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleChange = (e) => processFiles(e.target.files);

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFiles(updated);
    inputRef.current.value = '';
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📝';
    return '📁';
  };

  return (
    <div>
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span className="drop-icon">{icon || '📂'}</span>
        <div className="drop-title">{label || 'Drop files here or click to browse'}</div>
        <div className="drop-subtitle">{sublabel || (accept ? `Accepted: ${accept}` : 'Any file type')}</div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="file-item">
              <span className="file-icon">{getFileIcon(file)}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
              <button className="file-remove" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
