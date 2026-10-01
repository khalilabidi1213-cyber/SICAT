# backend/urls.py
from django.contrib import admin
from django.urls import include, path
from authentication.views import SICATLoginView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/login/', SICATLoginView.as_view(), name='token_obtain_pair'),
    path('api/operations/', include('operations.urls')),
]