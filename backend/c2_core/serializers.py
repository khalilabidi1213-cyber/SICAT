# c2_core/serializers.py
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import CustomUser, Unit, MSELEvent

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'section_role', 'military_rank', 'clearance_level']

class UnitSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Unit
        geo_field = 'location'
        fields = ['id', 'name', 'callsign', 'affiliation', 'echelon', 'parent_unit', 'symbol_code']

class MSELEventSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = MSELEvent
        geo_field = 'location'
        fields = ['id', 'incident_number', 'title', 'description', 'timestamp', 'section_owner', 'severity', 'action_taken']