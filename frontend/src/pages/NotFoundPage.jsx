import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container auth-page">
      <div className="empty-panel">
        <span className="section__kicker">404</span>
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <div className="confirmation-card__actions">
          <Link to="/" className="btn btn--primary">
            Back Home
          </Link>
          <Link to="/shop" className="btn btn--secondary">
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}

