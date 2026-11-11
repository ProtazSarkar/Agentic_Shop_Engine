import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import { ProductImage } from '../components/product/ProductImage';
import { useCart } from '../context/CartContext';
import { formatCurrency, getStockMeta } from '../utils/format';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, mutatingId } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDetail() {
      setLoading(true);
      setError('');
      setQuantity(1);
      try {
        const item = await productsApi.getById(id);
        if (!active) return;
        setProduct(item);
        const relRes = await productsApi.list({
          category: item.category_slug,
          page_size: 5,
        });
        if (active) {
          setRelated(
            relRes.results.filter((p) => String(p.id) !== String(item.id)).slice(0, 3)
          );
        }
      } catch (err) {
        if (active) setError(err.message || 'Product could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDetail();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container detail-page">
        <div className="detail-skeleton">
          <div className="skeleton-box skeleton-box--lg" />
          <div className="skeleton-box skeleton-box--info" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container detail-page">
        <div className="empty-panel">
          <h2>Product unavailable</h2>
          <p>{error || 'The requested item could not be found.'}</p>
          <Link to="/shop" className="btn btn--primary">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const stockMeta = getStockMeta(product.stock);
  const isAdding = mutatingId === product.id;
  const maxQty = Math.max(1, product.stock || 1);

  async function handleAdd(goToCheckout = false) {
    const res = await addItem(product, quantity, {
      openDrawerOnSuccess: !goToCheckout,
    });
    if (res?.requiresAuth) {
      navigate(`/login?next=/products/${product.id}`);
      return;
    }
    if (res?.ok && goToCheckout) {
      navigate('/checkout');
    }
  }

  return (
    <div className="container detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop" className="breadcrumbs__back">
          <ArrowLeft size={15} />
          <span>Shop</span>
        </Link>
        <span>/</span>
        <Link to={`/shop?category=${encodeURIComponent(product.category_slug)}`}>
          {product.category}
        </Link>
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-gallery">
          <div className="detail-gallery__frame">
            <ProductImage src={product.image} alt={product.name} />
            {product.badge && (
              <span className="badge badge--neutral detail-gallery__badge">{product.badge}</span>
            )}
          </div>
        </div>

        <div className="detail-info">
          <div className="detail-info__meta">
            <span className="detail-info__category">{product.category}</span>
            {product.rating !== undefined && (
              <span className="detail-info__rating">
                <Star size={15} fill="currentColor" />
                <strong>{product.rating.toFixed(1)}</strong>
                {product.review_count !== undefined && (
                  <span>({product.review_count} reviews)</span>
                )}
              </span>
            )}
          </div>

          <h1 className="detail-info__title">{product.name}</h1>

          <div className="detail-info__price-row">
            <span className="detail-info__price">{formatCurrency(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="detail-info__original">
                {formatCurrency(product.original_price)}
              </span>
            )}
            <span className={`stock-pill stock-pill--${stockMeta.tone}`}>
              <span className="stock-pill__dot" />
              {stockMeta.label}
            </span>
          </div>

          <p className="detail-info__desc">{product.description}</p>

          <div className="detail-purchase">
            <div className="qty-stepper qty-stepper--lg">
              <button
                type="button"
                disabled={!stockMeta.available || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                disabled={!stockMeta.available || quantity >= maxQty}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--lg detail-purchase__add"
              disabled={!stockMeta.available || isAdding}
              onClick={() => handleAdd(false)}
            >
              <ShoppingBag size={18} />
              <span>
                {isAdding
                  ? 'Adding...'
                  : stockMeta.available
                    ? `Add to Cart · ${formatCurrency(product.price * quantity)}`
                    : 'Currently Out of Stock'}
              </span>
            </button>

            {stockMeta.available && (
              <button
                type="button"
                className="btn btn--secondary btn--lg"
                disabled={isAdding}
                onClick={() => handleAdd(true)}
              >
                Buy Now
              </button>
            )}
          </div>

          <div className="detail-assurances">
            <div>
              <Truck size={17} />
              <span>Complimentary shipping on orders over $150</span>
            </div>
            <div>
              <ShieldCheck size={17} />
              <span>2-year studio hardware guarantee &amp; 30-day returns</span>
            </div>
            <div>
              <Check size={17} />
              <span>Dispatched directly from our studio within 24 hours</span>
            </div>
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="specs-panel">
              <h3>Technical Specifications</h3>
              <dl className="specs-list">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="specs-list__row">
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="detail-related">
          <div className="section__header">
            <div>
              <span className="section__kicker">More in {product.category}</span>
              <h2 className="section__title">You May Also Like</h2>
            </div>
          </div>
          <div className="product-grid product-grid--3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

