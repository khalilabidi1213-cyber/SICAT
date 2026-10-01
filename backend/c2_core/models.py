# c2_core/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator

class SectionRole(models.TextChoices):
    SYSADMIN = 'SYSADMIN', 'System Administrator'
    OPS = 'OPS', 'Operations Section (G3/S3)'
    RENS = 'RENS', 'Intelligence Section (G2/S2)'
    LOG = 'LOG', 'Logistics Section (G4/S4)'
    SIGNALS = 'SIGNALS', 'Signals & Comms (G6/S6)'

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name="customuser_groups",
        related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="customuser_permissions",
        related_query_name="user",
    )
    section_role = models.CharField(max_length=20, choices=SectionRole.choices, default=SectionRole.OPS)
    military_rank = models.CharField(max_length=50, blank=True, null=True)
    clearance_level = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])

class UnitAffiliation(models.TextChoices):
    FRIENDLY = 'AMI', 'Friendly (AMI)'
    HOSTILE = 'ENNEMI', 'Hostile (ENNEMI)'
    NEUTRAL = 'NEUTRE', 'Neutral'

class Unit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    callsign = models.CharField(max_length=50, unique=True)
    affiliation = models.CharField(max_length=10, choices=UnitAffiliation.choices, default=UnitAffiliation.FRIENDLY)
    echelon = models.CharField(max_length=30, default='COMPANY')
    parent_unit = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    symbol_code = models.CharField(max_length=30, default="SFGPU-------")

    class Meta:
        indexes = [gis_models.Index(fields=['location'])]

class MSELEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_number = models.PositiveIntegerField(unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    timestamp = models.DateTimeField()
    section_owner = models.CharField(max_length=20, choices=SectionRole.choices)
    severity = models.CharField(max_length=15, default='INFO')
    location = gis_models.GeometryField(srid=4326)
    action_taken = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [gis_models.Index(fields=['location'])]