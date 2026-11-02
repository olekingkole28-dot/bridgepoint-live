import unittest

import numpy as np

from tools.satellite.refresh_cloud_height_observations import (
    compact_grid_samples,
    compact_point_samples,
    compact_cloud_mask_samples,
    goes_start_time,
    compact_cloud_mask_samples,
    goes_start_time,
    is_netcdf_url,
    meters,
    sampling_indices,
)


class CloudHeightFeedTests(unittest.TestCase):
    def test_unit_conversion_keeps_official_units_explicit(self):
        np.testing.assert_allclose(meters(np.array([1.5, 8.25]), "km", "km"), [1500.0, 8250.0])
        np.testing.assert_allclose(meters(np.array([1500.0]), "m", "m"), [1500.0])

    def test_grid_builder_keeps_only_valid_numeric_cloud_tops(self):
        lat = np.array([[0.0, 0.0], [10.0, 10.0]])
        lon = np.array([[0.0, 1.0], [0.0, 1.0]])
        top = np.array([[1200.0, 5000.0], [np.nan, 28000.0]])
        base = np.array([[-999.0, 4200.0], [400.0, 600.0]])
        # 0=good, 1=conditionally usable, all other values rejected.
        quality = np.array([[0, 1], [0, 3]])
        samples = compact_grid_samples(lat, lon, top, base, quality, source_index=2)
        self.assertEqual(len(samples), 2)
        self.assertEqual(samples[0], [0.0, 0.0, 1200.0, None, 2])
        self.assertEqual(samples[1], [1.0, 0.0, 5000.0, 4200.0, 2])

    def test_cloud_base_is_null_when_not_measured_or_not_below_top(self):
        lat = np.array([[5.0]])
        lon = np.array([[25.0]])
        samples = compact_grid_samples(lat, lon, np.array([[4500.0]]), np.array([[4600.0]]), None, source_index=0)
        self.assertEqual(samples, [[25.0, 5.0, 4500.0, None, 0]])

    def test_flat_geolocated_pixels_are_sampled_and_quality_filtered(self):
        samples = compact_point_samples(
            np.array([1.0, 2.0, 3.0]),
            np.array([10.0, 11.0, 12.0]),
            np.array([900.0, 3200.0, 5000.0]),
            np.array([200.0, 2800.0, 6000.0]),
            np.array([0, 1, 3]),
            source_index=4,
        )
        self.assertEqual(samples, [
            [10.0, 1.0, 900.0, 200.0, 4],
            [11.0, 2.0, 3200.0, 2800.0, 4],
        ])

    def test_official_cloud_mask_keeps_clear_and_cloudy_pixels_and_rejects_bad_quality(self):
        lat = np.array([[10.0, 10.0], [11.0, 11.0]])
        lon = np.array([[-75.0, -74.0], [-75.0, -74.0]])
        probability = np.array([[0.02, 0.98], [0.78, 0.50]])
        quality = np.array([[0, 0], [1, 2]])
        samples = compact_cloud_mask_samples(lat, lon, probability, quality, source_index=3)
        self.assertEqual(samples, [
            [-75.0, 10.0, 5, 3],
            [-74.0, 10.0, 250, 3],
        ])

    def test_goes_filename_observation_time_is_not_the_download_time(self):
        stamp = goes_start_time("https://noaa-goes19.s3.amazonaws.com/ABI-L2-ACMF/2026/306/21/OR_ABI-L2-ACMF-M6_G19_s20263062140210_e20263062149518_c20263062152182.nc")
        self.assertEqual(stamp.isoformat(), "2026-11-02T21:40:21+00:00")
        self.assertIsNone(goes_start_time("https://example.test/not-a-goes-file.nc"))

    def test_official_cloud_mask_keeps_clear_and_cloudy_pixels_and_rejects_bad_quality(self):
        lat = np.array([[10.0, 10.0], [11.0, 11.0]])
        lon = np.array([[-75.0, -74.0], [-75.0, -74.0]])
        probability = np.array([[0.02, 0.98], [0.78, 0.50]])
        quality = np.array([[0, 0], [1, 2]])
        samples = compact_cloud_mask_samples(lat, lon, probability, quality, source_index=3)
        self.assertEqual(samples, [
            [-75.0, 10.0, 5, 3],
            [-74.0, 10.0, 250, 3],
        ])

    def test_goes_filename_observation_time_is_not_download_time(self):
        stamp = goes_start_time(
            "https://noaa-goes19.s3.amazonaws.com/ABI-L2-ACMF/2026/306/21/"
            "OR_ABI-L2-ACMF-M6_G19_s20263062140210_e20263062149518_c20263062152182.nc"
        )
        self.assertEqual(stamp.isoformat(), "2026-11-02T21:40:21+00:00")
        self.assertIsNone(goes_start_time("https://example.test/not-a-goes-file.nc"))

    def test_sampling_budget_is_bounded(self):
        rows, cols = sampling_indices(1086, 1086)
        self.assertLessEqual(len(rows) * len(cols), 65000)
        self.assertGreater(len(rows), 100)
        self.assertGreater(len(cols), 100)

    def test_source_url_must_be_a_netcdf_file(self):
        self.assertTrue(is_netcdf_url("https://example.test/path/latest.nc"))
        self.assertTrue(is_netcdf_url("https://example.test/path/latest.nc4"))
        self.assertFalse(is_netcdf_url("https://example.test/path/latest.gif"))
        self.assertFalse(is_netcdf_url("https://example.test/path/directory/"))


if __name__ == "__main__":
    unittest.main()
