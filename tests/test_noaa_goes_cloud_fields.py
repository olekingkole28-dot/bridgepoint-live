import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "tools" / "reality_assets" / "fetch_noaa_goes_cloud_fields.py"
SPEC = importlib.util.spec_from_file_location("goes_cloud_fields", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GoEsCloudFieldTests(unittest.TestCase):
    def test_parse_goes_scan_time(self):
        stamp = MODULE.parse_goes_scan_time(
            "ABI-L2-ACMF/2026/316/23/OR_ABI-L2-ACMF-M6_G19_s20263162340123_e20263162349331_c20263162350001.nc"
        )
        self.assertIsNotNone(stamp)
        self.assertEqual(stamp.year, 2026)
        self.assertEqual(stamp.timetuple().tm_yday, 316)
        self.assertEqual(stamp.hour, 23)
        self.assertEqual(stamp.minute, 40)
        self.assertEqual(stamp.second, 12)
        self.assertEqual(stamp.utcoffset().total_seconds(), 0)

    def test_invalid_scan_time_is_rejected(self):
        self.assertIsNone(MODULE.parse_goes_scan_time("not-a-goes-file.nc"))
        self.assertIsNone(MODULE.parse_goes_scan_time("OR_ABI-L2-ACMF_s20263662340123.nc"))

    def test_cloud_mask_probabilities(self):
        self.assertEqual(MODULE.cloud_class_confidence(0), 0.0)
        self.assertGreater(MODULE.cloud_class_opacity(1, 0.25), 0.0)
        self.assertGreater(MODULE.cloud_class_opacity(3, 0.95), MODULE.cloud_class_opacity(2, 0.65))
        self.assertEqual(MODULE.cloud_class_opacity(0, 1.0), 0.0)
        self.assertEqual(MODULE.cloud_class_opacity(99, 1.0), 0.0)

    def test_stride_is_bounded_and_power_of_two(self):
        stride = MODULE.choose_sample_stride(5424, 5424, 50000)
        self.assertGreater(stride, 0)
        self.assertEqual(stride & (stride - 1), 0)
        self.assertLessEqual(
            ((5424 + stride - 1) // stride) ** 2,
            50000,
        )

    def test_point_bounds_and_height_validation(self):
        self.assertTrue(MODULE.is_valid_cloud_point(40.7, -74.0, 9000, 3, 0.95))
        self.assertFalse(MODULE.is_valid_cloud_point(91.0, -74.0, 9000, 3, 0.95))
        self.assertFalse(MODULE.is_valid_cloud_point(40.7, -181.0, 9000, 3, 0.95))
        self.assertFalse(MODULE.is_valid_cloud_point(40.7, -74.0, 26000, 3, 0.95))
        self.assertFalse(MODULE.is_valid_cloud_point(40.7, -74.0, 9000, 0, 0.95))


if __name__ == "__main__":
    unittest.main()
