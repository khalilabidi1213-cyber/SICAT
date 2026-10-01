# authentication/views.py
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add custom claims
        data['username'] = self.user.username
        data['is_admin'] = self.user.is_superuser or self.user.is_staff
        data['roles'] = list(self.user.groups.values_list('name', flat=True))
        return data

class SICATLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer