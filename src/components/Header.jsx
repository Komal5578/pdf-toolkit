import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <div className="logo-icon">📄</div>
          <span className="logo-text">PDF Toolkit</span>
        </Link>
        <a
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-hero"
        >
          ⚡ Built for Digital Heroes
        </a>
      </div>
    </header>
  );
}
