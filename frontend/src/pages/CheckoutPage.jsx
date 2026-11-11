import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { ProductImage } from '../components/product/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';

const STEPS = [
  { id: 1, label: 'Shipping', icon: MapPin },
  { id: 2, label: 'Delivery & Payment', icon: CreditCard },
  { id: 3, label: 'Confirm', icon: PackageCheck },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, apiMode } = useAuth();
  const { cart, checkout, loading } = useCart();

  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [formError, setFormError] = useState('');

  const [address, setAddress] = useState({
    full_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
  });
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      setAddress((prev) => ({
        ...prev,
        full_name: prev.full_name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const shippingCost =
    shippingMethod === 'express' ? 18 : cart.subtotal >= 150 || cart.subtotal === 0 ? 0 : 12;
  const tax = Number((cart.subtotal * 0.08).toFixed(2));
  const grandTotal = Number((cart.subtotal + shippingCost + tax).toFixed(2));

  function updateField(field, value) {
    setFormError('');
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep1() {
    const required = [
      ['full_name', 'Full name'],
      ['email', 'Email address'],
      ['phone', 'Phone number'],
      ['address_line1', 'Street address'],
      ['city', 'City'],
      ['state', 'State / Province'],
      ['postal_code', 'Postal code'],
      ['country', 'Country'],
    ];
    for (const [key, label] of required) {
      if (!String(address[key] || '').trim()) {
        setFormError(`Please enter your ${label.toLowerCase()}.`);
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    return true;
  }

  function handleNextStep() {
    if (step === 1 && !validateStep1()) return;
    setFormError('');
    setStep((s) => Math.min(3, s + 1));
  }

  async function handleConfirmOrder() {
    if (apiMode === 'live' && !isAuthenticated) {
      navigate('/login?next=/checkout');
      return;
    }
    setFormError('');
    try {
      const order = await checkout({
        shipping_address: address,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        notes,
      });
      setCompletedOrder({
        ...order,
        shipping_address: order.shipping_address || address,
      });
    } catch (err) {
      setFormError(err.message || 'Unable to complete order.');
    }
  }

  if (completedOrder) {
    return (
      <div className="container checkout-page">
        <div className="confirmation-card">
          <div className="confirmation-card__icon">
            <CheckCircle2 size={44} />
          </div>
          <span className="section__kicker">Order Confirmed</span>
          <h1 className="page-title">Thank you for your order</h1>
          <p className="confirmation-card__subtitle">
            Order <strong>{completedOrder.order_number}</strong> has been verified and queued for
            dispatch to{' '}
            <strong>
              {completedOrder.shipping_address.city}, {completedOrder.shipping_address.country}
            </strong>
            .
          </p>

          <div className="confirmation-summary">
            <div className="confirmation-summary__items">
              {completedOrder.items.map((item) => (
                <div key={item.id} className="confirmation-item">
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.line_total)}</strong>
                </div>
              ))}
            </div>
            <div className="confirmation-summary__totals">
              <div>
                <span>Subtotal</span>
                <span>{formatCurrency(completedOrder.subtotal)}</span>
              </div>
              <div>
                <span>Shipping</span>
                <span>
                  {completedOrder.shipping_cost === 0
                    ? 'Free'
                    : formatCurrency(completedOrder.shipping_cost)}
                </span>
              </div>
              <div>
                <span>Tax</span>
                <span>{formatCurrency(completedOrder.tax)}</span>
              </div>
              <div className="confirmation-summary__grand">
                <span>Total Paid</span>
                <strong>{formatCurrency(completedOrder.total)}</strong>
              </div>
            </div>
          </div>

          <div className="confirmation-card__actions">
            <Link to="/orders" className="btn btn--primary">
              View Order History
            </Link>
            <Link to="/shop" className="btn btn--secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container checkout-page">
        <div className="empty-panel">
          <h2>Your cart is empty</h2>
          <p>Add products to your shopping cart before proceeding to checkout.</p>
          <Link to="/shop" className="btn btn--primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <div className="checkout-head">
        <div>
          <span className="section__kicker">Secure Checkout</span>
          <h1 className="page-title">Complete Your Order</h1>
        </div>

        <ol className="stepper" aria-label="Checkout progress">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li
                key={s.id}
                className={`stepper__item ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              >
                <span className="stepper__num">
                  <Icon size={15} />
                </span>
                <span className="stepper__label">{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {apiMode === 'live' && !isAuthenticated && (
        <div className="alert alert--info">
          <span>
            Please <Link to="/login?next=/checkout">sign in</Link> to complete your order.
          </span>
        </div>
      )}

      {formError && (
        <div className="alert alert--danger" role="alert">
          <span>{formError}</span>
        </div>
      )}

      <div className="checkout-grid">
        <div className="checkout-form-card">
          {step === 1 && (
            <div className="checkout-step">
              <h2>1. Shipping Address</h2>
              <div className="form-grid">
                <label className="field field--full">
                  <span>Full Name *</span>
                  <input
                    type="text"
                    value={address.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="Alex Mercer"
                  />
                </label>

                <label className="field">
                  <span>Email Address *</span>
                  <input
                    type="email"
                    value={address.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="alex@example.com"
                  />
                </label>

                <label className="field">
                  <span>Phone Number *</span>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+1 (415) 555-0192"
                  />
                </label>

                <label className="field field--full">
                  <span>Address Line 1 *</span>
                  <input
                    type="text"
                    value={address.address_line1}
                    onChange={(e) => updateField('address_line1', e.target.value)}
                    placeholder="742 Evergreen Terrace"
                  />
                </label>

                <label className="field field--full">
                  <span>Apartment, Suite, Unit (optional)</span>
                  <input
                    type="text"
                    value={address.address_line2}
                    onChange={(e) => updateField('address_line2', e.target.value)}
                    placeholder="Suite 4B"
                  />
                </label>

                <label className="field">
                  <span>City *</span>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="San Francisco"
                  />
                </label>

                <label className="field">
                  <span>State / Region *</span>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="CA"
                  />
                </label>

                <label className="field">
                  <span>Postal Code *</span>
                  <input
                    type="text"
                    value={address.postal_code}
                    onChange={(e) => updateField('postal_code', e.target.value)}
                    placeholder="94107"
                  />
                </label>

                <label className="field">
                  <span>Country *</span>
                  <input
                    type="text"
                    value={address.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="United States"
                  />
                </label>
              </div>

              <div className="checkout-step__actions">
                <Link to="/cart" className="btn btn--secondary">
                  <ArrowLeft size={16} />
                  <span>Back to Cart</span>
                </Link>
                <button type="button" className="btn btn--primary" onClick={handleNextStep}>
                  <span>Continue to Delivery</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="checkout-step">
              <h2>2. Delivery &amp; Payment</h2>

              <div className="choice-group">
                <h3>Shipping Speed</h3>
                <label className={`choice-card ${shippingMethod === 'standard' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                  />
                  <div>
                    <strong>Standard Courier (3–5 business days)</strong>
                    <span>Free on orders over $150, otherwise $12.00</span>
                  </div>
                  <span className="choice-card__price">
                    {cart.subtotal >= 150 ? 'Free' : '$12.00'}
                  </span>
                </label>

                <label className={`choice-card ${shippingMethod === 'express' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                  />
                  <div>
                    <strong>Express Air Priority (1–2 business days)</strong>
                    <span>Tracked priority dispatch with signature delivery</span>
                  </div>
                  <span className="choice-card__price">$18.00</span>
                </label>
              </div>

              <div className="choice-group">
                <h3>Payment Method</h3>
                <label className={`choice-card ${paymentMethod === 'card' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <div>
                    <strong>Credit or Debit Card</strong>
                    <span>All major cards safely supported</span>
                  </div>
                  <CreditCard size={18} />
                </label>

                <label className={`choice-card ${paymentMethod === 'wallet' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                  />
                  <div>
                    <strong>Digital Wallet / Express Pay</strong>
                    <span>Fast one-tap express checkout</span>
                  </div>
                  <Lock size={18} />
                </label>

                <label className={`choice-card ${paymentMethod === 'cod' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div>
                    <strong>Pay on Delivery</strong>
                    <span>Settle upon courier arrival</span>
                  </div>
                  <Truck size={18} />
                </label>
              </div>

              <label className="field field--full">
                <span>Delivery Notes (optional)</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate code, concierge instructions, or preferred drop-off spot..."
                />
              </label>

              <div className="checkout-step__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} />
                  <span>Edit Shipping</span>
                </button>
                <button type="button" className="btn btn--primary" onClick={handleNextStep}>
                  <span>Review Order</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="checkout-step">
              <h2>3. Review &amp; Confirm</h2>

              <div className="review-boxes">
                <div className="review-box">
                  <div className="review-box__head">
                    <h3>Shipping To</h3>
                    <button type="button" className="btn-link" onClick={() => setStep(1)}>
                      Edit
                    </button>
                  </div>
                  <p>
                    <strong>{address.full_name}</strong>
                    <br />
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ''}
                    <br />
                    {address.city}, {address.state} {address.postal_code}
                    <br />
                    {address.country} · {address.phone}
                  </p>
                </div>

                <div className="review-box">
                  <div className="review-box__head">
                    <h3>Method</h3>
                    <button type="button" className="btn-link" onClick={() => setStep(2)}>
                      Edit
                    </button>
                  </div>
                  <p>
                    <strong>
                      {shippingMethod === 'express' ? 'Express Air Priority' : 'Standard Courier'}
                    </strong>
                    <br />
                    Payment:{' '}
                    {paymentMethod === 'card'
                      ? 'Credit / Debit Card'
                      : paymentMethod === 'wallet'
                        ? 'Digital Wallet'
                        : 'Pay on Delivery'}
                  </p>
                </div>
              </div>

              <div className="review-items">
                <h3>Items ({cart.item_count})</h3>
                {cart.items.map((item) => (
                  <div key={item.id} className="review-item">
                    <ProductImage src={item.product.image} alt={item.product.name} />
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>
                        Qty {item.quantity} × {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                    <strong>{formatCurrency(item.line_total)}</strong>
                  </div>
                ))}
              </div>

              <div className="checkout-step__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  disabled={loading}
                  onClick={handleConfirmOrder}
                >
                  <Lock size={16} />
                  <span>
                    {loading
                      ? 'Placing Your Order...'
                      : `Place Order · ${formatCurrency(grandTotal)}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Order Summary */}
        <aside className="summary-card">
          <h2>Order Totals</h2>
          <ul className="mini-order-list">
            {cart.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <span>{formatCurrency(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <div className="summary-lines">
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Shipping</span>
              <span>{shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}</span>
            </div>
            <div className="summary-line">
              <span>Estimated Tax (8%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="summary-line summary-line--total">
              <span>Grand Total</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

