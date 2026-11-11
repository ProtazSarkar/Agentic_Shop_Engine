from django.urls import path

from .views import (
    AddToCartAPIView,
    CartAPIView,
    CheckoutAPIView,
    OrderHistoryAPIView,
    RemoveCartItemAPIView,
)

urlpatterns = [
    path('cart/', CartAPIView.as_view(), name='cart-list'),
    path('cart/add/', AddToCartAPIView.as_view(), name='cart-add'),
    path('cart/remove/<int:item_id>/', RemoveCartItemAPIView.as_view(), name='cart-remove'),
    path('checkout/', CheckoutAPIView.as_view(), name='checkout'),
    path('history/', OrderHistoryAPIView.as_view(), name='order-history'),
]
