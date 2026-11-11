from datetime import datetime
from decimal import Decimal

from django.db import transaction
from rest_framework import status

from products.models import Product
from .models import Cart, CartItem, Order, OrderItem


class OrderServiceError(Exception):
    """Domain error carrying an HTTP status code and safe customer message."""

    def __init__(self, message, status_code=status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _calculate_shipping(subtotal, shipping_method):
    if shipping_method == 'express':
        return Decimal('18.00')
    if subtotal >= Decimal('150.00'):
        return Decimal('0.00')
    return Decimal('12.00')


def _normalize_shipping_address(user, shipping_address=None, raw_data=None):
    if isinstance(shipping_address, dict) and shipping_address:
        base = dict(shipping_address)
    else:
        data = raw_data or {}
        base = {
            'full_name': data.get('full_name', user.get_full_name() or user.email),
            'email': data.get('email', user.email),
            'phone': data.get('phone', ''),
            'address_line1': data.get('address_line1') or data.get('address', ''),
            'address_line2': data.get('address_line2', ''),
            'city': data.get('city', ''),
            'state': data.get('state', ''),
            'postal_code': data.get('postal_code', ''),
            'country': data.get('country', ''),
        }

    return {
        'full_name': str(base.get('full_name') or user.get_full_name() or user.email).strip()[:120],
        'email': str(base.get('email') or user.email).strip()[:120],
        'phone': str(base.get('phone') or '').strip()[:40],
        'address_line1': str(base.get('address_line1') or base.get('address') or '').strip()[:200],
        'address_line2': str(base.get('address_line2') or '').strip()[:200],
        'city': str(base.get('city') or '').strip()[:80],
        'state': str(base.get('state') or '').strip()[:80],
        'postal_code': str(base.get('postal_code') or '').strip()[:30],
        'country': str(base.get('country') or '').strip()[:80],
    }


def get_or_create_cart(user):
    """Fetch or create a shopping cart scoped to the given user."""
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def add_item_to_cart(user, product_id, quantity=1):
    """Validate stock and add or increment a product inside the user's cart."""
    try:
        qty = int(quantity)
    except (TypeError, ValueError) as exc:
        raise OrderServiceError('quantity must be a valid integer.') from exc

    if not product_id:
        raise OrderServiceError('product_id is required.')
    if qty <= 0 or qty > 50:
        raise OrderServiceError('quantity must be between 1 and 50.')

    product = Product.objects.filter(id=product_id, is_active=True).first()
    if not product:
        raise OrderServiceError('Product not found.', status_code=status.HTTP_404_NOT_FOUND)

    cart = get_or_create_cart(user)
    existing = CartItem.objects.filter(cart=cart, product=product).first()
    desired_quantity = (existing.quantity + qty) if existing else qty

    if product.stock_quantity < desired_quantity:
        raise OrderServiceError(f'Only {product.stock_quantity} unit(s) available in stock.')

    if existing:
        existing.quantity = desired_quantity
        existing.unit_price = product.price
        existing.save(update_fields=['quantity', 'unit_price'])
    else:
        CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=qty,
            unit_price=product.price,
        )

    return cart


def remove_item_from_cart(user, item_id):
    """Remove a CartItem belonging exclusively to the user's cart."""
    cart = Cart.objects.filter(user=user).first()
    if not cart:
        raise OrderServiceError('Cart not found.', status_code=status.HTTP_404_NOT_FOUND)

    item = CartItem.objects.filter(id=item_id, cart=cart).first()
    if not item:
        raise OrderServiceError('Cart item not found.', status_code=status.HTTP_404_NOT_FOUND)

    item.delete()
    return cart


def preview_checkout(
    user,
    *,
    shipping_method='standard',
    payment_method='card',
    shipping_address=None,
    notes='',
):
    """Validate cart readiness and calculate order totals without modifying inventory."""
    method = shipping_method if shipping_method in {'standard', 'express'} else 'standard'
    pay_method = str(payment_method or 'card').strip()[:32] or 'card'
    normalized_address = _normalize_shipping_address(user, shipping_address=shipping_address)

    cart = get_or_create_cart(user)
    items = list(cart.items.select_related('product'))
    if not items:
        raise OrderServiceError('Cart is empty.')

    subtotal = Decimal('0.00')
    summary_items = []
    for item in items:
        product = item.product
        if not product or not product.is_active:
            raise OrderServiceError(f'{item.product.name} is no longer available.')
        if item.quantity > product.stock_quantity:
            raise OrderServiceError(f'Not enough stock for {product.name}.')
        line_total = (product.price * item.quantity).quantize(Decimal('0.01'))
        subtotal += line_total
        summary_items.append({
            'cart_item_id': item.id,
            'product_id': product.id,
            'product_name': product.name,
            'quantity': item.quantity,
            'unit_price': str(product.price),
            'line_total': str(line_total),
        })

    shipping_cost = _calculate_shipping(subtotal, method)
    tax = (subtotal * Decimal('0.08')).quantize(Decimal('0.01'))
    total_amount = (subtotal + shipping_cost + tax).quantize(Decimal('0.01'))

    missing_address_fields = [
        field for field in ('full_name', 'address_line1', 'city', 'postal_code', 'country')
        if not normalized_address.get(field)
    ]

    return {
        'items': summary_items,
        'item_count': sum(i.quantity for i in items),
        'subtotal': str(subtotal.quantize(Decimal('0.01'))),
        'shipping_cost': str(shipping_cost),
        'tax': str(tax),
        'total_amount': str(total_amount),
        'shipping_method': method,
        'payment_method': pay_method,
        'shipping_address': normalized_address,
        'missing_address_fields': missing_address_fields,
        'notes': str(notes or '').strip()[:500],
    }


def execute_checkout(
    user,
    *,
    shipping_method='standard',
    payment_method='card',
    shipping_address=None,
    notes='',
    raw_data=None,
):
    """Atomically lock inventory, create an Order, deduct stock, and clear the cart."""
    method = shipping_method if shipping_method in {'standard', 'express'} else 'standard'
    pay_method = str(payment_method or 'card').strip()[:32] or 'card'
    normalized_address = _normalize_shipping_address(
        user,
        shipping_address=shipping_address,
        raw_data=raw_data,
    )

    cart = get_or_create_cart(user)
    with transaction.atomic():
        items = list(cart.items.select_related('product'))
        if not items:
            raise OrderServiceError('Cart is empty.')

        product_ids = [item.product_id for item in items]
        locked_products = {
            p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)
        }

        subtotal = Decimal('0.00')
        order_items = []
        for item in items:
            product = locked_products.get(item.product_id)
            if not product or not product.is_active:
                raise OrderServiceError(f'{item.product.name} is no longer available.')
            if item.quantity > product.stock_quantity:
                raise OrderServiceError(f'Not enough stock for {product.name}.')
            line_price = product.price
            subtotal += line_price * item.quantity
            order_items.append((product, item.quantity, line_price))

        shipping_cost = _calculate_shipping(subtotal, method)
        tax = (subtotal * Decimal('0.08')).quantize(Decimal('0.01'))
        total_amount = (subtotal + shipping_cost + tax).quantize(Decimal('0.01'))

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            tax=tax,
            total_amount=total_amount,
            status='paid',
            shipping_method=method,
            payment_method=pay_method,
            shipping_address=normalized_address,
            notes=str(notes or '').strip()[:500],
        )
        order.order_number = f'ASE-{datetime.utcnow().year}-{1000 + order.id}'
        order.save(update_fields=['order_number'])

        for product, quantity, unit_price in order_items:
            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity'])
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
            )
        cart.items.all().delete()

    return order


def get_user_order_history(user, limit=None):
    """Return orders belonging exclusively to the given user, newest first."""
    qs = (
        Order.objects.filter(user=user)
        .prefetch_related('order_items__product__category')
        .order_by('-created_at')
    )
    if limit is not None:
        return qs[:int(limit)]
    return qs

