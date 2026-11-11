from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product


class ProductsAPITests(APITestCase):
    def setUp(self):
        self.audio = Category.objects.create(name='Audio', slug='audio')
        self.kitchen = Category.objects.create(name='Home & Kitchen', slug='kitchen')

        self.headphones = Product.objects.create(
            category=self.audio,
            name='Aether Studio ANC Headphones',
            slug='aether-headphones',
            description='Wireless hybrid active noise cancellation.',
            price=Decimal('249.00'),
            stock_quantity=10,
            tags=['headphones', 'wireless', 'anc'],
            is_featured=True,
        )
        self.kettle = Product.objects.create(
            category=self.kitchen,
            name='Kuro Kettle',
            slug='kuro-kettle',
            description='Precision gooseneck pour-over kettle.',
            price=Decimal('135.00'),
            stock_quantity=0,
            tags=['coffee', 'kettle'],
        )

    def test_list_filters_by_category_slug_and_price(self):
        resp = self.client.get('/api/products/?category=audio&max_price=260')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Aether Studio ANC Headphones')

    def test_product_detail_endpoint(self):
        resp = self.client.get(f'/api/products/{self.headphones.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['stock'], 10)
        self.assertEqual(resp.data['category_slug'], 'audio')

    def test_hybrid_search_parses_price_and_stock_constraints(self):
        resp = self.client.get('/api/products/search/?q=headphones+under+$260+in+stock')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['id'], self.headphones.id)
        self.assertIn('Max Price: $260', resp.data['search_meta']['interpreted_filters'])
        self.assertIn('In Stock Only', resp.data['search_meta']['interpreted_filters'])

    def test_categories_endpoint_returns_counts(self):
        resp = self.client.get('/api/products/categories/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)
