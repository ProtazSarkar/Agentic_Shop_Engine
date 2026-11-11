export interface User {
  id: string | number;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  provider?: 'email' | 'google';
}

export interface AuthResponse {
  token: string;
  tokenScheme: 'Bearer' | 'Token';
  refreshToken?: string;
  user: User;
}

export interface Category {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  product_count?: number;
}

export interface Product {
  id: string | number;
  name: string;
  slug?: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  category_slug: string;
  stock: number;
  image: string;
  gallery?: string[];
  rating?: number;
  review_count?: number;
  badge?: string;
  is_trending?: boolean;
  is_featured?: boolean;
  specs?: Record<string, string>;
  tags?: string[];
}

export interface ProductQueryParams {
  category?: string;
  min_price?: number | string;
  max_price?: number | string;
  search?: string;
  q?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  in_stock?: boolean;
  page?: number;
  page_size?: number;
}

export interface PaginatedProductsResponse {
  results: Product[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next?: string | null;
  previous?: string | null;
  search_meta?: {
    mode: 'hybrid' | 'catalog';
    interpreted_filters?: string[];
    query?: string;
  };
}

export interface CartItem {
  id: string | number;
  product: Product;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export interface ShippingAddress {
  full_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CheckoutPayload {
  shipping_address: ShippingAddress;
  shipping_method: 'standard' | 'express';
  payment_method: 'card' | 'cod' | 'wallet';
  notes?: string;
}

export interface OrderItem {
  id: string | number;
  product_id: string | number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string | number;
  order_number: string;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  shipping_address: ShippingAddress;
  shipping_method?: string;
  payment_method?: string;
  items: OrderItem[];
}

export type ApiConnectionMode = 'live' | 'demo';
