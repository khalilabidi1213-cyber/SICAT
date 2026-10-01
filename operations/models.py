# backend/operations/models.py
from django.db import models

class MilitaryUnit(models.Model):
    name = models.CharField(max_length=255)
    diplomacy = models.CharField(max_length=50)
    echelon = models.CharField(max_length=50)
    branch = models.CharField(max_length=50)
    lat = models.FloatField()
    lng = models.FloatField()
    
    personnel_officers = models.IntegerField(default=0)
    personnel_sous_officers = models.IntegerField(default=0)
    personnel_troupe = models.IntegerField(default=0)
    
    # New Status Fields
    personnel_ready = models.IntegerField(default=0)
    personnel_sick = models.IntegerField(default=0)
    personnel_dead = models.IntegerField(default=0)
    personnel_missing = models.IntegerField(default=0)
    
    weapons = models.TextField(blank=True, null=True)
    ammo = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name