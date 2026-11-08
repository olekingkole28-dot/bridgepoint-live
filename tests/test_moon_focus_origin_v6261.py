from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MODULE=(ROOT/'recovery'/'bridgepoint-welcome-space-v6260.js').read_text()
assert 'function enterMoonExploration()' in MODULE
assert 'moonPivot.position.set(0,0,0);' in MODULE
assert 'moonMesh.position.set(0,0,0);' in MODULE
assert 'moonPivot.position.copy(moonMesh.position).negate()' not in MODULE
assert "if(viewState!=='moon'){" in MODULE
