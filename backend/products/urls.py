from django.urls import path

from .views import CategoryListView, ProductDetailView, ProductListView, ProductSearchView

urlpatterns = [
    path('', ProductListView.as_view(), name='product-list'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('search/', ProductSearchView.as_view(), name='product-search'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
]
