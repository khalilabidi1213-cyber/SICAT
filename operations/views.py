from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import MilitaryUnit
from .serializers import MilitaryUnitSerializer

class MilitaryUnitViewSet(viewsets.ModelViewSet):
    queryset = MilitaryUnit.objects.all()
    serializer_class = MilitaryUnitSerializer
    permission_classes = [IsAuthenticated]