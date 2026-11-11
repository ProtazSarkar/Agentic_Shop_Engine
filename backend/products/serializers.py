from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'product_count')


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True, required=False)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    stock = serializers.IntegerField(source='stock_quantity', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'price',
            'original_price',
            'stock_quantity',
            'stock',
            'image',
            'category',
            'category_id',
            'category_slug',
            'rating',
            'review_count',
            'badge',
            'is_trending',
            'is_featured',
            'specs',
            'tags',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
