from rest_framework import serializers
from .models import MilitaryUnit

class MilitaryUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilitaryUnit
        fields = '__all__'