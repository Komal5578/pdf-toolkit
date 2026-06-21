import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DropZone from '../components/DropZone';

const GRADIENT = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
const SHADOW   = '0 0 20px rgba(139, 92, 246, 0.3)';

// ─── helpers ─────────────────────────────────────────────────────────────────
let _uidCounter = 0;
function uid() { return ++_uidCounter; }

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── SortableThumb ────────────────────────────────────────────────────────────
function SortableThumb({ item, index, total, onMoveUp, onMoveDown, onRemove, isOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const classNames = [
    'sortable-thumb',
    isDragging  ? 'is-dragging'  : '',
    isOverlay   ? 'is-overlay'   : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={setNodeRef} style={style} className={classNames}>
      {/* position badge */}
      <div className="thumb-badge">{index + 1}</div>

      {/* drag handle strip */}
      <div
        className="thumb-drag-handle"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        ⠿⠿⠿
      </div>

      {/* image */}
      <div className="thumb-img-wrap">
        <img src={item.dataUrl} alt={item.name} draggable={false} />
      </div>

      {/* filename + controls */}
      <div className="thumb-footer">
        <div className="thumb-filename" title={item.name}>{item.name}</div>
        <div className="thumb-controls">
          <button
            className="thumb-btn"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            title="Move left"
          >←</button>
          <button
            className="thumb-btn"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            title="Move right"
          >→</button>
          <button
            className="thumb-btn thumb-btn-remove"
            onClick={() => onRemove(item.id)}
            title="Remove"
          >✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImageToPdf() {
  const [items,      setItems]      = useState([]); // { id, file, name, dataUrl }
  const [pageSize,   setPageSize]   = useState('a4');
  const [orientation,setOrientation]= useState('auto');
  const [margin,     setMargin]     = useState('10');
  const [processing, setProcessing] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [activeId,   setActiveId]   = useState(null);

  const addInputRef = useRef();

  // dnd-kit sensors — pointer + touch + keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── add files ──────────────────────────────────────────────────────────────
  const addFiles = useCallback(async (fileList) => {
    const newItems = [];
    for (const file of fileList) {
      const dataUrl = await readAsDataURL(file);
      newItems.push({ id: uid(), file, name: file.name, dataUrl });
    }
    setItems(prev => [...prev, ...newItems]);
    setResult(null);
  }, []);

  const handleDropZone = useCallback((files) => {
    addFiles(files);
  }, [addFiles]);

  const handleAddMore = async (e) => {
    if (!e.target.files?.length) return;
    await addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  // ── reorder helpers ────────────────────────────────────────────────────────
  const moveUp = (index) => {
    if (index === 0) return;
    setItems(prev => arrayMove(prev, index, index - 1));
  };

  const moveDown = (index) => {
    setItems(prev => {
      if (index >= prev.length - 1) return prev;
      return arrayMove(prev, index, index + 1);
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // ── dnd-kit drag events ────────────────────────────────────────────────────
  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setItems(prev => {
      const oldIdx = prev.findIndex(it => it.id === active.id);
      const newIdx = prev.findIndex(it => it.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const activeItem = items.find(it => it.id === activeId) ?? null;

  // ── generate PDF ───────────────────────────────────────────────────────────
  const generate = async () => {
    if (!items.length) return;
    setProcessing(true);
    setProgress(5);
    setError('');
    setResult(null);

    try {
      const marginPx = parseInt(margin) || 0;
      let pdf = null;

      for (let i = 0; i < items.length; i++) {
        const { dataUrl, file } = items[i];
        const img  = await loadImageEl(dataUrl);
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
        const ratio   = Math.min(usableW / imgW, usableH / imgH);
        const w = imgW * ratio;
        const h = imgH * ratio;
        const x = marginPx + (usableW - w) / 2;
        const y = marginPx + (usableH - h) / 2;

        const ext = file.type === 'image/png' ? 'PNG' : 'JPEG';
        pdf.addImage(dataUrl, ext, x, y, w, h);

        setProgress(5 + Math.round(((i + 1) / items.length) * 90));
      }

      const outName = items.length === 1
        ? items[0].name.replace(/\.(jpg|jpeg|png|webp)$/i, '.pdf')
        : 'images-to-pdf.pdf';

      pdf.save(outName);
      setProgress(100);
      setResult({ name: outName, count: items.length });
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
          <div className="tool-page-subtitle">Drag to reorder, then generate your PDF</div>
        </div>
      </div>

      {/* Drop zone — only shown when no images yet */}
      {items.length === 0 && (
        <DropZone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onFiles={handleDropZone}
          label="Drop images here or click to browse"
          sublabel="JPG, PNG, WebP — multiple files supported"
          icon="🖼️"
        />
      )}

      {/* Sortable thumbnail grid */}
      {items.length > 0 && (
        <div className="options-panel" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="options-title" style={{ marginBottom: 0 }}>
              Page Order — {items.length} image{items.length !== 1 ? 's' : ''}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ⠿ Drag • ← → Move • ✕ Remove
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(it => it.id)} strategy={rectSortingStrategy}>
              <div className="sortable-grid">
                {items.map((item, idx) => (
                  <SortableThumb
                    key={item.id}
                    item={item}
                    index={idx}
                    total={items.length}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    onRemove={removeItem}
                    isOverlay={false}
                  />
                ))}

                {/* Add more button */}
                <button
                  className="add-more-btn"
                  onClick={() => addInputRef.current?.click()}
                  type="button"
                >
                  <span style={{ fontSize: 22 }}>＋</span>
                  <span>Add more</span>
                </button>
                <input
                  ref={addInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleAddMore}
                />
              </div>
            </SortableContext>

            {/* Drag overlay — floating ghost card */}
            <DragOverlay adjustScale={false}>
              {activeItem && (
                <SortableThumb
                  item={activeItem}
                  index={items.findIndex(it => it.id === activeItem.id)}
                  total={items.length}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onRemove={() => {}}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* PDF settings */}
      {items.length > 0 && (
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
            <input
              type="number" min="0" max="50" value={margin}
              onChange={e => setMargin(e.target.value)}
              style={{ width: 80 }}
            />
          </div>
        </div>
      )}

      {processing && (
        <div style={{ marginTop: 20 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">Generating PDF… {progress}%</div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <button
        className="btn-primary"
        onClick={generate}
        disabled={!items.length || processing}
      >
        {processing ? '⏳ Generating…' : `🖼️ Generate PDF (${items.length} image${items.length !== 1 ? 's' : ''})`}
      </button>

      {result && (
        <div className="result-box">
          <div className="result-icon">✅</div>
          <div className="result-title">PDF Created!</div>
          <div className="result-subtitle">
            {result.count} image{result.count !== 1 ? 's' : ''} → {result.name}
          </div>
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            📥 Your PDF has been automatically downloaded!
          </div>
        </div>
      )}
    </div>
  );
}
