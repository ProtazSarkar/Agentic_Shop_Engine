from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product

User = get_user_model()


class OrdersAndCartAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='buyer@example.com',
            username='buyer',
            password='Password123!',
        )
        self.client.force_authenticate(user=self.user)

        self.cat = Category.objects.create(name='Audio', slug='audio')
        self.product = Product.objects.create(
            category=self.cat,
            name='Studio Headphones',
            slug='studio-headphones',
            price=Decimal('200.00'),
            stock_quantity=3,
        )

    def test_cart_add_stock_validation_remove_checkout_and_history(self):
        # Add 2 units (stock=3)
        add_resp = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': self.product.id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(add_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(add_resp.data['item_count'], 2)

        # Adding 2 more (2+2=4 > 3) must fail
        over_resp = self.client.post(
            '/api/orders/cart/add/',
            {'product_id': self.product.id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(over_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Remove item and re-add 1
        item_id = add_resp.data['items'][0]['id']
        del_resp = self.client.delete(f'/api/orders/cart/remove/{item_id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(del_resp.data['item_count'], 0)

        self.client.post(
            '/api/orders/cart/add/',
            {'product_id': self.product.id, 'quantity': 1},
            format='json',
        )

        checkout_resp = self.client.post(
            '/api/orders/checkout/',
            {
                'shipping_method': 'standard',
                'payment_method': 'card',
                'shipping_address': {
                    'full_name': 'Buyer Test',
                    'email': 'buyer@example.com',
                    'phone': '+1 415 555 0100',
                    'address_line1': '100 Main St',
                    'city': 'San Francisco',
                    'state': 'CA',
                    'postal_code': '94105',
                    'country': 'United States',
                },
            },
            format='json',
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        order = checkout_resp.data['order']
        # $200 >= $150 -> free shipping + 8% tax ($16.00) = $216.00
        self.assertEqual(Decimal(order['total_amount']), Decimal('216.00'))

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 2)

        history_resp = self.client.get('/api/orders/history/')
        self.assertEqual(history_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_resp.data), 1)
        self.assertEqual(history_resp.data[0]['order_number'], order['order_number'])
