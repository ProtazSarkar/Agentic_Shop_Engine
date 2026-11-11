from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'name')

    def get_name(self, obj):
        full = f'{obj.first_name} {obj.last_name}'.strip()
        return full or obj.username or obj.email.split('@')[0]


def _generate_unique_username(email, preferred=''):
    base = (preferred or email.split('@')[0] or 'user').strip()[:140]
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f'{base}_{suffix}'
        suffix += 1
    return candidate


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False)
    password2 = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = (
            'email',
            'username',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
            'password2',
        )

    def validate(self, attrs):
        confirm = attrs.get('password_confirm') or attrs.get('password2')
        if not confirm:
            raise serializers.ValidationError({'password_confirm': 'Please confirm your password.'})
        if attrs['password'] != confirm:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('password2', None)
        password = validated_data.pop('password')
        email = validated_data['email'].strip().lower()
        validated_data['email'] = email
        raw_username = validated_data.get('username', '').strip()
        validated_data['username'] = _generate_unique_username(email, raw_username)
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            raise serializers.ValidationError('Invalid email or password.')

        attrs['user'] = user
        return attrs
