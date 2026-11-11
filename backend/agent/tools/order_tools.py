from datetime import timedelta

from django.utils import timezone

from agent.models import PendingAction
from orders.serializers import OrderSerializer
from orders.services import (
    OrderServiceError,
    get_user_order_history,
    preview_checkout,
)


def tool_get_order_history(args, *, user, session):
    orders = list(get_user_order_history(user, limit=args.get('limit', 5)))
    serialized = OrderSerializer(orders, many=True).data
    compact_orders = [
        {
            'id': order['id'],
            'order_number': order['order_number'],
            'status': order['status'],
            'total_amount': str(order['total_amount']),
            'shipping_method': order['shipping_method'],
            'created_at': order['created_at'],
            'items': [
                {
                    'product_name': item['product']['name'],
                    'quantity': item['quantity'],
                    'unit_price': str(item['unit_price']),
                    'line_total': str(item['line_total']),
                }
                for item in order.get('items', [])
            ],
        }
        for order in serialized
    ]
    return {
        'llm_data': {'orders': compact_orders, 'count': len(compact_orders)},
        'cards': [{'type': 'order_list', 'orders': compact_orders}] if compact_orders else [],
        'effects': {},
    }


def tool_prepare_checkout(args, *, user, session):
    """Create a short-lived PendingAction confirmation gate instead of placing an order silently."""
    try:
        preview = preview_checkout(
            user,
            shipping_method=args.get('shipping_method', 'standard'),
            payment_method=args.get('payment_method', 'card'),
            shipping_address=args.get('shipping_address'),
            notes=args.get('notes', ''),
        )
    except OrderServiceError as exc:
        return {
            'llm_data': {'ready': False, 'error': exc.message},
            'cards': [],
            'effects': {},
        }

    # Cancel any stale unconfirmed checkout proposals in the same session to avoid double-submits.
    PendingAction.objects.filter(
        session=session,
        user=user,
        action_type='checkout',
        status='pending',
    ).update(status='cancelled')

    pending = PendingAction.objects.create(
        session=session,
        user=user,
        action_type='checkout',
        payload=preview,
        status='pending',
        expires_at=timezone.now() + timedelta(minutes=15),
    )

    confirm_card = {
        'type': 'action_confirm',
        'action_id': str(pending.id),
        'action_type': 'checkout',
        'status': pending.status,
        'expires_at': pending.expires_at.isoformat(),
        'summary': preview,
    }

    return {
        'llm_data': {
            'ready': True,
            'requires_user_confirmation': True,
            'action_id': str(pending.id),
            'summary': preview,
        },
        'cards': [confirm_card],
        'effects': {'pending_action_id': str(pending.id)},
    }
