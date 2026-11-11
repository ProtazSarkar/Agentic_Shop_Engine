from dataclasses import dataclass

from agent.guardrails.input_guard import wrap_untrusted_data
from agent.guardrails.tool_guard import (
    RISK_HIGH,
    RISK_LOW,
    RISK_MEDIUM,
    ToolGuardError,
    sanitize_audit_args,
    validate_tool_invocation,
)
from agent.models import ToolAuditLog
from .cart_tools import tool_add_to_cart, tool_get_cart, tool_remove_from_cart
from .catalog_tools import (
    tool_get_product_detail,
    tool_list_categories,
    tool_search_products,
)
from .navigation_tools import tool_navigate_to_page
from .order_tools import tool_get_order_history, tool_prepare_checkout


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict
    handler: callable
    risk_tier: str
    auth_required: bool
    xml_tag: str


TOOL_REGISTRY = {
    'list_categories': ToolSpec(
        name='list_categories',
        description='List all store product categories with active product counts.',
        parameters={'type': 'object', 'properties': {}, 'additionalProperties': False},
        handler=tool_list_categories,
        risk_tier=RISK_LOW,
        auth_required=False,
        xml_tag='store_categories',
    ),
    'search_products': ToolSpec(
        name='search_products',
        description=(
            'Search active store products using natural language keywords, optional category slug, '
            'price bounds, stock filter, and sorting.'
        ),
        parameters={
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'Search keywords or natural shopping intent.'},
                'category': {'type': 'string', 'description': 'Category slug or name, e.g. audio, workspace, carry, kitchen, smart-home.'},
                'min_price': {'type': 'number', 'description': 'Minimum price in USD.'},
                'max_price': {'type': 'number', 'description': 'Maximum price in USD.'},
                'in_stock': {'type': 'boolean', 'description': 'When true, return only in-stock items.'},
                'sort': {
                    'type': 'string',
                    'enum': ['featured', 'price_asc', 'price_desc', 'rating', 'newest'],
                },
                'limit': {'type': 'integer', 'description': 'Max items to return (1-12).'},
            },
            'additionalProperties': False,
        },
        handler=tool_search_products,
        risk_tier=RISK_LOW,
        auth_required=False,
        xml_tag='catalog_search_results',
    ),
    'get_product_detail': ToolSpec(
        name='get_product_detail',
        description='Fetch full details, stock level, rating, and specs for a single product by ID or slug.',
        parameters={
            'type': 'object',
            'properties': {
                'product_id': {'type': 'integer'},
                'slug': {'type': 'string'},
            },
            'additionalProperties': False,
        },
        handler=tool_get_product_detail,
        risk_tier=RISK_LOW,
        auth_required=False,
        xml_tag='product_detail',
    ),
    'get_cart': ToolSpec(
        name='get_cart',
        description="View items currently in the signed-in user's shopping bag and current subtotal.",
        parameters={'type': 'object', 'properties': {}, 'additionalProperties': False},
        handler=tool_get_cart,
        risk_tier=RISK_LOW,
        auth_required=True,
        xml_tag='shopping_cart',
    ),
    'add_to_cart': ToolSpec(
        name='add_to_cart',
        description="Add a product to the signed-in user's shopping bag after verifying stock.",
        parameters={
            'type': 'object',
            'properties': {
                'product_id': {'type': 'integer', 'description': 'Exact product ID from catalog search.'},
                'quantity': {'type': 'integer', 'description': 'Quantity to add (1-20).', 'default': 1},
            },
            'required': ['product_id'],
            'additionalProperties': False,
        },
        handler=tool_add_to_cart,
        risk_tier=RISK_MEDIUM,
        auth_required=True,
        xml_tag='shopping_cart_update',
    ),
    'remove_from_cart': ToolSpec(
        name='remove_from_cart',
        description="Remove an item line from the signed-in user's shopping bag by cart_item_id.",
        parameters={
            'type': 'object',
            'properties': {
                'item_id': {'type': 'integer', 'description': 'cart_item_id from get_cart.'},
            },
            'required': ['item_id'],
            'additionalProperties': False,
        },
        handler=tool_remove_from_cart,
        risk_tier=RISK_MEDIUM,
        auth_required=True,
        xml_tag='shopping_cart_update',
    ),
    'get_order_history': ToolSpec(
        name='get_order_history',
        description="Retrieve recent orders for the signed-in customer.",
        parameters={
            'type': 'object',
            'properties': {
                'limit': {'type': 'integer', 'description': 'Max recent orders to return (1-10).', 'default': 5},
            },
            'additionalProperties': False,
        },
        handler=tool_get_order_history,
        risk_tier=RISK_LOW,
        auth_required=True,
        xml_tag='order_history',
    ),
    'prepare_checkout': ToolSpec(
        name='prepare_checkout',
        description=(
            'Prepare an interactive order confirmation summary for the signed-in user before charging or placing an order. '
            'Always call this when the user asks to check out or buy their bag.'
        ),
        parameters={
            'type': 'object',
            'properties': {
                'shipping_method': {'type': 'string', 'enum': ['standard', 'express']},
                'payment_method': {'type': 'string', 'enum': ['card', 'apple_pay', 'paypal']},
                'shipping_address': {
                    'type': 'object',
                    'properties': {
                        'full_name': {'type': 'string'},
                        'email': {'type': 'string'},
                        'phone': {'type': 'string'},
                        'address_line1': {'type': 'string'},
                        'city': {'type': 'string'},
                        'state': {'type': 'string'},
                        'postal_code': {'type': 'string'},
                        'country': {'type': 'string'},
                    },
                },
                'notes': {'type': 'string'},
            },
            'additionalProperties': False,
        },
        handler=tool_prepare_checkout,
        risk_tier=RISK_HIGH,
        auth_required=True,
        xml_tag='checkout_confirmation_gate',
    ),
    'navigate_to_page': ToolSpec(
        name='navigate_to_page',
        description=(
            'Redirect the customer browser to an approved store page such as home, shop (with optional filters), '
            'product_detail, cart, checkout, orders, login, or signup. External URLs and admin routes are blocked.'
        ),
        parameters={
            'type': 'object',
            'properties': {
                'destination': {
                    'type': 'string',
                    'enum': ['home', 'shop', 'product_detail', 'cart', 'checkout', 'orders', 'login', 'signup'],
                    'description': 'Target storefront page.',
                },
                'product_id': {
                    'type': 'integer',
                    'description': 'Required when destination is product_detail (unless slug is provided).',
                },
                'slug': {
                    'type': 'string',
                    'description': 'Product slug when destination is product_detail.',
                },
                'category': {
                    'type': 'string',
                    'description': 'Optional category filter when destination is shop.',
                },
                'query': {
                    'type': 'string',
                    'description': 'Optional search query when destination is shop.',
                },
                'min_price': {'type': 'number'},
                'max_price': {'type': 'number'},
                'in_stock': {'type': 'boolean'},
                'sort': {
                    'type': 'string',
                    'enum': ['featured', 'price_asc', 'price_desc', 'rating', 'newest'],
                },
            },
            'required': ['destination'],
            'additionalProperties': False,
        },
        handler=tool_navigate_to_page,
        risk_tier=RISK_MEDIUM,
        auth_required=False,
        xml_tag='store_navigation',
    ),
}


def get_groq_tools_schema():
    """Return OpenAI/Groq-compatible function schemas for all registered tools."""
    return [
        {
            'type': 'function',
            'function': {
                'name': spec.name,
                'description': spec.description,
                'parameters': spec.parameters,
            },
        }
        for spec in TOOL_REGISTRY.values()
    ]


def dispatch_tool(tool_name, raw_args, *, user, session, call_index=0, navigation_count=0):
    """Validate, execute, audit-log, and XML-wrap a single assistant tool call."""
    import time

    start = time.monotonic()
    resolved_user = user if (user and user.is_authenticated) else None
    spec = TOOL_REGISTRY.get(tool_name)
    risk_tier = spec.risk_tier if spec else RISK_HIGH

    try:
        spec, cleaned_args = validate_tool_invocation(
            tool_name,
            raw_args,
            user=user,
            tool_registry=TOOL_REGISTRY,
            call_index=call_index,
            navigation_count=navigation_count,
        )
    except ToolGuardError as exc:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        ToolAuditLog.objects.create(
            session=session,
            user=resolved_user,
            tool_name=str(tool_name)[:80],
            risk_tier=risk_tier,
            arguments_sanitized=sanitize_audit_args(raw_args if isinstance(raw_args, dict) else {}),
            outcome='denied',
            reason=exc.reason_code[:240],
            latency_ms=elapsed_ms,
        )
        return {
            'tool_content': wrap_untrusted_data(
                'tool_error',
                {'denied': True, 'reason': exc.reason_code, 'message': exc.safe_message},
            ),
            'cards': [],
            'effects': {},
            'outcome': 'denied',
            'reason': exc.reason_code,
        }

    try:
        result = spec.handler(cleaned_args, user=user, session=session)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        ToolAuditLog.objects.create(
            session=session,
            user=resolved_user,
            tool_name=spec.name,
            risk_tier=spec.risk_tier,
            arguments_sanitized=sanitize_audit_args(cleaned_args),
            outcome='allowed',
            reason='ok',
            latency_ms=elapsed_ms,
        )
        return {
            'tool_content': wrap_untrusted_data(spec.xml_tag, result.get('llm_data', {})),
            'cards': result.get('cards', []),
            'effects': result.get('effects', {}),
            'outcome': 'allowed',
            'reason': 'ok',
        }
    except Exception as exc:  # pragma: no cover - defensive runtime isolation
        elapsed_ms = int((time.monotonic() - start) * 1000)
        ToolAuditLog.objects.create(
            session=session,
            user=resolved_user,
            tool_name=spec.name,
            risk_tier=spec.risk_tier,
            arguments_sanitized=sanitize_audit_args(cleaned_args),
            outcome='error',
            reason=str(exc)[:240],
            latency_ms=elapsed_ms,
        )
        return {
            'tool_content': wrap_untrusted_data(
                'tool_error',
                {'error': 'Unable to complete that action right now.'},
            ),
            'cards': [],
            'effects': {},
            'outcome': 'error',
            'reason': 'execution_error',
        }

