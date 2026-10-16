import argparse
import unittest
from pathlib import Path
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import landsat_false_color as exporter


class FalseColorExporterTests(unittest.TestCase):
    def test_parse_bbox_uses_west_south_east_north_order(self):
        self.assertEqual(exporter.parse_bbox("125,71.5,129,73"), (125.0, 71.5, 129.0, 73.0))

    def test_parse_bbox_rejects_invalid_extent(self):
        with self.assertRaises(argparse.ArgumentTypeError):
            exporter.parse_bbox("129,73,125,71.5")
        with self.assertRaises(argparse.ArgumentTypeError):
            exporter.parse_bbox("125,71,129")

    def test_false_color_composite_channel_order(self):
        self.assertEqual(exporter.DEFAULT_COMPOSITES["earth"], ("swir22", "nir08", "red"))
        self.assertEqual(exporter.DEFAULT_COMPOSITES["water-soil"], ("swir16", "nir08", "red"))
        self.assertEqual(exporter.DEFAULT_COMPOSITES["vegetation"], ("nir08", "red", "green"))

    def test_qa_mask_excludes_fill_cloud_cirrus_shadow_and_snow(self):
        qa = np.array([0, 1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5, 1 << 7], dtype=np.uint16)
        actual = exporter.qa_valid_mask(qa)
        np.testing.assert_array_equal(actual, [True, False, False, False, False, False, False, True])

    def test_stretch_clips_and_maps_to_uint8(self):
        data = np.array([-1.0, 0.5, 2.0], dtype=np.float32)
        actual = exporter.stretched_uint8(data, (0.0, 1.0), 1.0)
        np.testing.assert_array_equal(actual, [0, 128, 255])


if __name__ == "__main__":
    unittest.main()
