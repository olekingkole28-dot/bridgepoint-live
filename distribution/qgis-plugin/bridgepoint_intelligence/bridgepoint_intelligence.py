import json
import urllib.request
import urllib.parse
import webbrowser

from qgis.PyQt.QtWidgets import QAction, QInputDialog, QMessageBox
from qgis.core import QgsProject, QgsVectorLayer, QgsFeature, QgsGeometry, QgsPointXY, QgsField
from qgis.PyQt.QtCore import QVariant

SUPA = "https://xdfsjztwgsbmabshzsjw.supabase.co"
KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25"

class BridgePointPlugin:
    def __init__(self, iface):
        self.iface = iface
        self.action = None
        self.last_match = None

    def initGui(self):
        self.action = QAction("BridgePoint Property Lookup", self.iface.mainWindow())
        self.action.triggered.connect(self.lookup)
        self.iface.addPluginToWebMenu("BridgePoint Intelligence", self.action)
        self.iface.addToolBarIcon(self.action)

    def unload(self):
        if self.action:
            self.iface.removePluginWebMenu("BridgePoint Intelligence", self.action)
            self.iface.removeToolBarIcon(self.action)

    def _rpc(self, name, payload):
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            SUPA + "/rest/v1/rpc/" + name,
            data=body,
            method="POST",
            headers={
                "apikey": KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))

    def lookup(self):
        address, ok = QInputDialog.getText(
            self.iface.mainWindow(),
            "BridgePoint Intelligence",
            "Exact street address:"
        )
        if not ok or len(address.strip()) < 4:
            return

        try:
            data = self._rpc("bridgepoint_public_search_v5200", {
                "p_query": address.strip(),
                "p_limit": 4
            })
            rows = data.get("results") or []
            row = next((x for x in rows if x.get("property_id")), rows[0] if rows else None)
            if not row:
                raise RuntimeError("No BridgePoint match returned.")

            lng = float(row["longitude"])
            lat = float(row["latitude"])
            self.last_match = row
            self._add_point(row, lng, lat)

            deep = (
                "https://bridgepointintelligence.online/app/"
                "?lat=" + urllib.parse.quote(str(lat)) +
                "&lng=" + urllib.parse.quote(str(lng)) +
                "&z=18&select=1"
                "&utm_source=qgis_plugin&utm_medium=desktop_gis&utm_campaign=distribution"
            )
            answer = QMessageBox.question(
                self.iface.mainWindow(),
                "BridgePoint match",
                (row.get("full_address") or address) +
                "\\n\\nProperty ID: " + str(row.get("property_id") or "unresolved") +
                "\\nParcel: " + str(row.get("parcel_number") or "—") +
                "\\n\\nOpen the full BridgePoint 3D property view?"
            )
            if answer == QMessageBox.Yes:
                webbrowser.open(deep)

        except Exception as exc:
            QMessageBox.critical(self.iface.mainWindow(), "BridgePoint lookup failed", str(exc))

    def _add_point(self, row, lng, lat):
        layer = QgsVectorLayer("Point?crs=EPSG:4326", "BridgePoint Property", "memory")
        provider = layer.dataProvider()
        provider.addAttributes([
            QgsField("address", QVariant.String),
            QgsField("property_id", QVariant.String),
            QgsField("parcel", QVariant.String),
            QgsField("source", QVariant.String)
        ])
        layer.updateFields()

        feature = QgsFeature(layer.fields())
        feature.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(lng, lat)))
        feature["address"] = str(row.get("full_address") or "")
        feature["property_id"] = str(row.get("property_id") or "")
        feature["parcel"] = str(row.get("parcel_number") or "")
        feature["source"] = "BridgePoint public property resolution"
        provider.addFeature(feature)
        layer.updateExtents()
        QgsProject.instance().addMapLayer(layer)
        self.iface.setActiveLayer(layer)
        self.iface.zoomToActiveLayer()
