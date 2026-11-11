import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { productsApi } from '../api/products';
import { HybridSearchBar } from '../components/product/HybridSearchBar';
import { ProductCard } from '../components/product/ProductCard';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest Arrivals' },
];

const PRICE_PRESETS = [
  { label: 'Any Price', min: '', max: '' },
  { label: 'Under $100', min: '', max: '100' },
  { label: '$100 – $200', min: '100', max: '200' },
  { label: 'Over $200', min: '200', max: '' },
];

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ results: [], count: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get('category') || 'all';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'featured';
  const inStock = searchParams.get('in_stock') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);

  useEffect(() => {
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    productsApi.getCategories().then(setCategories).catch(() => { });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoading(true);
      setError('');
      try {
        const params = {
          category: category === 'all' ? undefined : category,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          q: query || undefined,
          sort,
          in_stock: inStock || undefined,
          page,
          page_size: 9,
        };
        const res = query
          ? await productsApi.search(params)
          : await productsApi.list(params);
        if (active) {
          setData(res);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load products.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      active = false;
    };
  }, [category, minPrice, maxPrice, query, sort, inStock, page]);

  function updateFilters(patch, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val === undefined || val === null || val === '' || val === 'all' || val === false) {
        next.delete(key);
      } else {
        next.set(key, String(val));
      }
    }
    if (resetPage) {
      next.delete('page');
    }
    setSearchParams(next);
  }

  function clearAllFilters() {
    setSearchParams({});
  }

  function applyPriceInputs(e) {
    e.preventDefault();
    updateFilters({ min_price: draftMin, max_price: draftMax });
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (category !== 'all') count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (inStock) count++;
    if (query) count++;
    return count;
  }, [category, minPrice, maxPrice, inStock, query]);

  return (
    <div className="container shop-page">
      <div className="shop-header">
        <div>
          <span className="section__kicker">Atelier Collection</span>
          <h1 className="page-title">Shop Collection</h1>
          <p className="page-subtitle">
            Filter by department and price, or describe what you need by mood, purpose, or budget.
          </p>
        </div>

        <HybridSearchBar
          value={query}
          onSearch={(q) => updateFilters({ q, mode: q ? 'hybrid' : '' })}
          showHints={false}
          compact
        />
      </div>

      {data.search_meta?.interpreted_filters && data.search_meta.interpreted_filters.length > 0 && (
        <div className="hybrid-interpretation">
          <Sparkles size={15} />
          <span>Refined by:</span>
          {data.search_meta.interpreted_filters.map((tag) => (
            <span key={tag} className="chip chip--ai">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="shop-toolbar">
        <div className="shop-toolbar__left">
          <button
            type="button"
            className="btn btn--secondary btn--sm filter-drawer-btn"
            onClick={() => setMobileFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal size={15} />
            <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
          </button>

          <span className="results-count">
            Showing <strong>{data.results.length}</strong> of <strong>{data.count}</strong>{' '}
            {data.count === 1 ? 'product' : 'products'}
          </span>

          {activeFilterCount > 0 && (
            <button type="button" className="btn-link" onClick={clearAllFilters}>
              <RotateCcw size={13} />
              <span>Reset all</span>
            </button>
          )}
        </div>

        <div className="shop-toolbar__right">
          <label htmlFor="sort-select" className="sort-label">
            Sort by
          </label>
          <select
            id="sort-select"
            className="select-input"
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value === 'featured' ? '' : e.target.value })}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-layout">
        {/* Sidebar */}
        <aside className={`filter-sidebar ${mobileFiltersOpen ? 'filter-sidebar--open' : ''}`}>
          <div className="filter-sidebar__mobile-head">
            <h3>Filters</h3>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>

          <div className="filter-group">
            <h3 className="filter-group__title">Category</h3>
            <ul className="filter-cat-list">
              <li>
                <button
                  type="button"
                  className={`filter-cat-btn ${category === 'all' ? 'is-active' : ''}`}
                  onClick={() => updateFilters({ category: '' })}
                >
                  <span>All Departments</span>
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <button
                    type="button"
                    className={`filter-cat-btn ${category === cat.slug ? 'is-active' : ''}`}
                    onClick={() => updateFilters({ category: cat.slug })}
                  >
                    <span>{cat.name}</span>
                    {cat.product_count !== undefined && (
                      <span className="filter-cat-count">{cat.product_count}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-group">
            <h3 className="filter-group__title">Price Range</h3>
            <div className="price-presets">
              {PRICE_PRESETS.map((preset) => {
                const isSelected = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`chip ${isSelected ? 'chip--active' : 'chip--interactive'}`}
                    onClick={() =>
                      updateFilters({ min_price: preset.min, max_price: preset.max })
                    }
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <form className="price-range-form" onSubmit={applyPriceInputs}>
              <div className="price-inputs">
                <label>
                  <span>Min ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={draftMin}
                    onChange={(e) => setDraftMin(e.target.value)}
                  />
                </label>
                <label>
                  <span>Max ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="500"
                    value={draftMax}
                    onChange={(e) => setDraftMax(e.target.value)}
                  />
                </label>
              </div>
              <button type="submit" className="btn btn--secondary btn--sm btn--full">
                Apply Range
              </button>
            </form>
          </div>

          <div className="filter-group">
            <h3 className="filter-group__title">Availability</h3>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => updateFilters({ in_stock: e.target.checked ? 'true' : '' })}
              />
              <span>In stock only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <section className="shop-results" aria-label="Product results">
          {error && (
            <div className="alert alert--danger">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="product-grid product-grid--3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton-card" />
              ))}
            </div>
          ) : data.results.length === 0 ? (
            <div className="empty-panel">
              <h3>No matching products found</h3>
              <p>
                Try broadening your price filter or adjusting your search query.
              </p>
              <button type="button" className="btn btn--primary" onClick={clearAllFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="product-grid product-grid--3">
                {data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {data.total_pages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={page <= 1}
                    onClick={() => updateFilters({ page: page - 1 }, false)}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <span className="pagination__status">
                    Page {data.page} of {data.total_pages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={page >= data.total_pages}
                    onClick={() => updateFilters({ page: page + 1 }, false)}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

