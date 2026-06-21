import ToolCard from '../components/ToolCard';

const tools = [
  {
    icon: '🗜️',
    title: 'PDF Compressor',
    desc: 'Reduce your PDF file size without losing quality. Perfect for email and web sharing.',
    to: '/compress',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    shadow: '0 0 20px rgba(245, 158, 11, 0.25)',
  },
  {
    icon: '🖼️',
    title: 'Image to PDF',
    desc: 'Convert JPG, PNG, and WebP images into a single professional PDF document.',
    to: '/image-to-pdf',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    shadow: '0 0 20px rgba(139, 92, 246, 0.25)',
  },
  {
    icon: '📸',
    title: 'PDF to Images',
    desc: 'Extract every page of your PDF as a high-resolution JPG or PNG image.',
    to: '/pdf-to-images',
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    shadow: '0 0 20px rgba(124, 58, 237, 0.25)',
  },
  {
    icon: '🔗',
    title: 'Merge PDFs',
    desc: 'Combine multiple PDF files into one. Drag to reorder pages before merging.',
    to: '/merge',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    shadow: '0 0 20px rgba(16, 185, 129, 0.25)',
  },
  {
    icon: '✂️',
    title: 'Split PDF',
    desc: 'Extract specific pages or split every page into individual PDF files.',
    to: '/split',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    shadow: '0 0 20px rgba(6, 182, 212, 0.25)',
  },
  {
    icon: '📝',
    title: 'Word to PDF',
    desc: 'Convert Word DOCX documents to PDF instantly — all processing in your browser.',
    to: '/word-to-pdf',
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)',
    shadow: '0 0 20px rgba(244, 63, 94, 0.25)',
  },
];

export default function Home() {
  return (
    <div className="main-content">
      <div className="hero">
        <div className="hero-badge">⚡ 100% Free &amp; Private</div>
        <h1>
          Your Complete<br />
          <span>PDF Toolkit</span>
        </h1>
        <p className="hero-sub">
          Compress, convert, merge, split and transform PDFs — all in your browser.
          No uploads to servers. No subscriptions. No limits.
        </p>
      </div>
      <div className="tools-grid">
        {tools.map((tool) => (
          <ToolCard key={tool.to} {...tool} />
        ))}
      </div>
    </div>
  );
}
