import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency, getStockMeta } from '../../utils/format';
import { ProductImage } from './ProductImage';

export function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addItem, mutatingId } = useCart();
  const stockMeta = getStockMeta(product.stock);
  const isAdding = mutatingId === product.id;

  const discountPercent =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : 0;

  async function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!stockMeta.available || isAdding) return;
    const res = await addItem(product, 1);
    if (res?.requiresAuth) {
      navigate('/login?next=/shop');
    }
  }

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__media">
        <ProductImage src={product.image} alt={product.name} className="product-card__img" />
        <div className="product-card__badges">
          {product.badge && <span className="badge badge--neutral">{product.badge}</span>}
          {discountPercent > 0 && (
            <span className="badge badge--accent">-{discountPercent}%</span>
          )}
        </div>
        {!stockMeta.available && (
          <div className="product-card__soldout">Out of Stock</div>
        )}
      </Link>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__category">{product.category}</span>
          {product.rating !== undefined && (
            <span className="product-card__rating">
              <Star size={13} fill="currentColor" />
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>

        <Link to={`/products/${product.id}`} className="product-card__title">
          {product.name}
        </Link>

        <p className="product-card__desc">{product.description}</p>

        <div className="product-card__footer">
          <div className="product-card__price-group">
            <span className="product-card__price">{formatCurrency(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="product-card__original">
                {formatCurrency(product.original_price)}
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn btn--sm btn--primary product-card__cta"
            disabled={!stockMeta.available || isAdding}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag size={15} />
            <span>{isAdding ? 'Adding...' : stockMeta.available ? 'Add' : 'Sold out'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

