import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Cpu,
  Headphones,
  Layers,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { productsApi } from '../api/products';
import { HybridSearchBar } from '../components/product/HybridSearchBar';
import { ProductCard } from '../components/product/ProductCard';
import { ProductImage } from '../components/product/ProductImage';

const COLLECTION_IMAGES = {
  audio: '/images/products/headphones.svg',
  workspace: '/images/products/keyboard.svg',
  'smart-home': '/images/products/purifier.svg',
  carry: '/images/products/backpack.svg',
  kitchen: '/images/products/kettle.svg',
};

export function HomePage() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadHome() {
      setLoading(true);
      try {
        const [productsRes, catsRes] = await Promise.all([
          productsApi.list({ page_size: 12 }),
          productsApi.getCategories(),
        ]);
        if (!active) return;
        const prioritized = productsRes.results.filter((p) => p.is_trending);
        setTrending((prioritized.length >= 4 ? prioritized : productsRes.results).slice(0, 4));
        setCategories(catsRes.slice(0, 5));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHome();
    return () => {
      active = false;
    };
  }, []);

  function handleHeroSearch(query) {
    if (!query) {
      navigate('/shop');
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(query)}&mode=hybrid`);
  }

  return (
    <div className="page-stack">
      {/* Hero Banner */}
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__content">
            <div className="eyebrow">
              <Sparkles size={14} />
              <span>Autumn Studio Collection · Curated Objects</span>
            </div>
            <h1 className="hero__title">
              Tactile objects built for <em>quiet focus</em> and daily ritual.
            </h1>
            <p className="hero__subtitle">
              Discover precision audio, ergonomic workspace instruments, and mindful home goods.
              Search naturally by intent, budget, or material.
            </p>

            <HybridSearchBar onSearch={handleHeroSearch} />

            <div className="hero__actions">
              <Link to="/shop" className="btn btn--primary btn--lg">
                <span>Explore Catalog</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/shop?category=workspace" className="btn btn--secondary btn--lg">
                Workspace Edit
              </Link>
            </div>
          </div>

          <div className="hero__showcase">
            <div className="showcase-card showcase-card--main">
              <div className="showcase-card__tag">Featured Drop</div>
              <ProductImage
                src="/images/products/headphones.svg"
                alt="Aether Studio ANC Headphones"
                className="showcase-card__img"
              />
              <div className="showcase-card__caption">
                <div>
                  <strong>Aether Studio ANC</strong>
                  <span>Beryllium Drivers · 42h Battery</span>
                </div>
                <Link to="/products/1" className="btn btn--sm btn--primary">
                  $249
                </Link>
              </div>
            </div>

            <div className="showcase-stat-grid">
              <div className="stat-tile">
                <Headphones size={18} />
                <strong>Studio Grade</strong>
                <span>Acoustic &amp; ANC tuned</span>
              </div>
              <div className="stat-tile">
                <Cpu size={18} />
                <strong>Guided Search</strong>
                <span>Style, need &amp; budget match</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="pillars-bar">
        <div className="container pillars-bar__grid">
          <div className="pillar">
            <Truck size={20} />
            <div>
              <strong>Free Shipping Over $150</strong>
              <span>Carbon-neutral dispatch in 24h</span>
            </div>
          </div>
          <div className="pillar">
            <ShieldCheck size={20} />
            <div>
              <strong>2-Year Hardware Warranty</strong>
              <span>Verified stock &amp; direct support</span>
            </div>
          </div>
          <div className="pillar">
            <Layers size={20} />
            <div>
              <strong>Personal Concierge</strong>
              <span>Natural discovery &amp; instant care</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <span className="section__kicker">Curated Departments</span>
              <h2 className="section__title">Featured Collections</h2>
            </div>
            <Link to="/shop" className="link-arrow">
              <span>View all products</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="collections-grid">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/shop?category=${encodeURIComponent(cat.slug)}`}
                className="collection-card"
              >
                <div className="collection-card__media">
                  <ProductImage
                    src={COLLECTION_IMAGES[cat.slug] || '/images/products/fallback.svg'}
                    alt={cat.name}
                  />
                </div>
                <div className="collection-card__info">
                  <h3>{cat.name}</h3>
                  <p>{cat.description || 'Explore curated essentials'}</p>
                  <span className="collection-card__count">
                    {cat.product_count} {cat.product_count === 1 ? 'item' : 'items'} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Editorial Banner */}
      <section className="section section--compact">
        <div className="container">
          <div className="promo-banner">
            <div className="promo-banner__content">
              <span className="badge badge--accent">Seasonal Bundle Offer</span>
              <h2>Build a calmer desk architecture. Save up to 15% on audio + lighting.</h2>
              <p>
                Pair our Tactile 75% Mechanical Keyboard with the Arc Architectural Desk Lamp and
                Solid Walnut Riser—automatically ships free.
              </p>
              <Link to="/shop?category=workspace" className="btn btn--inverse">
                <span>Shop Workspace</span>
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="promo-banner__visual">
              <ProductImage src="/images/products/lamp.svg" alt="Arc Desk Lamp" />
              <ProductImage src="/images/products/riser.svg" alt="Walnut Monitor Riser" />
            </div>
          </div>
        </div>
      </section>

      {/* Trending Grid */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <span className="section__kicker">Most Requested This Week</span>
              <h2 className="section__title">Trending Now</h2>
            </div>
            <Link to="/shop?sort=rating" className="link-arrow">
              <span>Shop top rated</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="product-grid product-grid--4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="skeleton-card" />
              ))}
            </div>
          ) : (
            <div className="product-grid product-grid--4">
              {trending.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

