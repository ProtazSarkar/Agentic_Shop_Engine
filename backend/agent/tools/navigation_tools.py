from urllib.parse import urlencode

from agent.guardrails.tool_guard import (
    ALLOWED_NAV_DESTINATIONS,
    is_safe_internal_path,
)
from products.services import get_active_product, list_categories_with_counts


STATIC_DESTINATION_MAP = {
    'home': ('/', 'Home'),
    'cart': ('/cart', 'Shopping Bag'),
    'checkout': ('/checkout', 'Checkout'),
    'orders': ('/orders', 'Order History'),
    'login': ('/login', 'Sign In'),
    'signup': ('/signup', 'Create Account'),
}


def tool_navigate_to_page(args, *, user, session):
    """Build a strictly allowlisted internal SPA route and return a grounded navigation card."""
    destination = args['destination']
    if destination not in ALLOWED_NAV_DESTINATIONS:
        return {
            'llm_data': {'navigated': False, 'error': 'Requested page destination is not permitted.'},
            'cards': [],
            'effects': {},
        }

    if destination in STATIC_DESTINATION_MAP:
        safe_path, label = STATIC_DESTINATION_MAP[destination]
    elif destination == 'product_detail':
        product = get_active_product(
            product_id=args.get('product_id'),
            slug=args.get('slug'),
        )
        if not product:
            return {
                'llm_data': {'navigated': False, 'error': 'Product not found or no longer available.'},
                'cards': [],
                'effects': {},
            }
        safe_path = f'/products/{product.id}'
        label = product.name
    elif destination == 'shop':
        params = {}
        category = args.get('category')
        if category and category.lower() != 'all':
            # Prefer canonical active category slug when matched, else validated lowercase slug
            matched_slug = None
            for cat in list_categories_with_counts():
                if cat.slug.lower() == category.lower() or cat.name.lower() == category.lower():
                    matched_slug = cat.slug
                    break
            params['category'] = matched_slug or category.lower()

        if args.get('query'):
            params['q'] = args['query']
            params['mode'] = 'hybrid'
        if args.get('min_price') is not None:
            params['min_price'] = str(args['min_price'])
        if args.get('max_price') is not None:
            params['max_price'] = str(args['max_price'])
        if args.get('in_stock'):
            params['in_stock'] = 'true'
        if args.get('sort') and args['sort'] != 'featured':
            params['sort'] = args['sort']

        query_str = urlencode(params)
        safe_path = f'/shop?{query_str}' if query_str else '/shop'
        label = f"Shop · {params['category'].replace('-', ' ').title()}" if 'category' in params else 'Shop Collection'
    else:
        return {
            'llm_data': {'navigated': False, 'error': 'Unsupported page destination.'},
            'cards': [],
            'effects': {},
        }

    if not is_safe_internal_path(safe_path):
        return {
            'llm_data': {'navigated': False, 'error': 'Blocked unsafe navigation path.'},
            'cards': [],
            'effects': {},
        }

    return {
        'llm_data': {
            'navigated': True,
            'destination': destination,
            'path': safe_path,
            'label': label,
        },
        'cards': [
            {
                'type': 'navigation_link',
                'destination': destination,
                'path': safe_path,
                'label': label,
            }
        ],
        'effects': {
            'navigate_to': safe_path,
            'navigate_label': label,
        },
    }

