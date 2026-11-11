import { useState } from 'react';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export function ActionConfirmCard({ card, busy, onConfirm, onCancel }) {
  const summary = card.summary || {};
  const existingAddr = summary.shipping_address || {};
  const needsAddress =
    Array.isArray(summary.missing_address_fields) && summary.missing_address_fields.length > 0;

  const [shippingMethod, setShippingMethod] = useState(summary.shipping_method || 'standard');
  const [address, setAddress] = useState({
    full_name: existingAddr.full_name || '',
    address_line1: existingAddr.address_line1 || '',
    city: existingAddr.city || '',
    postal_code: existingAddr.postal_code || '',
    country: existingAddr.country || 'United States',
  });
  const [showAddressForm, setShowAddressForm] = useState(needsAddress);
  const [fieldError, setFieldError] = useState('');

  const status = card.status || 'pending';

  function handleApprove(e) {
    e.preventDefault();
    setFieldError('');
    if (
      !address.full_name.trim() ||
      !address.address_line1.trim() ||
      !address.city.trim() ||
      !address.postal_code.trim() ||
      !address.country.trim()
    ) {
      setShowAddressForm(true);
      setFieldError('Please complete your recipient name, street, city, postal code, and country.');
      return;
    }

    onConfirm({
      actionId: card.action_id,
      decision: 'confirm',
      shippingMethod,
      shippingAddress: address,
    });
  }

  return (
    <div className={`agent-confirm-card agent-confirm-card--${status}`}>
      <div className="agent-confirm-card__head">
        <div>
          <span className="agent-confirm-card__kicker">Order Confirmation Required</span>
          <h4>Review &amp; Place Order</h4>
        </div>
        {status === 'confirmed' && (
          <span className="agent-status-pill agent-status-pill--success">
            <CheckCircle2 size={13} />
            <span>Confirmed</span>
          </span>
        )}
        {status === 'cancelled' && (
          <span className="agent-status-pill agent-status-pill--muted">
            <XCircle size={13} />
            <span>Cancelled</span>
          </span>
        )}
        {status === 'expired' && (
          <span className="agent-status-pill agent-status-pill--muted">Expired</span>
        )}
      </div>

      <ul className="agent-confirm-card__items">
        {(summary.items || []).map((item) => (
          <li key={`${item.product_id}-${item.cart_item_id}`}>
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <strong>{formatCurrency(item.line_total)}</strong>
          </li>
        ))}
      </ul>

      <div className="agent-confirm-card__totals">
        <div>
          <span>Subtotal</span>
          <span>{formatCurrency(summary.subtotal || 0)}</span>
        </div>
        <div>
          <span>Shipping ({shippingMethod === 'express' ? 'Express' : 'Standard'})</span>
          <span>
            {Number(summary.shipping_cost || 0) === 0
              ? 'Free'
              : formatCurrency(summary.shipping_cost)}
          </span>
        </div>
        <div>
          <span>Estimated Tax</span>
          <span>{formatCurrency(summary.tax || 0)}</span>
        </div>
        <div className="agent-confirm-card__grand">
          <span>Total</span>
          <strong>{formatCurrency(summary.total_amount || 0)}</strong>
        </div>
      </div>

      {status === 'pending' && (
        <form onSubmit={handleApprove} className="agent-confirm-card__form">
          <div className="agent-confirm-card__ship-toggle">
            <label>
              <input
                type="radio"
                name={`ship-${card.action_id}`}
                checked={shippingMethod === 'standard'}
                onChange={() => setShippingMethod('standard')}
              />
              <span>Standard</span>
            </label>
            <label>
              <input
                type="radio"
                name={`ship-${card.action_id}`}
                checked={shippingMethod === 'express'}
                onChange={() => setShippingMethod('express')}
              />
              <span>Express ($18)</span>
            </label>
            {!showAddressForm && (
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowAddressForm(true)}
              >
                Edit address
              </button>
            )}
          </div>

          {showAddressForm ? (
            <div className="agent-confirm-card__fields">
              <input
                type="text"
                placeholder="Full Name *"
                value={address.full_name}
                onChange={(e) => setAddress((a) => ({ ...a, full_name: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Street Address *"
                value={address.address_line1}
                onChange={(e) => setAddress((a) => ({ ...a, address_line1: e.target.value }))}
                required
              />
              <div className="agent-confirm-card__row">
                <input
                  type="text"
                  placeholder="City *"
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Postal Code *"
                  value={address.postal_code}
                  onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Country *"
                value={address.country}
                onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                required
              />
            </div>
          ) : (
            <p className="agent-confirm-card__addr-preview">
              Delivering to <strong>{address.full_name}</strong> · {address.address_line1},{' '}
              {address.city} {address.postal_code}
            </p>
          )}

          {fieldError && <p className="agent-confirm-card__err">{fieldError}</p>}

          <div className="agent-confirm-card__actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
              <Lock size={14} />
              <span>{busy ? 'Confirming...' : 'Confirm & Place Order'}</span>
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={busy}
              onClick={() => onCancel({ actionId: card.action_id, decision: 'cancel' })}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

