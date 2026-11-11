import requests
from decouple import config
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    _generate_unique_username,
)

User = get_user_model()


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    'token': token.key,
                    'user': UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    'token': token.key,
                    'user': UserSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class GoogleAuthAPIView(APIView):
    permission_classes = [AllowAny]

    def _resolve_google_profile(self, request):
        code = request.data.get('code')
        access_token = request.data.get('access_token')
        id_token = request.data.get('id_token')

        if code and not access_token:
            client_id = config('GOOGLE_CLIENT_ID', default='')
            client_secret = config('GOOGLE_CLIENT_SECRET', default='')
            redirect_uri = request.data.get('redirect_uri') or 'http://127.0.0.1:5173/oauth/google/callback'
            if client_id and client_secret and not client_id.startswith('your_'):
                token_resp = requests.post(
                    'https://oauth2.googleapis.com/token',
                    data={
                        'code': code,
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'redirect_uri': redirect_uri,
                        'grant_type': 'authorization_code',
                    },
                    timeout=10,
                )
                if token_resp.ok:
                    token_json = token_resp.json()
                    access_token = token_json.get('access_token')
                    id_token = id_token or token_json.get('id_token')

        if access_token:
            info_resp = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            if info_resp.ok:
                data = info_resp.json()
                return {
                    'email': data.get('email'),
                    'first_name': data.get('given_name', ''),
                    'last_name': data.get('family_name', ''),
                }

        if id_token:
            info_resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': id_token},
                timeout=10,
            )
            if info_resp.ok:
                data = info_resp.json()
                return {
                    'email': data.get('email'),
                    'first_name': data.get('given_name', ''),
                    'last_name': data.get('family_name', ''),
                }

        email = request.data.get('email') or request.data.get('user_email')
        full_name = (request.data.get('name') or '').strip()
        first_name = request.data.get('first_name') or (full_name.split(' ')[0] if full_name else '')
        last_name = request.data.get('last_name') or (
            ' '.join(full_name.split(' ')[1:]) if full_name else ''
        )
        return {
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
        }

    def post(self, request):
        profile = self._resolve_google_profile(request)
        email = (profile.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'detail': 'Provide Google OAuth code/token or an email address to continue.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': _generate_unique_username(email),
                'first_name': profile.get('first_name', ''),
                'last_name': profile.get('last_name', ''),
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'token': token.key,
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
