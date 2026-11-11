from orders.serializers import CartSerializer
from orders.services import (
    OrderServiceError,
    add_item_to_cart,
    get_or_create_cart,
    remove_item_from_cart,
)


def _cart_payload(cart):
    data = CartSerializer(cart).data
    return {
        'id': data['id'],
        'item_count': data['item_count'],
        'total_amount': str(data.get('total') or data.get('subtotal') or '0.00'),
        'items': [
            {
                'cart_item_id': item['id'],
                'product_id': item['product']['id'],
                'product_name': item['product']['name'],
                'quantity': item['quantity'],
                'unit_price': str(item['unit_price']),
                'line_total': str(item['line_total']),
                'image': item['product'].get('image', ''),
            }
            for item in data.get('items', [])
        ],
    }


def tool_get_cart(args, *, user, session):
    cart = get_or_create_cart(user)
    summary = _cart_payload(cart)
    return {
        'llm_data': summary,
        'cards': [{'type': 'cart_summary', 'cart': summary}],
        'effects': {},
    }


def tool_add_to_cart(args, *, user, session):
    try:
        cart = add_item_to_cart(
            user,
            args['product_id'],
            quantity=args.get('quantity', 1),
        )
    except OrderServiceError as exc:
        return {
            'llm_data': {'success': False, 'error': exc.message},
            'cards': [],
            'effects': {},
        }

    summary = _cart_payload(cart)
    return {
        'llm_data': {'success': True, 'cart': summary},
        'cards': [{'type': 'cart_summary', 'cart': summary}],
        'effects': {'cart_updated': True},
    }


def tool_remove_from_cart(args, *, user, session):
    try:
        cart = remove_item_from_cart(user, args['item_id'])
    except OrderServiceError as exc:
        return {
            'llm_data': {'success': False, 'error': exc.message},
            'cards': [],
            'effects': {},
        }

    summary = _cart_payload(cart)
    return {
        'llm_data': {'success': True, 'cart': summary},
        'cards': [{'type': 'cart_summary', 'cart': summary}],
        'effects': {'cart_updated': True},
    }
