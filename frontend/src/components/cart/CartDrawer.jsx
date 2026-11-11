import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import { ProductImage } from '../product/ProductImage';

const FREE_SHIPPING_THRESHOLD = 150;

export function CartDrawer() {
  const navigate = useNavigate();
  const { cart, drawerOpen, closeDrawer, updateQuantity, removeItem, mutatingId } = useCart();

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && drawerOpen) {
        closeDrawer();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal);
  const progressPct = Math.min(100, (cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="drawer-backdrop" onClick={closeDrawer} role="presentation">
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="drawer__header">
          <div className="drawer__title-row">
            <ShoppingBag size={20} />
            <h2>Your Cart</h2>
            <span className="pill-count">{cart.item_count}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={closeDrawer}
            aria-label="Close cart drawer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer__shipping-meter">
          <div className="drawer__shipping-text">
            <Truck size={15} />
            {remainingForFreeShipping === 0 && cart.item_count > 0 ? (
              <span>You&apos;ve unlocked <strong>complimentary standard shipping</strong>.</span>
            ) : (
              <span>
                Add <strong>{formatCurrency(remainingForFreeShipping)}</strong> more for free shipping
              </span>
            )}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="drawer__body">
          {cart.items.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={36} strokeWidth={1.5} />
              <h3>Your cart is empty</h3>
              <p>Explore our curated objects and add items to get started.</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  closeDrawer();
                  navigate('/shop');
                }}
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <ul className="cart-list">
              {cart.items.map((item) => {
                const busy = mutatingId === item.id;
                return (
                  <li key={item.id} className="cart-item">
                    <Link
                      to={`/products/${item.product.id}`}
                      className="cart-item__img-wrap"
                      onClick={closeDrawer}
                    >
                      <ProductImage src={item.product.image} alt={item.product.name} />
                    </Link>

                    <div className="cart-item__details">
                      <div className="cart-item__top">
                        <Link
                          to={`/products/${item.product.id}`}
                          className="cart-item__name"
                          onClick={closeDrawer}
                        >
                          {item.product.name}
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          disabled={busy}
                          onClick={() => removeItem(item)}
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="cart-item__unit">
                        {formatCurrency(item.unit_price)} each
                      </div>

                      <div className="cart-item__bottom">
                        <div className="qty-stepper">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            disabled={busy || item.quantity >= (item.product.stock || 99)}
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <span className="cart-item__total">
                          {formatCurrency(item.line_total)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="drawer__footer">
            <div className="drawer__subtotal">
              <span>Subtotal</span>
              <strong>{formatCurrency(cart.subtotal)}</strong>
            </div>
            <p className="drawer__note">Shipping &amp; taxes calculated at checkout.</p>
            <div className="drawer__actions">
              <Link to="/cart" className="btn btn--secondary" onClick={closeDrawer}>
                View Cart
              </Link>
              <Link to="/checkout" className="btn btn--primary" onClick={closeDrawer}>
                <span>Checkout</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

