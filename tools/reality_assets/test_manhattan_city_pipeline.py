import unittest
from pyproj import Transformer
from shapely.geometry import LineString, Polygon, mapping, shape
from tools.reality_assets.download_manhattan_city_sources import (ORIGIN_LON_LAT, SODA_DATASETS, clip_feature_collection, project_geometry)

class ManhattanSourcePipelineTests(unittest.TestCase):
    def setUp(self):
        self.transformer = Transformer.from_crs("EPSG:4326", "EPSG:2263", always_xy=True)
        self.origin = self.transformer.transform(*ORIGIN_LON_LAT)

    def test_projection_places_origin_at_local_zero(self):
        geom = {"type": "Point", "coordinates": [ORIGIN_LON_LAT[0], ORIGIN_LON_LAT[1]]}
        local = project_geometry(geom, self.transformer, self.origin)
        self.assertEqual(local["type"], "Point")
        self.assertAlmostEqual(local["coordinates"][0], 0.0, places=3)
        self.assertAlmostEqual(local["coordinates"][1], 0.0, places=3)

    def test_projection_preserves_geojson_nesting(self):
        geom = {"type": "MultiLineString", "coordinates": [[[-73.97, 40.78], [-73.96, 40.79]]]}
        local = project_geometry(geom, self.transformer, self.origin)
        self.assertEqual(local["type"], "MultiLineString")
        self.assertEqual(len(local["coordinates"]), 1)
        self.assertEqual(len(local["coordinates"][0]), 2)
        self.assertNotEqual(local["coordinates"][0][0], [-73.97, 40.78])

    def test_city_dataset_manifest_contains_required_layers(self):
        for key in ("roads", "curbs", "sidewalks", "water", "trees", "hydrants", "boundary"):
            self.assertIn(key, SODA_DATASETS)
            self.assertTrue(SODA_DATASETS[key]["id"])

    def test_clip_keeps_manhattan_roads_and_removes_outside_geometry(self):
        boundary = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        payload = {"name": "roads", "features": [
            {"type": "Feature", "properties": {"id": "inside"}, "geometry": mapping(LineString([(-10, 50), (110, 50)]))},
            {"type": "Feature", "properties": {"id": "outside"}, "geometry": mapping(LineString([(120, 120), (150, 150)]))},
        ]}
        result = clip_feature_collection(payload, boundary)
        self.assertEqual(len(result["features"]), 1)
        clipped = shape(result["features"][0]["geometry"])
        self.assertAlmostEqual(clipped.length, 100.0)
        self.assertEqual(result["clip"], "Manhattan borough polygon")

    def test_water_clip_keeps_adjacent_water_buffer(self):
        boundary = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        payload = {"name": "water", "features": [
            {"type": "Feature", "properties": {"id": "river"}, "geometry": mapping(Polygon([(-200, 30), (-50, 30), (-50, 70), (-200, 70), (-200, 30)]))},
            {"type": "Feature", "properties": {"id": "far"}, "geometry": mapping(Polygon([(-1000, 30), (-900, 30), (-900, 70), (-1000, 70), (-1000, 30)]))},
        ]}
        result = clip_feature_collection(payload, boundary, 100.0)
        self.assertEqual(len(result["features"]), 1)
        self.assertGreater(shape(result["features"][0]["geometry"]).area, 0)

if __name__ == "__main__":
    unittest.main()
