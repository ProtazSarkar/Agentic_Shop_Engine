import re
from decimal import Decimal, InvalidOperation

from django.db.models import Count, Q

from .models import Category, Product

SEMANTIC_SYNONYMS = {
    'audio': {'headphones', 'earbuds', 'speaker', 'music', 'sound', 'anc', 'noise', 'wireless', 'hifi', 'acoustic'},
    'workspace': {'desk', 'keyboard', 'lamp', 'monitor', 'riser', 'walnut', 'office', 'ergonomic', 'setup', 'typing', 'lighting'},
    'smart-home': {'purifier', 'air', 'clean', 'hepa', 'hub', 'clock', 'e-ink', 'smart', 'home', 'ambient', 'sensor', 'bedroom'},
    'carry': {'backpack', 'pack', 'bag', 'folio', 'leather', 'travel', 'commute', 'laptop', 'pouch', 'wallet', 'waterproof'},
    'kitchen': {'kettle', 'coffee', 'pour', 'tea', 'ceramic', 'stoneware', 'mug', 'carafe', 'brew', 'kitchen'},
}

STOP_WORDS = {'with', 'for', 'and', 'the', 'setup', 'a', 'an', 'of', 'in', 'to'}


def parse_decimal(value):
    """Parse a numeric string/number into a Decimal or return None."""
    if value is None or str(value).strip() == '':
        return None
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None


def apply_common_filters(queryset, *, category=None, min_price=None, max_price=None, in_stock=False):
    """Apply category, price band, and stock filters to a Product queryset."""
    if category and str(category).lower() != 'all':
        cat_value = str(category).strip()
        queryset = queryset.filter(
            Q(category__slug__iexact=cat_value) | Q(category__name__iexact=cat_value)
        )

    parsed_min = parse_decimal(min_price)
    if parsed_min is not None:
        queryset = queryset.filter(price__gte=parsed_min)

    parsed_max = parse_decimal(max_price)
    if parsed_max is not None:
        queryset = queryset.filter(price__lte=parsed_max)

    if str(in_stock).lower() in {'1', 'true', 'yes'} or in_stock is True:
        queryset = queryset.filter(stock_quantity__gt=0)

    return queryset


def apply_sort(items, sort_key):
    """Sort an in-memory sequence of Product instances."""
    if sort_key == 'price_asc':
        return sorted(items, key=lambda p: (p.price, p.id))
    if sort_key == 'price_desc':
        return sorted(items, key=lambda p: (-p.price, p.id))
    if sort_key == 'rating':
        return sorted(items, key=lambda p: (-p.rating, -p.review_count))
    if sort_key == 'newest':
        return sorted(items, key=lambda p: (-p.created_at.timestamp(), -p.id))
    return sorted(items, key=lambda p: (not p.is_featured, not p.is_trending, p.id))


def list_categories_with_counts():
    """Return categories that contain at least one active product."""
    return (
        Category.objects.annotate(
            product_count=Count('products', filter=Q(products__is_active=True))
        )
        .filter(product_count__gt=0)
        .order_by('name')
    )


def list_products(*, category=None, min_price=None, max_price=None, in_stock=False, search='', sort='featured'):
    """Query active products using structured filters and optional substring search."""
    queryset = Product.objects.filter(is_active=True).select_related('category')
    queryset = apply_common_filters(
        queryset,
        category=category,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
    )

    clean_search = (search or '').strip()
    if clean_search:
        queryset = queryset.filter(
            Q(name__icontains=clean_search)
            | Q(description__icontains=clean_search)
            | Q(category__name__icontains=clean_search)
            | Q(category__slug__icontains=clean_search)
        )

    ordering_map = {
        'price_asc': ('price', 'id'),
        'price_desc': ('-price', 'id'),
        'rating': ('-rating', '-review_count'),
        'newest': ('-created_at', '-id'),
        'featured': ('-is_featured', '-is_trending', 'id'),
    }
    return queryset.order_by(*ordering_map.get(sort, ('-is_featured', '-is_trending', 'id')))


def get_active_product(*, product_id=None, slug=None):
    """Fetch a single active product by ID or slug, or None if unavailable."""
    qs = Product.objects.filter(is_active=True).select_related('category')
    if product_id is not None:
        return qs.filter(id=product_id).first()
    if slug:
        return qs.filter(slug__iexact=str(slug).strip()).first()
    return None


def hybrid_search_products(
    *,
    query='',
    category=None,
    min_price=None,
    max_price=None,
    in_stock=False,
    sort='featured',
):
    """Run natural-language constraint parsing + semantic synonym scoring over active products."""
    raw_query = (query or '').strip()
    interpreted_filters = []
    cleaned_query = raw_query.lower()

    inferred_max = None
    inferred_min = None
    inferred_in_stock = False

    if raw_query:
        under_match = re.search(
            r'(?:under|below|less than|max|<)\s*\$?\s*(\d+(?:\.\d+)?)',
            cleaned_query,
            flags=re.IGNORECASE,
        )
        if under_match:
            inferred_max = parse_decimal(under_match.group(1))
            if inferred_max is not None:
                interpreted_filters.append(f'Max Price: ${inferred_max}')
            cleaned_query = cleaned_query.replace(under_match.group(0), ' ')

        over_match = re.search(
            r'(?:over|above|more than|min|>)\s*\$?\s*(\d+(?:\.\d+)?)',
            cleaned_query,
            flags=re.IGNORECASE,
        )
        if over_match:
            inferred_min = parse_decimal(over_match.group(1))
            if inferred_min is not None:
                interpreted_filters.append(f'Min Price: ${inferred_min}')
            cleaned_query = cleaned_query.replace(over_match.group(0), ' ')

        if re.search(r'\b(?:in stock|available)\b', cleaned_query, flags=re.IGNORECASE):
            inferred_in_stock = True
            interpreted_filters.append('In Stock Only')
            cleaned_query = re.sub(r'\b(?:in stock|available)\b', ' ', cleaned_query, flags=re.IGNORECASE)

    if category and str(category).lower() != 'all':
        interpreted_filters.append(f'Category: {category}')

    effective_min = parse_decimal(min_price)
    if effective_min is None:
        effective_min = inferred_min

    effective_max = parse_decimal(max_price)
    if effective_max is None:
        effective_max = inferred_max

    effective_in_stock = (
        str(in_stock).lower() in {'1', 'true', 'yes'} or in_stock is True or inferred_in_stock
    )

    queryset = Product.objects.filter(is_active=True).select_related('category')
    queryset = apply_common_filters(
        queryset,
        category=category,
        min_price=effective_min,
        max_price=effective_max,
        in_stock=effective_in_stock,
    )

    tokens = [
        re.sub(r'[^a-z0-9-]', '', token)
        for token in cleaned_query.split()
    ]
    tokens = [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]

    products = list(queryset)
    if tokens:
        scored = []
        for product in products:
            score = 0.0
            name_l = product.name.lower()
            desc_l = (product.description or '').lower()
            cat_l = f'{product.category.name} {product.category.slug}'.lower()
            tags_l = ' '.join(str(t).lower() for t in (product.tags or []))
            semantic_terms = SEMANTIC_SYNONYMS.get(product.category.slug, set())

            for token in tokens:
                if token in name_l:
                    score += 6.0
                if token in tags_l:
                    score += 4.0
                if token in cat_l:
                    score += 3.0
                if token in desc_l:
                    score += 2.0
                if any(token in sem or sem in token for sem in semantic_terms):
                    score += 2.5

            if score > 0:
                scored.append((score, product))

        scored.sort(key=lambda pair: (-pair[0], pair[1].id))
        products = [pair[1] for pair in scored]
        interpreted_filters.append(f'Semantic Match: "{" ".join(tokens)}"')

    sort_key = sort or 'featured'
    if sort_key != 'featured' or not tokens:
        products = apply_sort(products, sort_key)

    return {
        'products': products,
        'query': raw_query,
        'interpreted_filters': interpreted_filters,
    }

