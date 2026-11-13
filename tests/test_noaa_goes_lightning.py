import importlib.util
import pathlib
import unittest
from datetime import datetime, timezone

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "tools" / "reality_assets" / "fetch_noaa_goes_lightning.py"
SPEC = importlib.util.spec_from_file_location("goes_lightning", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GoEsLightningTests(unittest.TestCase):
    def test_scan_time(self):
        stamp = MODULE.parse_scan_start_utc(
            "GLM-L2-LCFA/2026/317/04/OR_GLM-L2-LCFA_G19_s20263170408200_e20263170408220_c20263170408225.nc"
        )
        self.assertIsNotNone(stamp)
        self.assertEqual(stamp.year, 2026)
        self.assertEqual(stamp.timetuple().tm_yday, 317)
        self.assertEqual(stamp.hour, 4)
        self.assertEqual(stamp.minute, 8)
        self.assertEqual(stamp.second, 20)
        self.assertEqual(stamp.utcoffset().total_seconds(), 0)

    def test_invalid_scan_time(self):
        self.assertIsNone(MODULE.parse_scan_start_utc("bad-name.nc"))
        self.assertIsNone(MODULE.parse_scan_start_utc("OR_GLM-L2-LCFA_G19_s20263670408200.nc"))

    def test_flash_quality_validation(self):
        self.assertTrue(MODULE.validate_flash(40.7, -74.0, 2.5, 1000000, 0))
        self.assertFalse(MODULE.validate_flash(91.0, -74.0, 2.5, 1000000, 0))
        self.assertFalse(MODULE.validate_flash(40.7, -181.0, 2.5, 1000000, 0))
        self.assertFalse(MODULE.validate_flash(40.7, -74.0, 2.5, 1000000, 1))
        self.assertFalse(MODULE.validate_flash(40.7, -74.0, -1.0, 1000000, 0))

    def test_cf_datetime_serializes_utc(self):
        value = datetime(2026, 11, 13, 4, 30, tzinfo=timezone.utc)
        self.assertEqual(MODULE._as_utc_iso(value), "2026-11-13T04:30:00Z")


if __name__ == "__main__":
    unittest.main()
