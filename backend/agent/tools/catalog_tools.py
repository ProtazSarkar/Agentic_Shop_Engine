from products.services import (
    get_active_product,
    hybrid_search_products,
    list_categories_with_counts,
)


def _serialize_product_summary(product):
    return {
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'category': product.category.name,
        'category_slug': product.category.slug,
        'price': str(product.price),
        'original_price': str(product.original_price) if product.original_price else None,
        'stock_quantity': product.stock_quantity,
        'in_stock': product.stock_quantity > 0,
        'rating': float(product.rating),
        'review_count': product.review_count,
        'badge': product.badge or '',
        'image': product.image or '',
        'description': product.description or '',
        'specs': product.specs or {},
    }


def tool_list_categories(args, *, user, session):
    categories = [
        {
            'id': cat.id,
            'name': cat.name,
            'slug': cat.slug,
            'description': cat.description,
            'product_count': getattr(cat, 'product_count', 0),
        }
        for cat in list_categories_with_counts()
    ]
    return {
        'llm_data': {'categories': categories, 'count': len(categories)},
        'cards': [],
        'effects': {},
    }


def tool_search_products(args, *, user, session):
    result = hybrid_search_products(
        query=args.get('query', ''),
        category=args.get('category'),
        min_price=args.get('min_price'),
        max_price=args.get('max_price'),
        in_stock=args.get('in_stock', False),
        sort=args.get('sort', 'featured'),
    )
    limit = args.get('limit', 6)
    matched = result['products'][:limit]
    serialized = [_serialize_product_summary(product) for product in matched]

    cards = [
        {
            'type': 'product_list',
            'items': serialized,
            'interpreted_filters': result['interpreted_filters'],
        }
    ] if serialized else []

    return {
        'llm_data': {
            'total_matches': len(result['products']),
            'returned': len(serialized),
            'interpreted_filters': result['interpreted_filters'],
            'products': serialized,
        },
        'cards': cards,
        'effects': {},
    }


def tool_get_product_detail(args, *, user, session):
    product = get_active_product(
        product_id=args.get('product_id'),
        slug=args.get('slug'),
    )
    if not product:
        return {
            'llm_data': {'found': False, 'error': 'Product not found or unavailable.'},
            'cards': [],
            'effects': {},
        }

    item = _serialize_product_summary(product)
    return {
        'llm_data': {'found': True, 'product': item},
        'cards': [{'type': 'product_list', 'items': [item], 'interpreted_filters': []}],
        'effects': {},
    }

