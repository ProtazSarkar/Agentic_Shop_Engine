import { SEED_CATEGORIES, SEED_PRODUCTS } from '../data/catalogSeed';
import { ApiError } from './client';

const MOCK_USERS_KEY = 'ase_mock_users';
const MOCK_CART_KEY = 'ase_mock_cart_items';
const MOCK_ORDERS_KEY = 'ase_mock_orders';
const MOCK_STOCK_KEY = 'ase_mock_stock_overrides';

const DEFAULT_DEMO_USER = {
  id: 'usr_demo_1',
  email: 'demo@agenticshop.dev',
  password: 'Password123!',
  name: 'Alex Mercer',
  provider: 'email',
};

const SEMANTIC_MAP = {
  audio: ['headphones', 'earbuds', 'speaker', 'music', 'sound', 'anc', 'noise', 'wireless', 'hifi', 'acoustic'],
  workspace: ['desk', 'keyboard', 'lamp', 'monitor', 'riser', 'walnut', 'office', 'ergonomic', 'setup', 'typing', 'lighting'],
  'smart-home': ['purifier', 'air', 'clean', 'hepa', 'hub', 'clock', 'e-ink', 'smart', 'home', 'ambient', 'sensor', 'bedroom'],
  carry: ['backpack', 'pack', 'bag', 'folio', 'leather', 'travel', 'commute', 'laptop', 'pouch', 'wallet', 'waterproof'],
  kitchen: ['kettle', 'coffee', 'pour', 'tea', 'ceramic', 'stoneware', 'mug', 'carafe', 'brew', 'kitchen'],
};

function readStockOverrides() {
  try {
    const raw = localStorage.getItem(MOCK_STOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStockOverrides(overrides) {
  localStorage.setItem(MOCK_STOCK_KEY, JSON.stringify(overrides));
}

function getCatalogWithStock() {
  const overrides = readStockOverrides();
  return SEED_PRODUCTS.map((product) => {
    const override = overrides[String(product.id)];
    return override !== undefined ? { ...product, stock: override } : product;
  });
}

function readMockUsers() {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!parsed.some((u) => u.email === DEFAULT_DEMO_USER.email)) {
      return [DEFAULT_DEMO_USER, ...parsed];
    }
    return parsed;
  } catch {
    return [DEFAULT_DEMO_USER];
  }
}

function writeMockUsers(users) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function readCartEntries() {
  try {
    const raw = localStorage.getItem(MOCK_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCartEntries(entries) {
  localStorage.setItem(MOCK_CART_KEY, JSON.stringify(entries));
}

function buildCartSnapshot() {
  const catalog = getCatalogWithStock();
  const entries = readCartEntries();
  const items = [];

  for (const entry of entries) {
    const product = catalog.find((p) => String(p.id) === String(entry.productId));
    if (!product) continue;
    const qty = Math.max(1, Math.min(entry.quantity, Math.max(1, product.stock || entry.quantity)));
    const unitPrice = Number(product.price);
    items.push({
      id: entry.id,
      product,
      quantity: qty,
      unit_price: unitPrice,
      line_total: Number((unitPrice * qty).toFixed(2)),
    });
  }

  const subtotal = Number(items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2));
  const item_count = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, item_count };
}

function readMockOrders() {
  try {
    const raw = localStorage.getItem(MOCK_ORDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return [
      {
        id: 'ord_seed_1042',
        order_number: 'ASE-2026-1042',
        status: 'delivered',
        created_at: '2026-10-28T14:22:00Z',
        subtotal: 384.0,
        shipping_cost: 0,
        tax: 30.72,
        total: 414.72,
        shipping_method: 'standard',
        payment_method: 'card',
        shipping_address: {
          full_name: 'Alex Mercer',
          email: 'demo@agenticshop.dev',
          phone: '+1 (415) 555-0192',
          address_line1: '742 Evergreen Terrace, Suite 4B',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94107',
          country: 'United States',
        },
        items: [
          {
            id: 'oi_1',
            product_id: 1,
            product_name: 'Aether Studio ANC Headphones',
            product_image: '/images/products/headphones.svg',
            quantity: 1,
            unit_price: 249.0,
            line_total: 249.0,
          },
          {
            id: 'oi_2',
            product_id: 3,
            product_name: 'Kuro Variable-Temp Kettle',
            product_image: '/images/products/kettle.svg',
            quantity: 1,
            unit_price: 135.0,
            line_total: 135.0,
          },
        ],
      },
    ];
  } catch {
    return [];
  }
}

function writeMockOrders(orders) {
  localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
}

function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    provider: u.provider,
  };
}

export const mockAdapter = {
  async login(email, password) {
    const normalized = email.trim().toLowerCase();
    const users = readMockUsers();
    const found = users.find((u) => u.email.toLowerCase() === normalized);
    if (!found || found.password !== password) {
      throw new ApiError('Invalid email or password.', 401);
    }
    return {
      token: `demo_jwt_${found.id}_${Date.now()}`,
      tokenScheme: 'Bearer',
      user: toPublicUser(found),
    };
  },

  async register(email, password, name) {
    const normalized = email.trim().toLowerCase();
    const users = readMockUsers();
    if (users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new ApiError('An account with this email already exists.', 400);
    }
    const newUser = {
      id: `usr_${Date.now()}`,
      email: normalized,
      password,
      name: name?.trim() || normalized.split('@')[0],
      provider: 'email',
    };
    writeMockUsers([...users, newUser]);
    return {
      token: `demo_jwt_${newUser.id}_${Date.now()}`,
      tokenScheme: 'Bearer',
      user: toPublicUser(newUser),
    };
  },

  async googleLogin(email, name) {
    const targetEmail = (email || 'google.shopper@gmail.com').trim().toLowerCase();
    const users = readMockUsers();
    let found = users.find((u) => u.email.toLowerCase() === targetEmail);
    if (!found) {
      found = {
        id: `usr_google_${Date.now()}`,
        email: targetEmail,
        password: '',
        name: name?.trim() || 'Google Shopper',
        provider: 'google',
      };
      writeMockUsers([...users, found]);
    }
    return {
      token: `demo_google_jwt_${found.id}_${Date.now()}`,
      tokenScheme: 'Bearer',
      user: toPublicUser(found),
    };
  },

  async logout() {
    return;
  },

  getCategories() {
    const catalog = getCatalogWithStock();
    return SEED_CATEGORIES.map((cat) => ({
      ...cat,
      product_count: catalog.filter((p) => p.category_slug === cat.slug).length,
    }));
  },

  listProducts(params = {}, isHybridSearch = false) {
    let items = [...getCatalogWithStock()];
    const rawQuery = (params.q ?? params.search ?? '').trim();
    const interpretedFilters = [];

    let inferredMaxPrice = null;
    let inferredMinPrice = null;
    let inferredInStock = Boolean(params.in_stock);
    let cleanedTerms = rawQuery.toLowerCase();

    if (isHybridSearch && rawQuery) {
      const underMatch = cleanedTerms.match(/(?:under|below|less than|max|<)\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (underMatch) {
        inferredMaxPrice = Number(underMatch[1]);
        interpretedFilters.push(`Max Price: $${inferredMaxPrice}`);
        cleanedTerms = cleanedTerms.replace(underMatch[0], ' ');
      }
      const overMatch = cleanedTerms.match(/(?:over|above|more than|min|>)\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (overMatch) {
        inferredMinPrice = Number(overMatch[1]);
        interpretedFilters.push(`Min Price: $${inferredMinPrice}`);
        cleanedTerms = cleanedTerms.replace(overMatch[0], ' ');
      }
      if (/\b(?:in stock|available)\b/i.test(cleanedTerms)) {
        inferredInStock = true;
        interpretedFilters.push('In Stock Only');
        cleanedTerms = cleanedTerms.replace(/\b(?:in stock|available)\b/gi, ' ');
      }
    }

    if (params.category && params.category !== 'all') {
      const cat = params.category.toLowerCase();
      items = items.filter(
        (p) => p.category_slug.toLowerCase() === cat || p.category.toLowerCase() === cat
      );
      interpretedFilters.push(`Category: ${params.category}`);
    }

    const effectiveMin =
      params.min_price !== undefined && params.min_price !== ''
        ? Number(params.min_price)
        : inferredMinPrice;
    const effectiveMax =
      params.max_price !== undefined && params.max_price !== ''
        ? Number(params.max_price)
        : inferredMaxPrice;

    if (effectiveMin !== null && !Number.isNaN(effectiveMin)) {
      items = items.filter((p) => p.price >= effectiveMin);
    }
    if (effectiveMax !== null && !Number.isNaN(effectiveMax)) {
      items = items.filter((p) => p.price <= effectiveMax);
    }
    if (inferredInStock) {
      items = items.filter((p) => p.stock > 0);
    }

    const tokens = cleanedTerms
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9-]/gi, ''))
      .filter((t) => t.length > 1 && !['with', 'for', 'and', 'the', 'setup'].includes(t));

    if (tokens.length > 0) {
      const scored = items
        .map((product) => {
          let score = 0;
          const haystackName = product.name.toLowerCase();
          const haystackDesc = product.description.toLowerCase();
          const haystackCat = `${product.category} ${product.category_slug}`.toLowerCase();
          const haystackTags = (product.tags || []).join(' ').toLowerCase();
          const semanticTerms = SEMANTIC_MAP[product.category_slug] || [];

          for (const token of tokens) {
            if (haystackName.includes(token)) score += 6;
            if (haystackTags.includes(token)) score += 4;
            if (haystackCat.includes(token)) score += 3;
            if (haystackDesc.includes(token)) score += 2;
            if (isHybridSearch && semanticTerms.some((s) => s.includes(token) || token.includes(s))) {
              score += 2.5;
            }
          }
          return { product, score };
        })
        .filter((entry) => entry.score > 0);

      scored.sort((a, b) => b.score - a.score);
      items = scored.map((entry) => entry.product);
      if (isHybridSearch) {
        interpretedFilters.push(`Semantic Match: "${tokens.join(' ')}"`);
      }
    }

    switch (params.sort) {
      case 'price_asc':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        items.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        if (tokens.length === 0) {
          items.sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)));
        }
        break;
    }

    const page = Math.max(1, params.page || 1);
    const page_size = Math.max(1, params.page_size || 9);
    const count = items.length;
    const total_pages = Math.max(1, Math.ceil(count / page_size));
    const safePage = Math.min(page, total_pages);
    const start = (safePage - 1) * page_size;
    const results = items.slice(start, start + page_size);

    return {
      results,
      count,
      page: safePage,
      page_size,
      total_pages,
      next: safePage < total_pages ? `?page=${safePage + 1}` : null,
      previous: safePage > 1 ? `?page=${safePage - 1}` : null,
      search_meta: isHybridSearch
        ? {
            mode: 'hybrid',
            interpreted_filters: interpretedFilters,
            query: rawQuery,
          }
        : undefined,
    };
  },

  getProductById(id) {
    const product = getCatalogWithStock().find(
      (p) => String(p.id) === String(id) || p.slug === String(id)
    );
    if (!product) {
      throw new ApiError('Product not found.', 404);
    }
    return product;
  },

  getCart() {
    return buildCartSnapshot();
  },

  addToCart(productId, quantity = 1) {
    const product = this.getProductById(productId);
    if (product.stock <= 0) {
      throw new ApiError('This product is currently out of stock.', 400);
    }
    const entries = readCartEntries();
    const existing = entries.find((e) => String(e.productId) === String(product.id));
    if (existing) {
      const nextQty = existing.quantity + quantity;
      if (nextQty > product.stock) {
        throw new ApiError(`Only ${product.stock} unit(s) available in stock.`, 400);
      }
      existing.quantity = nextQty;
    } else {
      if (quantity > product.stock) {
        throw new ApiError(`Only ${product.stock} unit(s) available in stock.`, 400);
      }
      entries.push({
        id: `ci_${product.id}_${Date.now()}`,
        productId: product.id,
        quantity: Math.max(1, quantity),
      });
    }
    writeCartEntries(entries);
    return buildCartSnapshot();
  },

  setCartItemQuantity(itemId, quantity) {
    const entries = readCartEntries();
    const target = entries.find((e) => String(e.id) === String(itemId));
    if (!target) {
      throw new ApiError('Cart item not found.', 404);
    }
    if (quantity <= 0) {
      writeCartEntries(entries.filter((e) => String(e.id) !== String(itemId)));
      return buildCartSnapshot();
    }
    const product = this.getProductById(target.productId);
    if (quantity > product.stock) {
      throw new ApiError(`Only ${product.stock} unit(s) available in stock.`, 400);
    }
    target.quantity = quantity;
    writeCartEntries(entries);
    return buildCartSnapshot();
  },

  removeFromCart(itemId) {
    const entries = readCartEntries();
    const filtered = entries.filter((e) => String(e.id) !== String(itemId));
    writeCartEntries(filtered);
    return buildCartSnapshot();
  },

  checkout(payload) {
    const cart = buildCartSnapshot();
    if (cart.items.length === 0) {
      throw new ApiError('Your shopping cart is empty.', 400);
    }

    const overrides = readStockOverrides();
    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        throw new ApiError(
          `Insufficient stock for ${item.product.name} (${item.product.stock} left).`,
          400
        );
      }
    }

    for (const item of cart.items) {
      overrides[String(item.product.id)] = Math.max(0, item.product.stock - item.quantity);
    }
    writeStockOverrides(overrides);

    const shippingCost =
      payload.shipping_method === 'express' ? 18.0 : cart.subtotal >= 150 ? 0 : 12.0;
    const tax = Number((cart.subtotal * 0.08).toFixed(2));
    const total = Number((cart.subtotal + shippingCost + tax).toFixed(2));

    const orderNumber = `ASE-${new Date().getFullYear()}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`;

    const order = {
      id: `ord_${Date.now()}`,
      order_number: orderNumber,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      subtotal: cart.subtotal,
      shipping_cost: shippingCost,
      tax,
      total,
      shipping_address: payload.shipping_address,
      shipping_method: payload.shipping_method,
      payment_method: payload.payment_method,
      items: cart.items.map((ci) => ({
        id: `oi_${ci.id}`,
        product_id: ci.product.id,
        product_name: ci.product.name,
        product_image: ci.product.image,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
      })),
    };

    const history = readMockOrders();
    writeMockOrders([order, ...history]);
    writeCartEntries([]);
    return order;
  },

  getOrderHistory() {
    return readMockOrders();
  },
};

