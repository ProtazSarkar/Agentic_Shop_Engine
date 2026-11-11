import json

RISK_LOW = 'LOW'
RISK_MEDIUM = 'MEDIUM'
RISK_HIGH = 'HIGH'

MAX_TOOL_CALLS_PER_TURN = 5

FORBIDDEN_SPOOF_KEYS = {'user', 'user_id', 'owner_id', 'account_id', 'is_staff', 'is_superuser'}

ALLOWED_SORT_KEYS = {'featured', 'price_asc', 'price_desc', 'rating', 'newest'}
ALLOWED_SHIPPING_METHODS = {'standard', 'express'}
ALLOWED_PAYMENT_METHODS = {'card', 'apple_pay', 'paypal'}


class ToolGuardError(Exception):
    """Raised when a requested tool invocation fails policy or schema verification."""

    def __init__(self, reason_code, safe_message):
        super().__init__(safe_message)
        self.reason_code = reason_code
        self.safe_message = safe_message


def _parse_int(value, field_name, *, minimum=1, maximum=1000000):
    if isinstance(value, bool) or value is None:
        raise ToolGuardError('invalid_argument', f'{field_name} must be a whole number.')
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ToolGuardError('invalid_argument', f'{field_name} must be a whole number.') from exc
    if parsed < minimum or parsed > maximum:
        raise ToolGuardError(
            'out_of_range',
            f'{field_name} must be between {minimum} and {maximum}.',
        )
    return parsed


def _parse_optional_float(value, field_name):
    if value is None or value == '':
        return None
    if isinstance(value, bool):
        raise ToolGuardError('invalid_argument', f'{field_name} must be numeric.')
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ToolGuardError('invalid_argument', f'{field_name} must be numeric.') from exc
    if parsed < 0 or parsed > 100000:
        raise ToolGuardError('out_of_range', f'{field_name} is out of valid range.')
    return parsed


def _parse_str(value, max_len=160):
    if value is None:
        return ''
    return str(value).strip()[:max_len]


def sanitize_audit_args(args):
    """Produce a bounded, safe JSON dict for ToolAuditLog storage."""
    if not isinstance(args, dict):
        return {}
    sanitized = {}
    for key, val in args.items():
        if str(key).lower() in {'password', 'token', 'secret', 'api_key', 'authorization'}:
            sanitized[str(key)] = '[REDACTED]'
        elif isinstance(val, dict):
            sanitized[str(key)] = {
                str(k): str(v)[:100] for k, v in list(val.items())[:12]
            }
        else:
            sanitized[str(key)] = str(val)[:200] if val is not None else None
    return sanitized


def validate_tool_invocation(tool_name, raw_args, *, user, tool_registry, call_index=0):
    """Enforce allowlist, per-turn loop cap, authentication, and strict argument validation."""
    if call_index >= MAX_TOOL_CALLS_PER_TURN:
        raise ToolGuardError(
            'loop_limit_exceeded',
            'Reached the maximum number of assistant actions for a single reply.',
        )

    spec = tool_registry.get(tool_name)
    if not spec:
        raise ToolGuardError('unknown_tool', 'Requested assistant action is not permitted.')

    if spec.auth_required and (not user or not user.is_authenticated):
        raise ToolGuardError(
            'auth_required',
            'Please sign in to your account so I can access your cart or orders.',
        )

    if raw_args is None or raw_args == '':
        args = {}
    elif isinstance(raw_args, str):
        try:
            args = json.loads(raw_args)
        except json.JSONDecodeError as exc:
            raise ToolGuardError('malformed_args', 'Invalid tool parameters received.') from exc
    elif isinstance(raw_args, dict):
        args = dict(raw_args)
    else:
        raise ToolGuardError('malformed_args', 'Invalid tool parameters received.')

    if not isinstance(args, dict):
        raise ToolGuardError('malformed_args', 'Tool parameters must be an object.')

    for key in list(args.keys()):
        if str(key).lower() in FORBIDDEN_SPOOF_KEYS:
            raise ToolGuardError(
                'identity_spoof_blocked',
                'Account ownership is locked to your signed-in session.',
            )

    cleaned = {}
    if tool_name == 'list_categories':
        cleaned = {}

    elif tool_name == 'search_products':
        cleaned = {
            'query': _parse_str(args.get('query'), max_len=200),
            'category': _parse_str(args.get('category'), max_len=80) or None,
            'min_price': _parse_optional_float(args.get('min_price'), 'min_price'),
            'max_price': _parse_optional_float(args.get('max_price'), 'max_price'),
            'in_stock': bool(args.get('in_stock', False)),
            'sort': args.get('sort') if args.get('sort') in ALLOWED_SORT_KEYS else 'featured',
            'limit': _parse_int(args.get('limit', 6), 'limit', minimum=1, maximum=12),
        }

    elif tool_name == 'get_product_detail':
        product_id = args.get('product_id')
        slug = _parse_str(args.get('slug'), max_len=160)
        if product_id is None and not slug:
            raise ToolGuardError('missing_argument', 'Provide product_id or slug.')
        cleaned = {
            'product_id': _parse_int(product_id, 'product_id', minimum=1, maximum=10_000_000)
            if product_id is not None
            else None,
            'slug': slug or None,
        }

    elif tool_name == 'get_cart':
        cleaned = {}

    elif tool_name == 'add_to_cart':
        cleaned = {
            'product_id': _parse_int(args.get('product_id'), 'product_id', minimum=1, maximum=10_000_000),
            'quantity': _parse_int(args.get('quantity', 1), 'quantity', minimum=1, maximum=20),
        }

    elif tool_name == 'remove_from_cart':
        cleaned = {
            'item_id': _parse_int(args.get('item_id'), 'item_id', minimum=1, maximum=10_000_000),
        }

    elif tool_name == 'get_order_history':
        cleaned = {
            'limit': _parse_int(args.get('limit', 5), 'limit', minimum=1, maximum=10),
        }

    elif tool_name == 'prepare_checkout':
        shipping_method = args.get('shipping_method', 'standard')
        if shipping_method not in ALLOWED_SHIPPING_METHODS:
            shipping_method = 'standard'
        payment_method = args.get('payment_method', 'card')
        if payment_method not in ALLOWED_PAYMENT_METHODS:
            payment_method = 'card'

        raw_addr = args.get('shipping_address')
        addr = {}
        if isinstance(raw_addr, dict):
            for field in (
                'full_name',
                'email',
                'phone',
                'address_line1',
                'address_line2',
                'city',
                'state',
                'postal_code',
                'country',
            ):
                if raw_addr.get(field):
                    addr[field] = _parse_str(raw_addr.get(field), max_len=160)

        cleaned = {
            'shipping_method': shipping_method,
            'payment_method': payment_method,
            'shipping_address': addr or None,
            'notes': _parse_str(args.get('notes'), max_len=300),
        }

    return spec, cleaned

