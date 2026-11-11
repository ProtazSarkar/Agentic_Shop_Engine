import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { ordersApi } from '../api/orders';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

const EMPTY_CART = { items: [], subtotal: 0, item_count: 0 };

export function CartProvider({ children }) {
  const { isAuthenticated, apiMode } = useAuth();
  const { pushToast } = useToast();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    if (apiMode === 'live' && !isAuthenticated) {
      setCart(EMPTY_CART);
      return;
    }
    setLoading(true);
    try {
      const next = await ordersApi.getCart();
      setCart(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCart(EMPTY_CART);
      }
    } finally {
      setLoading(false);
    }
  }, [apiMode, isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (product, quantity = 1, options = {}) => {
      const { openDrawerOnSuccess = true } = options;
      if (apiMode === 'live' && !isAuthenticated) {
        pushToast('Please sign in to save items to your cart.', 'info');
        return { requiresAuth: true };
      }
      setMutatingId(product.id);
      try {
        const next = await ordersApi.addToCart(product.id, quantity);
        setCart(next);
        pushToast(`Added ${product.name} to your cart.`, 'success');
        if (openDrawerOnSuccess) {
          setDrawerOpen(true);
        }
        return { ok: true, cart: next };
      } catch (err) {
        pushToast(err.message || 'Could not add item to cart.', 'error');
        return { ok: false, error: err };
      } finally {
        setMutatingId(null);
      }
    },
    [apiMode, isAuthenticated, pushToast]
  );

  const updateQuantity = useCallback(
    async (item, nextQuantity) => {
      setMutatingId(item.id);
      try {
        const next = await ordersApi.updateCartQuantity(item.id, item.product.id, nextQuantity);
        setCart(next);
      } catch (err) {
        pushToast(err.message || 'Could not update item quantity.', 'error');
      } finally {
        setMutatingId(null);
      }
    },
    [pushToast]
  );

  const removeItem = useCallback(
    async (item) => {
      setMutatingId(item.id);
      try {
        const next = await ordersApi.removeFromCart(item.id);
        setCart(next);
        pushToast(`Removed ${item.product.name} from cart.`, 'info');
      } catch (err) {
        pushToast(err.message || 'Could not remove item.', 'error');
      } finally {
        setMutatingId(null);
      }
    },
    [pushToast]
  );

  const checkout = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const order = await ordersApi.checkout(payload);
        setCart(EMPTY_CART);
        pushToast(`Order ${order.order_number} confirmed!`, 'success');
        return order;
      } catch (err) {
        pushToast(err.message || 'Checkout failed. Please review your details.', 'error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pushToast]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        mutatingId,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        toggleDrawer: () => setDrawerOpen((prev) => !prev),
        refreshCart,
        addItem,
        updateQuantity,
        removeItem,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}

