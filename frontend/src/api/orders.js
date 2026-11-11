import { apiRequest, withBackendFallback } from './client';
import { mockAdapter } from './mockAdapter';
import { normalizeProduct } from './products';

function normalizeCart(raw) {
  const obj = raw || {};
  const rawItems = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(raw)
      ? raw
      : [];

  const items = rawItems.map((item) => {
    const rawProduct =
      item.product && typeof item.product === 'object'
        ? item.product
        : {
            id: item.product_id ?? item.product ?? item.id,
            name: item.product_name ?? item.name ?? 'Product',
            price: item.unit_price ?? item.price ?? 0,
            image: item.product_image ?? item.image,
            stock: item.stock ?? 99,
            category: item.category ?? 'Product',
          };

    const product = normalizeProduct(rawProduct);
    const quantity = Math.max(1, Number(item.quantity ?? 1));
    const unitPrice = Number(item.unit_price ?? item.price ?? product.price ?? 0);
    const lineTotal = Number(item.line_total ?? item.total_price ?? unitPrice * quantity);

    return {
      id: item.id ?? product.id,
      product,
      quantity,
      unit_price: unitPrice,
      line_total: Number(lineTotal.toFixed(2)),
    };
  });

  const computedSubtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const subtotal = Number(obj.subtotal ?? obj.total ?? computedSubtotal);
  const item_count =
    typeof obj.item_count === 'number'
      ? obj.item_count
      : items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    item_count,
  };
}

function normalizeOrder(raw = {}) {
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map((item, idx) => {
    const prodObj = item.product && typeof item.product === 'object' ? item.product : null;
    const qty = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unit_price ?? item.price ?? prodObj?.price ?? 0);
    return {
      id: item.id ?? idx,
      product_id: item.product_id ?? prodObj?.id ?? idx,
      product_name: String(item.product_name ?? prodObj?.name ?? item.name ?? 'Item'),
      product_image:
        typeof item.product_image === 'string'
          ? item.product_image
          : typeof prodObj?.image === 'string'
            ? prodObj.image
            : '/images/products/fallback.svg',
      quantity: qty,
      unit_price: unitPrice,
      line_total: Number(item.line_total ?? unitPrice * qty),
    };
  });

  const shippingAddr =
    raw.shipping_address && typeof raw.shipping_address === 'object' && Object.keys(raw.shipping_address).length > 0
      ? raw.shipping_address
      : null;

  const subtotal = Number(raw.subtotal ?? raw.total_amount ?? raw.total ?? 0);
  const shippingCost = Number(raw.shipping_cost ?? 0);
  const tax = Number(raw.tax ?? 0);
  const total = Number(raw.total ?? raw.total_amount ?? raw.grand_total ?? subtotal + shippingCost + tax);

  return {
    id: raw.id ?? Date.now(),
    order_number: raw.order_number || `ASE-${raw.id ?? 'NEW'}`,
    status: raw.status ?? 'confirmed',
    created_at: String(raw.created_at ?? new Date().toISOString()),
    subtotal,
    shipping_cost: shippingCost,
    tax,
    total,
    shipping_address: shippingAddr,
    shipping_method: typeof raw.shipping_method === 'string' ? raw.shipping_method : undefined,
    payment_method: typeof raw.payment_method === 'string' ? raw.payment_method : undefined,
    items,
  };
}

export const ordersApi = {
  async getCart() {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/orders/cart/');
        return normalizeCart(raw);
      },
      () => mockAdapter.getCart()
    );
  },

  async addToCart(productId, quantity = 1) {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/orders/cart/add/', {
          method: 'POST',
          body: JSON.stringify({
            product_id: productId,
            product: productId,
            quantity,
          }),
        });
        if (raw && typeof raw === 'object' && ('items' in raw || Array.isArray(raw))) {
          return normalizeCart(raw);
        }
        return this.getCart();
      },
      () => mockAdapter.addToCart(productId, quantity)
    );
  },

  async removeFromCart(itemId) {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest(`/api/orders/cart/remove/${itemId}/`, {
          method: 'DELETE',
        });
        if (raw && typeof raw === 'object' && ('items' in raw || Array.isArray(raw))) {
          return normalizeCart(raw);
        }
        return this.getCart();
      },
      () => mockAdapter.removeFromCart(itemId)
    );
  },

  async updateCartQuantity(itemId, productId, nextQuantity) {
    return withBackendFallback(
      async () => {
        await apiRequest(`/api/orders/cart/remove/${itemId}/`, {
          method: 'DELETE',
        });
        if (nextQuantity > 0) {
          await apiRequest('/api/orders/cart/add/', {
            method: 'POST',
            body: JSON.stringify({
              product_id: productId,
              product: productId,
              quantity: nextQuantity,
            }),
          });
        }
        return this.getCart();
      },
      () => mockAdapter.setCartItemQuantity(itemId, nextQuantity)
    );
  },

  async checkout(payload) {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/orders/checkout/', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            ...payload.shipping_address,
          }),
        });
        return normalizeOrder(raw?.order ?? raw);
      },
      () => mockAdapter.checkout(payload)
    );
  },

  async getHistory() {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/orders/history/');
        const list = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object' && Array.isArray(raw.results)
            ? raw.results
            : [];
        return list.map((entry) => normalizeOrder(entry));
      },
      () => mockAdapter.getOrderHistory()
    );
  },
};

