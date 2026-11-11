import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AgentDrawer } from './components/agent/AgentDrawer';
import { CartDrawer } from './components/cart/CartDrawer';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { AgentProvider, useAgent } from './context/AgentContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';
import { SignupPage } from './pages/SignupPage';

function ConciergeLauncher() {
  const { isOpen, openDrawer } = useAgent();
  if (isOpen) return null;

  return (
    <button
      type="button"
      className="concierge-fab"
      onClick={openDrawer}
      aria-label="Open Shopping Concierge"
    >
      <Sparkles size={17} />
      <span>Ask Concierge</span>
    </button>
  );
}

export function AppRoutes() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <AgentDrawer />
      <ConciergeLauncher />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AgentProvider>
              <AppRoutes />
            </AgentProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
