import { SEED_CATEGORIES } from '../data/catalogSeed';
import { apiRequest, withBackendFallback } from './client';
import { mockAdapter } from './mockAdapter';

export function normalizeProduct(raw = {}) {
  const categoryValue = raw.category;
  let categoryName = 'General';
  let categorySlug = 'general';

  if (typeof categoryValue === 'string') {
    categoryName = categoryValue;
    categorySlug = categoryValue.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  } else if (categoryValue && typeof categoryValue === 'object') {
    categoryName = String(categoryValue.name ?? categoryValue.title ?? 'General');
    categorySlug = String(
      categoryValue.slug ?? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );
  }
  if (typeof raw.category_slug === 'string') {
    categorySlug = raw.category_slug;
  }

  const price = Number(raw.price ?? 0);
  const originalPrice =
    raw.original_price !== undefined && raw.original_price !== null
      ? Number(raw.original_price)
      : undefined;
  const stockRaw = raw.stock ?? raw.stock_count ?? raw.inventory ?? raw.quantity_available ?? 0;

  return {
    id: raw.id ?? String(raw.slug ?? Math.random()),
    name: String(raw.name ?? raw.title ?? 'Untitled Product'),
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    description: String(raw.description ?? ''),
    price: Number.isNaN(price) ? 0 : price,
    original_price: originalPrice && !Number.isNaN(originalPrice) ? originalPrice : undefined,
    category: categoryName,
    category_slug: categorySlug,
    stock: Number(stockRaw) || 0,
    image: String(raw.image ?? raw.image_url ?? raw.thumbnail ?? '/images/products/fallback.svg'),
    gallery: Array.isArray(raw.gallery) ? raw.gallery.map(String) : undefined,
    rating: raw.rating !== undefined ? Number(raw.rating) : undefined,
    review_count: raw.review_count !== undefined ? Number(raw.review_count) : undefined,
    badge: typeof raw.badge === 'string' ? raw.badge : undefined,
    is_trending: Boolean(raw.is_trending),
    is_featured: Boolean(raw.is_featured),
    specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
  };
}

function buildQueryString(params) {
  const qs = new URLSearchParams();
  if (params.category && params.category !== 'all') qs.set('category', params.category);
  if (params.min_price !== undefined && params.min_price !== '') {
    qs.set('min_price', String(params.min_price));
  }
  if (params.max_price !== undefined && params.max_price !== '') {
    qs.set('max_price', String(params.max_price));
  }
  const keyword = params.q ?? params.search;
  if (keyword && keyword.trim()) {
    qs.set('search', keyword.trim());
    qs.set('q', keyword.trim());
  }
  if (params.sort && params.sort !== 'featured') qs.set('sort', params.sort);
  if (params.in_stock) qs.set('in_stock', 'true');
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizePaginatedProducts(raw, params, isHybrid) {
  const page = params.page || 1;
  const pageSize = params.page_size || 9;

  if (Array.isArray(raw)) {
    const results = raw.map((item) => normalizeProduct(item));
    return {
      results,
      count: results.length,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(results.length / pageSize)),
      search_meta: isHybrid ? { mode: 'hybrid', query: params.q ?? params.search } : undefined,
    };
  }

  const obj = raw || {};
  const list = Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(obj.items)
      ? obj.items
      : [];
  const results = list.map((item) => normalizeProduct(item));
  const count = typeof obj.count === 'number' ? obj.count : results.length;
  const totalPages =
    typeof obj.total_pages === 'number'
      ? obj.total_pages
      : Math.max(1, Math.ceil(count / pageSize));

  const resolvedSearchMeta =
    obj.search_meta && typeof obj.search_meta === 'object'
      ? obj.search_meta
      : isHybrid
        ? { mode: 'hybrid', query: params.q ?? params.search }
        : undefined;

  return {
    results,
    count,
    page: typeof obj.page === 'number' ? obj.page : page,
    page_size: typeof obj.page_size === 'number' ? obj.page_size : pageSize,
    total_pages: totalPages,
    next: typeof obj.next === 'string' ? obj.next : null,
    previous: typeof obj.previous === 'string' ? obj.previous : null,
    search_meta: resolvedSearchMeta,
  };
}

export const productsApi = {
  async list(params = {}) {
    const query = buildQueryString(params);
    return withBackendFallback(
      async () => {
        const raw = await apiRequest(`/api/products/${query}`);
        return normalizePaginatedProducts(raw, params, false);
      },
      () => mockAdapter.listProducts(params, false)
    );
  },

  async search(params = {}) {
    const query = buildQueryString(params);
    return withBackendFallback(
      async () => {
        const raw = await apiRequest(`/api/products/search/${query}`);
        return normalizePaginatedProducts(raw, params, true);
      },
      () => mockAdapter.listProducts(params, true)
    );
  },

  async getById(id) {
    return withBackendFallback(
      async () => {
        const raw = await apiRequest(`/api/products/${id}/`);
        return normalizeProduct(raw);
      },
      () => mockAdapter.getProductById(id)
    );
  },

  async getCategories() {
    try {
      const raw = await withBackendFallback(
        () => apiRequest('/api/products/categories/'),
        () => mockAdapter.getCategories()
      );
      if (Array.isArray(raw) && raw.length > 0) {
        return raw;
      }
    } catch {
      // Fallback to aggregating categories from products list
    }

    const response = await this.list({ page_size: 100 });
    const map = new Map();

    for (const seed of SEED_CATEGORIES) {
      map.set(seed.slug, { ...seed, product_count: 0 });
    }

    for (const product of response.results) {
      const existing = map.get(product.category_slug);
      if (existing) {
        existing.product_count = (existing.product_count || 0) + 1;
      } else {
        map.set(product.category_slug, {
          id: product.category_slug,
          name: product.category,
          slug: product.category_slug,
          product_count: 1,
        });
      }
    }

    return Array.from(map.values()).filter((c) => (c.product_count || 0) > 0);
  },
};

