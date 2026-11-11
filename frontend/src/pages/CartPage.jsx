import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductImage } from '../components/product/ProductImage';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';

export function CartPage() {
  const { cart, loading, mutatingId, updateQuantity, removeItem } = useCart();

  const estimatedShipping = cart.subtotal >= 150 || cart.subtotal === 0 ? 0 : 12;
  const estimatedTax = Number((cart.subtotal * 0.08).toFixed(2));
  const estimatedTotal = Number((cart.subtotal + estimatedShipping + estimatedTax).toFixed(2));

  return (
    <div className="container cart-page">
      <div className="cart-page__head">
        <div>
          <span className="section__kicker">Order Review</span>
          <h1 className="page-title">Shopping Cart</h1>
        </div>
        <Link to="/shop" className="btn btn--secondary btn--sm">
          Continue Shopping
        </Link>
      </div>

      {loading && cart.items.length === 0 ? (
        <div className="empty-panel">
          <p>Loading your cart...</p>
        </div>
      ) : cart.items.length === 0 ? (
        <div className="empty-panel">
          <ShoppingBag size={40} strokeWidth={1.5} />
          <h2>Your shopping cart is empty</h2>
          <p>Browse our featured hardware and everyday essentials to build your order.</p>
          <Link to="/shop" className="btn btn--primary">
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="cart-page__grid">
          <div className="cart-table-card">
            {cart.items.map((item) => {
              const busy = mutatingId === item.id;
              return (
                <div key={item.id} className="cart-row">
                  <Link to={`/products/${item.product.id}`} className="cart-row__img">
                    <ProductImage src={item.product.image} alt={item.product.name} />
                  </Link>

                  <div className="cart-row__info">
                    <span className="cart-row__cat">{item.product.category}</span>
                    <Link to={`/products/${item.product.id}`} className="cart-row__name">
                      {item.product.name}
                    </Link>
                    <span className="cart-row__unit">{formatCurrency(item.unit_price)} each</span>
                  </div>

                  <div className="cart-row__controls">
                    <div className="qty-stepper">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        disabled={busy || item.quantity >= (item.product.stock || 99)}
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="cart-row__subtotal">{formatCurrency(item.line_total)}</div>

                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      disabled={busy}
                      onClick={() => removeItem(item)}
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="summary-card">
            <h2>Order Summary</h2>
            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal ({cart.item_count} items)</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="summary-line">
                <span>Estimated Shipping</span>
                <span>{estimatedShipping === 0 ? 'Free' : formatCurrency(estimatedShipping)}</span>
              </div>
              <div className="summary-line">
                <span>Estimated Tax (8%)</span>
                <span>{formatCurrency(estimatedTax)}</span>
              </div>
              <div className="summary-line summary-line--total">
                <span>Estimated Total</span>
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
            </div>

            <Link to="/checkout" className="btn btn--primary btn--lg btn--full">
              <span>Proceed to Checkout</span>
              <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

