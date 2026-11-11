import { Link, useNavigate } from 'react-router-dom';
import { PackageCheck, ShieldAlert, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import { ProductImage } from '../product/ProductImage';
import { ActionConfirmCard } from './ActionConfirmCard';

export function AgentMessage({ message, confirmingId, onConfirmAction, onNavigate }) {
  const isUser = message.role === 'user';
  const navigate = useNavigate();
  const { addItem, mutatingId } = useCart();

  async function handleQuickAdd(product) {
    const res = await addItem(
      { ...product, stock: product.stock ?? product.stock_quantity },
      1,
      { openDrawerOnSuccess: false }
    );
    if (res?.requiresAuth) {
      onNavigate?.();
      navigate('/login');
    }
  }

  return (
    <div className={`agent-msg ${isUser ? 'agent-msg--user' : 'agent-msg--assistant'}`}>
      <div className={`agent-bubble ${message.blocked ? 'agent-bubble--blocked' : ''}`}>
        {message.blocked && (
          <div className="agent-bubble__notice">
            <ShieldAlert size={13} />
            <span>Protected request notice</span>
          </div>
        )}
        <p className="agent-bubble__text">{message.content}</p>
      </div>

      {!isUser && Array.isArray(message.cards) && message.cards.length > 0 && (
        <div className="agent-cards">
          {message.cards.map((card, idx) => {
            if (card.type === 'product_list' && Array.isArray(card.items)) {
              return (
                <div key={`pl-${idx}`} className="agent-product-list">
                  {card.items.map((item) => {
                    const inStock = (item.stock_quantity ?? item.stock ?? 0) > 0;
                    const busy = mutatingId === item.id;
                    return (
                      <div key={item.id} className="agent-product-card">
                        <Link
                          to={`/products/${item.id}`}
                          onClick={onNavigate}
                          className="agent-product-card__img"
                        >
                          <ProductImage src={item.image} alt={item.name} />
                        </Link>
                        <div className="agent-product-card__info">
                          <Link
                            to={`/products/${item.id}`}
                            onClick={onNavigate}
                            className="agent-product-card__name"
                          >
                            {item.name}
                          </Link>
                          <div className="agent-product-card__meta">
                            <span className="agent-product-card__price">
                              {formatCurrency(item.price)}
                            </span>
                            <span className={inStock ? 'in-stock-tag' : 'out-stock-tag'}>
                              {inStock ? 'In Stock' : 'Sold Out'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          disabled={!inStock || busy}
                          onClick={() => handleQuickAdd(item)}
                          aria-label={`Add ${item.name} to bag`}
                        >
                          <ShoppingBag size={14} />
                          <span>{busy ? '...' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (card.type === 'cart_summary' && card.cart) {
              return (
                <div key={`cs-${idx}`} className="agent-mini-summary">
                  <div className="agent-mini-summary__head">
                    <strong>Shopping Bag ({card.cart.item_count})</strong>
                    <span>{formatCurrency(card.cart.total_amount || 0)}</span>
                  </div>
                  <Link
                    to="/cart"
                    onClick={onNavigate}
                    className="btn btn--secondary btn--sm btn--full"
                  >
                    Open Full Bag
                  </Link>
                </div>
              );
            }

            if (card.type === 'order_list' && Array.isArray(card.orders)) {
              return (
                <div key={`ol-${idx}`} className="agent-order-list">
                  {card.orders.map((ord) => (
                    <div key={ord.id} className="agent-mini-summary">
                      <div className="agent-mini-summary__head">
                        <strong>{ord.order_number}</strong>
                        <span>{formatCurrency(ord.total_amount)}</span>
                      </div>
                      <p className="agent-mini-summary__sub">
                        Status: {ord.status} · {ord.items?.length || 0} item(s)
                      </p>
                    </div>
                  ))}
                </div>
              );
            }

            if (card.type === 'order_confirmation' && card.order) {
              return (
                <div key={`oc-${idx}`} className="agent-order-confirmed">
                  <div className="agent-order-confirmed__head">
                    <PackageCheck size={17} />
                    <div>
                      <strong>Order {card.order.order_number} Confirmed</strong>
                      <span>Total: {formatCurrency(card.order.total_amount)}</span>
                    </div>
                  </div>
                  <Link
                    to="/orders"
                    onClick={onNavigate}
                    className="btn btn--primary btn--sm btn--full"
                  >
                    View Order History
                  </Link>
                </div>
              );
            }

            if (card.type === 'action_confirm') {
              return (
                <ActionConfirmCard
                  key={card.action_id || `ac-${idx}`}
                  card={card}
                  busy={confirmingId === card.action_id}
                  onConfirm={onConfirmAction}
                  onCancel={onConfirmAction}
                />
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

