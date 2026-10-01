# c2_core/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from .models import Unit, MSELEvent
from .serializers import UnitSerializer, MSELEventSerializer

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class SpatialSectorQueryView(APIView):
    """Filters units and events residing strictly inside a GeoJSON Polygon boundary"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        polygon_geojson = request.data.get('polygon_geojson')
        if not polygon_geojson:
            return Response({"error": "polygon_geojson missing"}, status=status.HTTP_400_BAD_REQUEST)

        sector_geom = GEOSGeometry(str(polygon_geojson), srid=4326)
        units = Unit.objects.filter(location__within=sector_geom)
        events = MSELEvent.objects.filter(location__within=sector_geom)

        return Response({
            "units": UnitSerializer(units, many=True).data,
            "events": MSELEventSerializer(events, many=True).data
        })

class ElevationProfileView(APIView):
    """Samples SRTM elevation raster table along user LineString"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        wkt_line = request.data.get('linestring_wkt')
        samples = int(request.data.get('samples', 50))

        sql = """
        WITH line AS (SELECT ST_GeomFromText(%s, 4326) AS geom),
        pts AS (
            SELECT (gs).path[1] as idx, (gs).geom as pt_geom,
            ST_Length(ST_Transform(ST_LineSubstring(line.geom, 0, LEAST(1.0, ((gs).path[1] - 1)::float / (%s - 1))), 32632)) AS dist_m
            FROM line, LATERAL ST_Dump(ST_GeneratePoints(ST_Segmentize(line.geom, ST_Length(line.geom)/%s), %s)) gs
        )
        SELECT pts.idx, pts.dist_m, ST_X(pts.pt_geom), ST_Y(pts.pt_geom),
               COALESCE(ST_Value(dem.rast, 1, pts.pt_geom), 0.0) as elev
        FROM pts LEFT JOIN srtm_dem dem ON ST_Intersects(dem.rast, pts.pt_geom)
        ORDER BY pts.idx;
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [wkt_line, samples, samples, samples])
            rows = cursor.fetchall()

        profile = [{"idx": r[0], "distance_m": round(r[1], 1), "lon": r[2], "lat": r[3], "elevation_m": round(r[4], 1)} for r in rows]
        return Response({"profile": profile})