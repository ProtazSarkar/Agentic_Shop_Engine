from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthenticationAPITests(APITestCase):
    def test_register_login_and_logout_flow(self):
        reg_resp = self.client.post(
            '/api/auth/register/',
            {
                'email': 'shopper@example.com',
                'password': 'StrongPassword123!',
                'password_confirm': 'StrongPassword123!',
                'first_name': 'Maya',
                'last_name': 'Lin',
            },
            format='json',
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', reg_resp.data)
        self.assertEqual(reg_resp.data['user']['email'], 'shopper@example.com')

        login_resp = self.client.post(
            '/api/auth/login/',
            {'email': 'shopper@example.com', 'password': 'StrongPassword123!'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        token = login_resp.data['token']

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        logout_resp = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

    def test_google_auth_endpoint_creates_or_fetches_user(self):
        resp = self.client.post(
            '/api/auth/google/',
            {'email': 'oauth.user@gmail.com', 'first_name': 'Alex', 'last_name': 'Mercer'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp.data)
        self.assertEqual(resp.data['user']['email'], 'oauth.user@gmail.com')
        self.assertTrue(User.objects.filter(email='oauth.user@gmail.com').exists())
