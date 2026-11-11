from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Product
from .serializers import CategorySerializer, ProductSerializer
from .services import (
    hybrid_search_products,
    list_categories_with_counts,
    list_products,
)


class ProductPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data, extra=None):
        payload = {
            'count': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        }
        if extra:
            payload.update(extra)
        return Response(payload)


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return list_categories_with_counts()


class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    pagination_class = ProductPagination

    def get_queryset(self):
        params = self.request.query_params
        return list_products(
            category=params.get('category'),
            min_price=params.get('min_price'),
            max_price=params.get('max_price'),
            in_stock=params.get('in_stock', ''),
            search=params.get('search') or params.get('q') or '',
            sort=params.get('sort', 'featured'),
        )


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Product.objects.filter(is_active=True).select_related('category')
    serializer_class = ProductSerializer


class ProductSearchView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    pagination_class = ProductPagination

    def list(self, request, *args, **kwargs):
        params = request.query_params
        result = hybrid_search_products(
            query=params.get('q') or params.get('search') or '',
            category=params.get('category'),
            min_price=params.get('min_price'),
            max_price=params.get('max_price'),
            in_stock=params.get('in_stock', ''),
            sort=params.get('sort', 'featured'),
        )

        page = self.paginate_queryset(result['products'])
        serializer = self.get_serializer(page, many=True)
        return self.paginator.get_paginated_response(
            serializer.data,
            extra={
                'search_meta': {
                    'mode': 'hybrid',
                    'query': result['query'],
                    'interpreted_filters': result['interpreted_filters'],
                }
            },
        )
