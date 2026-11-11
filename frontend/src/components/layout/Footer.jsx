import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useAgent } from '../../context/AgentContext';

export function Footer() {
  const { openDrawer } = useAgent();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <div className="brand brand--light">
            <span className="brand__mark" aria-hidden="true">
              <Sparkles size={15} />
            </span>
            <span className="brand__name">
              Agentic<span>Shop</span>
            </span>
          </div>
          <p className="footer__tagline">
            Thoughtfully crafted everyday hardware, studio acoustics, and tactile home instruments—paired
            with personal concierge guidance.
          </p>
        </div>

        <div>
          <h4 className="footer__heading">Collections</h4>
          <ul className="footer__list">
            <li><Link to="/shop?category=audio">Audio &amp; Acoustics</Link></li>
            <li><Link to="/shop?category=workspace">Workspace Tools</Link></li>
            <li><Link to="/shop?category=smart-home">Smart Home</Link></li>
            <li><Link to="/shop?category=carry">Everyday Carry</Link></li>
            <li><Link to="/shop?category=kitchen">Home &amp; Kitchen</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer__heading">Account &amp; Orders</h4>
          <ul className="footer__list">
            <li><Link to="/cart">Shopping Bag</Link></li>
            <li><Link to="/checkout">Checkout</Link></li>
            <li><Link to="/orders">Order History</Link></li>
            <li><Link to="/login">Sign In</Link></li>
            <li><Link to="/signup">Create Account</Link></li>
          </ul>
        </div>

        <div className="footer__status-box">
          <h4 className="footer__heading">Client Care</h4>
          <ul className="footer__care-list">
            <li>
              <Truck size={14} />
              <span>Complimentary shipping over $150</span>
            </li>
            <li>
              <ShieldCheck size={14} />
              <span>2-year warranty &amp; 30-day returns</span>
            </li>
          </ul>
          <button
            type="button"
            className="btn btn--sm btn--secondary-dark"
            onClick={openDrawer}
          >
            <Sparkles size={13} />
            <span>Ask Concierge</span>
          </button>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} Agentic Shop</span>
        <span>Crafted for calm daily ritual</span>
      </div>
    </footer>
  );
}
