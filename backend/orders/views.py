from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CartSerializer, OrderSerializer
from .services import (
    OrderServiceError,
    add_item_to_cart,
    execute_checkout,
    get_or_create_cart,
    get_user_order_history,
    remove_item_from_cart,
)


class CartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddToCartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id') or request.data.get('product')
        quantity = request.data.get('quantity', 1)
        try:
            cart = add_item_to_cart(request.user, product_id, quantity=quantity)
        except OrderServiceError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(
            {'detail': 'Item added to cart.', **CartSerializer(cart).data},
            status=status.HTTP_200_OK,
        )


class RemoveCartItemAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        try:
            cart = remove_item_from_cart(request.user, item_id)
        except OrderServiceError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(
            {'detail': 'Item removed from cart.', **CartSerializer(cart).data},
            status=status.HTTP_200_OK,
        )


class CheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shipping_method = request.data.get('shipping_method', 'standard')
        payment_method = request.data.get('payment_method', 'card')
        notes = request.data.get('notes', '')
        shipping_address = request.data.get('shipping_address')

        try:
            order = execute_checkout(
                request.user,
                shipping_method=shipping_method,
                payment_method=payment_method,
                shipping_address=shipping_address if isinstance(shipping_address, dict) else None,
                notes=notes,
                raw_data=request.data,
            )
        except OrderServiceError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(
            {'detail': 'Checkout successful.', 'order': OrderSerializer(order).data},
            status=status.HTTP_201_CREATED,
        )


class OrderHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = get_user_order_history(request.user)
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
