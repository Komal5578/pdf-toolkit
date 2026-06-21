import { Link } from 'react-router-dom';

export default function ToolCard({ icon, title, desc, to, gradient, shadow }) {
  return (
    <Link
      to={to}
      className="tool-card"
      style={{ '--card-gradient': gradient, '--card-shadow': shadow }}
    >
      <div className="card-icon" style={{ background: gradient, boxShadow: shadow }}>
        {icon}
      </div>
      <div className="card-body">
        <div className="card-title">{title}</div>
        <div className="card-desc">{desc}</div>
      </div>
      <div className="card-arrow">
        Use Tool <span>→</span>
      </div>
    </Link>
  );
}
