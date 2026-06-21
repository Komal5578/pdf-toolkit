export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-name">Komal Kanojiya</span>
        <div className="footer-divider" />
        <a href="mailto:komalsk1472@gmail.com" className="footer-email">
          komalsk1472@gmail.com
        </a>
        <div className="footer-divider" />
        <span className="footer-copy">© {new Date().getFullYear()} PDF Toolkit — Free Browser-Based PDF Tools</span>
      </div>
    </footer>
  );
}
