import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAgent } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export function Navbar() {
  const navigate = useNavigate();
  const { openDrawer: openAgentDrawer } = useAgent();
  const { user, isAuthenticated, logout } = useAuth();
  const { cart, openDrawer } = useCart();
  const { pushToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  async function handleLogout() {
    await logout();
    pushToast('You have been signed out.', 'info');
    setMobileMenuOpen(false);
    navigate('/');
  }

  function handleQuickSearch(e) {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}&mode=hybrid` : '/shop');
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <div className="navbar__left">
          <button
            type="button"
            className="icon-btn navbar__mobile-toggle"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <span className="brand__name">
              Agentic<span>Shop</span>
            </span>
          </Link>

          <nav className="navbar__links" aria-label="Main navigation">
            <NavLink to="/" end className="nav-link">
              Home
            </NavLink>
            <NavLink to="/shop" className="nav-link">
              Shop All
            </NavLink>
            <NavLink to="/shop?category=audio" className="nav-link">
              Audio
            </NavLink>
            <NavLink to="/shop?category=workspace" className="nav-link">
              Workspace
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/orders" className="nav-link">
                Orders
              </NavLink>
            )}
          </nav>
        </div>

        <div className="navbar__right">
          {searchOpen ? (
            <form className="navbar__search-inline" onSubmit={handleQuickSearch}>
              <Search size={15} />
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search studio objects..."
                autoFocus
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSearchOpen(false)}
                aria-label="Close quick search"
              >
                <X size={15} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search size={19} />
            </button>
          )}

          {isAuthenticated ? (
            <div className="navbar__user">
              <Link to="/orders" className="navbar__user-pill" title="Order History">
                <UserIcon size={15} />
                <span>{user?.name || user?.email}</span>
              </Link>
              <button
                type="button"
                className="icon-btn"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="navbar__auth-links">
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
              <Link to="/signup" className="btn btn--primary btn--sm">
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            className="navbar__concierge-btn"
            onClick={openAgentDrawer}
            aria-label="Open Shopping Concierge"
          >
            <Sparkles size={15} />
            <span>Concierge</span>
          </button>

          <button
            type="button"
            className="cart-trigger"
            onClick={openDrawer}
            aria-label={`Open shopping cart with ${cart.item_count} items`}
          >
            <ShoppingBag size={19} />
            {cart.item_count > 0 && (
              <span className="cart-trigger__badge">{cart.item_count}</span>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="navbar__mobile-drawer">
          <form className="navbar__mobile-search" onSubmit={handleQuickSearch}>
            <Search size={16} />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search products or ask naturally..."
            />
          </form>
          <div className="navbar__mobile-links">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>
              Shop All
            </Link>
            <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
              Cart ({cart.item_count})
            </Link>
            <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
              <Package size={15} /> Order History
            </Link>
            {isAuthenticated ? (
              <button type="button" className="btn btn--secondary" onClick={handleLogout}>
                Sign out ({user?.email})
              </button>
            ) : (
              <div className="navbar__mobile-auth">
                <Link
                  to="/login"
                  className="btn btn--secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn btn--primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

