import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgentDrawer } from '../components/agent/AgentDrawer';
import { CartDrawer } from '../components/cart/CartDrawer';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { AgentProvider } from '../context/AgentContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ShopPage } from '../pages/ShopPage';
import { clearApiModeOverride, setApiMode, storeAuth } from '../api/client';
import { mockAdapter } from '../api/mockAdapter';
import { isSafeInternalRoute } from '../utils/navigationGuard';

function renderAppAt(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AgentProvider>
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
                  </Routes>
                </main>
                <Footer />
                <CartDrawer />
                <AgentDrawer />
              </div>
            </AgentProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Agentic Shop Frontend', () => {
  it('calls live backend endpoints when Django API responds with JSON', async () => {
    clearApiModeOverride();
    setApiMode('live', false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/products/')) {
        return new Response(
          JSON.stringify({
            count: 1,
            results: [
              {
                id: 99,
                name: 'Live Backend Acoustic Speaker',
                description: 'Served directly from Django REST Framework.',
                price: '199.00',
                category: { name: 'Audio', slug: 'audio' },
                stock: 6,
                is_trending: true,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404, headers: { 'content-type': 'text/html' } });
    });

    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByText('Live Backend Acoustic Speaker')).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('gracefully falls back to local preview catalog when backend routes are unmounted (404 HTML)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<h1>Not Found</h1>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      })
    );

    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByText('Featured Collections')).toBeInTheDocument();
      expect(screen.getByText('Trending Now')).toBeInTheDocument();
      expect(screen.getByText('Aether Studio ANC Headphones')).toBeInTheDocument();
    });
  });

  it('executes hybrid search with natural language price constraints', () => {
    const res = mockAdapter.listProducts({ q: 'headphones under $260' }, true);
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((p) => p.price <= 260)).toBe(true);
    expect(res.search_meta?.interpreted_filters).toContain('Max Price: $260');
  });

  it('supports adding from product detail, adjusting quantity in cart, and multi-step checkout', async () => {
    setApiMode('demo', true);
    renderAppAt('/products/1');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Aether Studio ANC Headphones' })
      ).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addBtn);

    const drawer = await waitFor(() =>
      screen.getByRole('dialog', { name: 'Shopping cart' })
    );
    expect(drawer).toBeInTheDocument();

    const checkoutLink = within(drawer).getByRole('link', { name: /Checkout/i });
    fireEvent.click(checkoutLink);

    await waitFor(() => {
      expect(screen.getByText('1. Shipping Address')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Alex Mercer'), { target: { value: 'Maya Lin' } });
    fireEvent.change(screen.getByPlaceholderText('alex@example.com'), {
      target: { value: 'maya@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('+1 (415) 555-0192'), {
      target: { value: '+1 415 555 0111' },
    });
    fireEvent.change(screen.getByPlaceholderText('742 Evergreen Terrace'), {
      target: { value: '100 Market St' },
    });
    fireEvent.change(screen.getByPlaceholderText('San Francisco'), {
      target: { value: 'San Francisco' },
    });
    fireEvent.change(screen.getByPlaceholderText('CA'), { target: { value: 'CA' } });
    fireEvent.change(screen.getByPlaceholderText('94107'), { target: { value: '94105' } });

    fireEvent.click(screen.getByRole('button', { name: /Continue to Delivery/i }));

    await waitFor(() => {
      expect(screen.getByText('2. Delivery & Payment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Order/i }));

    await waitFor(() => {
      expect(screen.getByText('3. Review & Confirm')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));

    await waitFor(() => {
      expect(screen.getByText('Thank you for your order')).toBeInTheDocument();
    });
  });

  it('validates login form and renders Continue with Google button', async () => {
    setApiMode('demo', true);
    renderAppAt('/login');

    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
    });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'demo@agenticshop.dev' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    });
  });

  it('filters catalog by category and price range on Shop page', async () => {
    setApiMode('demo', true);
    renderAppAt('/shop');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Shop Collection' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Home & Kitchen/i }));

    await waitFor(() => {
      expect(screen.getByText('Kuro Variable-Temp Kettle')).toBeInTheDocument();
      expect(screen.queryByText('Aether Studio ANC Headphones')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Under $100' }));

    await waitFor(() => {
      expect(screen.getByText('Terra Stoneware Coffee Set')).toBeInTheDocument();
      expect(screen.queryByText('Kuro Variable-Temp Kettle')).not.toBeInTheDocument();
    });
  });

  it('renders order history items', async () => {
    setApiMode('demo', true);
    renderAppAt('/orders');

    await waitFor(() => {
      expect(screen.getByText('ASE-2026-1042')).toBeInTheDocument();
      expect(screen.getByText('Kuro Variable-Temp Kettle')).toBeInTheDocument();
    });
  });

  it('opens Shopping Concierge, renders grounded cards, and omits technical jargon from UI', async () => {
    clearApiModeOverride();
    setApiMode('live', false);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const target = String(url);
      if (target.includes('/api/products/categories/')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (target.includes('/api/products/')) {
        return new Response(JSON.stringify({ count: 0, results: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (target.includes('/api/agent/chat/')) {
        return new Response(
          JSON.stringify({
            session_id: '11111111-1111-1111-1111-111111111111',
            blocked: false,
            block_reason: '',
            effects: {},
            message: {
              id: 2,
              role: 'assistant',
              content: 'Here is our top noise-cancelling headphone option under $260.',
              blocked: false,
              cards: [
                {
                  type: 'product_list',
                  items: [
                    {
                      id: 1,
                      name: 'Aether Studio ANC Headphones',
                      price: '249.00',
                      stock_quantity: 8,
                      image: '/images/products/headphones.svg',
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });

    renderAppAt('/');

    expect(screen.queryByText(/Backend Connection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DRF Ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RAG Search/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open Shopping Concierge/i }));
    const dialog = await waitFor(() =>
      screen.getByRole('dialog', { name: /Atelier Shopping Concierge/i })
    );

    const input = within(dialog).getByLabelText(/Message shopping concierge/i);
    fireEvent.change(input, { target: { value: 'headphones under $260' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(
        within(dialog).getByText('Here is our top noise-cancelling headphone option under $260.')
      ).toBeInTheDocument();
      expect(within(dialog).getByText('Aether Studio ANC Headphones')).toBeInTheDocument();
    });
  });

  it('requires explicit user approval on checkout confirmation cards in Shopping Concierge', async () => {
    clearApiModeOverride();
    setApiMode('live', false);
    storeAuth({
      token: 'tok-test',
      tokenScheme: 'Token',
      user: { id: 1, name: 'Ari Vance', email: 'ari@atelier.dev' },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const target = String(url);
      if (target.includes('/api/orders/cart/')) {
        return new Response(
          JSON.stringify({ items: [], subtotal: '0.00', item_count: 0 }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (target.includes('/api/agent/chat/')) {
        return new Response(
          JSON.stringify({
            session_id: '22222222-2222-2222-2222-222222222222',
            blocked: false,
            block_reason: '',
            effects: {},
            message: {
              id: 3,
              role: 'assistant',
              content: 'Please review your order details and confirm below.',
              blocked: false,
              cards: [
                {
                  type: 'action_confirm',
                  action_id: '33333333-3333-3333-3333-333333333333',
                  action_type: 'checkout',
                  status: 'pending',
                  summary: {
                    items: [
                      {
                        cart_item_id: 1,
                        product_id: 1,
                        product_name: 'Aether Studio ANC Headphones',
                        quantity: 1,
                        line_total: '249.00',
                      },
                    ],
                    subtotal: '249.00',
                    shipping_cost: '0.00',
                    tax: '19.92',
                    total_amount: '268.92',
                    shipping_method: 'standard',
                    missing_address_fields: ['address_line1'],
                    shipping_address: {
                      full_name: 'Ari Vance',
                      address_line1: '',
                      city: '',
                      postal_code: '',
                      country: 'United States',
                    },
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (target.includes('/api/agent/confirm/')) {
        return new Response(
          JSON.stringify({
            status: 'confirmed',
            action_id: '33333333-3333-3333-3333-333333333333',
            session_id: '22222222-2222-2222-2222-222222222222',
            order: { order_number: 'ASE-2026-1099', total_amount: '268.92' },
            effects: { cart_updated: true },
            message: {
              id: 4,
              role: 'assistant',
              content: 'Order ASE-2026-1099 is confirmed! Total charged: $268.92.',
              cards: [
                {
                  type: 'order_confirmation',
                  order: { id: 9, order_number: 'ASE-2026-1099', total_amount: '268.92' },
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    renderAppAt('/');

    fireEvent.click(screen.getByRole('button', { name: /Open Shopping Concierge/i }));
    const dialog = await waitFor(() =>
      screen.getByRole('dialog', { name: /Atelier Shopping Concierge/i })
    );

    fireEvent.change(within(dialog).getByLabelText(/Message shopping concierge/i), {
      target: { value: 'Check me out' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(within(dialog).getByText('Review & Place Order')).toBeInTheDocument();
    });

    fireEvent.change(within(dialog).getByPlaceholderText('Street Address *'), {
      target: { value: '742 Mercer St' },
    });
    fireEvent.change(within(dialog).getByPlaceholderText('City *'), {
      target: { value: 'San Francisco' },
    });
    fireEvent.change(within(dialog).getByPlaceholderText('Postal Code *'), {
      target: { value: '94107' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm & Place Order/i }));

    await waitFor(() => {
      expect(within(dialog).getByText('Order ASE-2026-1099 Confirmed')).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/agent/confirm/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('redirects to validated internal pages via concierge and blocks unsafe redirect URLs', async () => {
    expect(isSafeInternalRoute('/')).toBe(true);
    expect(isSafeInternalRoute('/shop?category=audio')).toBe(true);
    expect(isSafeInternalRoute('/products/2')).toBe(true);
    expect(isSafeInternalRoute('https://evil.com')).toBe(false);
    expect(isSafeInternalRoute('//evil.com')).toBe(false);
    expect(isSafeInternalRoute('javascript:alert(1)')).toBe(false);
    expect(isSafeInternalRoute('/admin')).toBe(false);

    clearApiModeOverride();
    setApiMode('live', false);
    let callNum = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const target = String(url);
      if (target.includes('/api/agent/chat/')) {
        callNum += 1;
        if (callNum === 1) {
          return new Response(
            JSON.stringify({
              session_id: '44444444-4444-4444-4444-444444444444',
              blocked: false,
              effects: {
                navigate_to: 'https://evil.com/phish',
                navigate_label: 'Evil',
              },
              message: {
                id: 10,
                role: 'assistant',
                content: 'Blocked external link test.',
                cards: [
                  {
                    type: 'navigation_link',
                    path: 'https://evil.com/phish',
                    label: 'Malicious Link',
                  },
                ],
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            session_id: '44444444-4444-4444-4444-444444444444',
            blocked: false,
            effects: {
              navigate_to: '/shop?category=audio',
              navigate_label: 'Shop · Audio',
            },
            message: {
              id: 11,
              role: 'assistant',
              content: 'Taking you to the Audio collection now.',
              cards: [
                {
                  type: 'navigation_link',
                  destination: 'shop',
                  path: '/shop?category=audio',
                  label: 'Shop · Audio',
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (target.includes('/api/products/categories/')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (target.includes('/api/products/')) {
        return new Response(JSON.stringify({ count: 0, results: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });

    renderAppAt('/');

    fireEvent.click(screen.getByRole('button', { name: /Open Shopping Concierge/i }));
    const dialog = await waitFor(() =>
      screen.getByRole('dialog', { name: /Atelier Shopping Concierge/i })
    );

    // Unsafe external URL in response must NOT render navigation card or close drawer
    fireEvent.change(within(dialog).getByLabelText(/Message shopping concierge/i), {
      target: { value: 'Try evil link' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(within(dialog).getByText('Blocked external link test.')).toBeInTheDocument();
    });
    expect(within(dialog).queryByText('Malicious Link')).not.toBeInTheDocument();

    // Valid internal path redirects SPA to ShopPage and closes drawer
    fireEvent.change(within(dialog).getByLabelText(/Message shopping concierge/i), {
      target: { value: 'Take me to the audio shop page' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Shop Collection' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog', { name: /Atelier Shopping Concierge/i })).not.toBeInTheDocument();
  });
});
