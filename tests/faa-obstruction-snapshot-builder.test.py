#!/usr/bin/env python3
import gzip
import io
import json
import tempfile
import unittest
from pathlib import Path

from build_faa_obstruction_snapshot import build_snapshot, compact_record

HEADER = "OAS,VERIFIED STATUS,COUNTRY,STATE,CITY,LATDEC,LONDEC,DMSLAT,DMSLON,TYPE,QUANTITY,AGL,AMSL,LIGHTING,ACCURACY,MARKING,FAA STUDY,ACTION,JDATE\n"


class FAAObstructionSnapshotTests(unittest.TestCase):
    def test_compact_record_preserves_source_height_and_metadata(self):
        row = {
            "OAS": "01-123456", "COUNTRY": "US", "STATE": "CT", "CITY": "MIDDLETOWN",
            "LATDEC": "41.5500", "LONDEC": "-72.6500", "TYPE": "T-L TWR",
            "QUANTITY": "1", "AGL": "00600", "AMSL": "00650", "VERIFIED STATUS": "O",
            "LIGHTING": "R", "ACCURACY": "5D", "MARKING": "M",
            "FAA STUDY": "2026NEA00001OE", "ACTION": "C", "JDATE": "2026308",
        }
        result = compact_record(row)
        self.assertEqual(result[0], "01-123456")
        self.assertEqual(result[6], "T-L TWR")
        self.assertEqual(result[8], 600)
        self.assertEqual(result[9], 650)
        self.assertEqual(result[10], "O")
        self.assertEqual(result[12], "5D")

    def test_filters_non_tower_types_removed_actions_and_invalid_records(self):
        base = {
            "OAS": "01-000001", "COUNTRY": "US", "STATE": "CT", "CITY": "TEST",
            "LATDEC": "41.5", "LONDEC": "-72.5", "TYPE": "TOWER",
            "QUANTITY": "1", "AGL": "200", "AMSL": "250", "VERIFIED STATUS": "U",
            "LIGHTING": "", "ACCURACY": "", "MARKING": "", "FAA STUDY": "",
            "ACTION": "A", "JDATE": "",
        }
        self.assertIsNotNone(compact_record(base))
        self.assertIsNotNone(compact_record({**base, "TYPE": "CRANE"}))
        self.assertIsNone(compact_record({**base, "TYPE": "UTILITY POLE"}))
        self.assertIsNone(compact_record({**base, "ACTION": "D"}))
        self.assertIsNone(compact_record({**base, "AGL": "0"}))
        self.assertIsNone(compact_record({**base, "LATDEC": "91"}))

    def test_snapshot_writes_gzip_json_with_provenance_and_counts(self):
        csv_text = HEADER + (
            "01-000001,O,US,CT,TEST,41.5,-72.5,41 30 00N,072 30 00W,TOWER,1,00200,00250,R,5D,M,STUDY1,A,2026308\n"
            "01-000002,U,US,CT,TEST,41.6,-72.6,41 36 00N,072 36 00W,T-L TWR,1,00400,00450,R,5D,M,STUDY2,C,2026308\n"
            "01-000003,O,US,CT,TEST,41.7,-72.7,41 42 00N,072 42 00W,CRANE,1,00500,00550,R,5D,M,STUDY3,A,2026308\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "snapshot.json.gz"
            metadata = build_snapshot(io.StringIO(csv_text), output)
            with gzip.open(output, "rt", encoding="utf-8") as stream:
                payload = json.load(stream)
            self.assertEqual(metadata["sourceRecordCount"], 3)
            self.assertEqual(metadata["filteredRecordCount"], 3)
            self.assertEqual(len(payload["rows"]), 3)
            self.assertEqual(payload["rows"][1][6], "T-L TWR")
            self.assertEqual(payload["rows"][2][6], "CRANE")
            self.assertIn("not a global", metadata["coverageNote"])
            self.assertIn("not structural CAD", metadata["geometryNote"])


if __name__ == "__main__":
    unittest.main()
