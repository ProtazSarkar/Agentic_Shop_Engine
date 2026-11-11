from rest_framework import serializers

from products.serializers import ProductSerializer
from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'quantity', 'unit_price', 'line_total')

    def get_line_total(self, obj):
        return f'{obj.total_price:.2f}'


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'total', 'subtotal', 'item_count', 'updated_at')
        read_only_fields = ('id', 'user', 'items', 'total', 'subtotal', 'item_count', 'updated_at')

    def get_items(self, obj):
        return CartItemSerializer(obj.items.select_related('product__category').all(), many=True).data

    def get_total(self, obj):
        value = sum((item.quantity * item.unit_price) for item in obj.items.all())
        return f'{value:.2f}'

    def get_subtotal(self, obj):
        return self.get_total(obj)

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.CharField(source='product.image', read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'product',
            'product_id',
            'product_name',
            'product_image',
            'quantity',
            'unit_price',
            'line_total',
        )

    def get_line_total(self, obj):
        return f'{obj.total_price:.2f}'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source='order_items', many=True, read_only=True)
    total = serializers.DecimalField(source='total_amount', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'user',
            'status',
            'subtotal',
            'shipping_cost',
            'tax',
            'total_amount',
            'total',
            'shipping_method',
            'payment_method',
            'shipping_address',
            'notes',
            'created_at',
            'items',
        )
        read_only_fields = fields
