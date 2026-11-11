import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { ProductImage } from '../components/product/ProductImage';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/format';

export function OrderHistoryPage() {
  const { isAuthenticated, apiMode } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      if (apiMode === 'live' && !isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const list = await ordersApi.getHistory();
        if (active) setOrders(list);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load order history.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOrders();
    return () => {
      active = false;
    };
  }, [apiMode, isAuthenticated]);

  if (apiMode === 'live' && !isAuthenticated) {
    return (
      <div className="container orders-page">
        <div className="empty-panel">
          <Package size={38} strokeWidth={1.5} />
          <h2>Sign in to view your orders</h2>
          <p>Access past transactions, tracking statuses, and receipts.</p>
          <Link to="/login?next=/orders" className="btn btn--primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container orders-page">
      <div className="cart-page__head">
        <div>
          <span className="section__kicker">Account Activity</span>
          <h1 className="page-title">Order History</h1>
        </div>
        <Link to="/shop" className="btn btn--secondary btn--sm">
          Shop Catalog
        </Link>
      </div>

      {error && (
        <div className="alert alert--danger">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="empty-panel">
          <p>Loading your past orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-panel">
          <ShoppingBag size={38} strokeWidth={1.5} />
          <h2>No orders yet</h2>
          <p>Once you complete checkout, your confirmed orders will appear here.</p>
          <Link to="/shop" className="btn btn--primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card__header">
                <div>
                  <span className="order-card__label">Order</span>
                  <strong className="order-card__number">{order.order_number}</strong>
                </div>
                <div>
                  <span className="order-card__label">Placed</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div>
                  <span className="order-card__label">Ship To</span>
                  <span>
                    {order.shipping_address?.city
                      ? `${order.shipping_address.city}, ${order.shipping_address.country}`
                      : 'Verified Address'}
                  </span>
                </div>
                <div>
                  <span className="order-card__label">Total</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
                <span className={`order-status order-status--${order.status}`}>
                  {order.status}
                </span>
              </div>

              <div className="order-card__items">
                {order.items.map((item) => (
                  <div key={item.id} className="order-card__item">
                    <ProductImage src={item.product_image} alt={item.product_name} />
                    <div className="order-card__item-info">
                      <Link to={`/products/${item.product_id}`}>{item.product_name}</Link>
                      <span>
                        Qty {item.quantity} · {formatCurrency(item.unit_price)} each
                      </span>
                    </div>
                    <strong>{formatCurrency(item.line_total)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

