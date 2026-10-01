# c2_core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UnitViewSet, SpatialSectorQueryView, ElevationProfileView

router = DefaultRouter()
router.register(r'units', UnitViewSet)

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('gis/spatial-query/', SpatialSectorQueryView.as_view(), name='spatial_query'),
    path('gis/elevation-profile/', ElevationProfileView.as_view(), name='elevation_profile'),
    path('', include(router.urls)),
]