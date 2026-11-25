import csv,io,json,sys,zipfile,urllib.request,tempfile
from pathlib import Path
import shapefile
from shapely.geometry import shape
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'BridgePoint Temperature/1.0'})
    with urllib.request.urlopen(req,timeout=150) as r:return r.read()
rows=[]
u='https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip'
with zipfile.ZipFile(io.BytesIO(get(u))) as z:
    name=next(n for n in z.namelist() if n.endswith('.txt'))
    for raw in csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig')),delimiter='\t'):
        d={k.strip():v.strip() for k,v in raw.items() if k and v}
        rows.append([round(float(d['INTPTLONG']),5),round(float(d['INTPTLAT']),5),d['NAME']+', '+d['USPS']])
assert len(rows)>3100,len(rows)
us_count=len(rows)
url='https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/CGAZ/geoBoundariesCGAZ_ADM2.zip'
with tempfile.TemporaryDirectory() as tmp:
    archive=Path(tmp,'admin.zip');archive.write_bytes(get(url))
    with zipfile.ZipFile(archive) as z:
        base=next(n[:-4] for n in z.namelist() if n.lower().endswith('.shp'))
        for ext in ('.shp','.shx','.dbf'):
            Path(tmp,'adm'+ext).write_bytes(z.read(base+ext))
    r=shapefile.Reader(str(Path(tmp,'adm.shp')),encodingErrors='replace')
    for record in r.iterShapeRecords():
        d={k.lower():str(v).strip() for k,v in record.record.as_dict().items()}
        iso=d.get('shapegroup') or d.get('shapeiso') or d.get('gid_0') or ''
        if iso.upper() in ('USA','US','PRI'):continue
        name=d.get('shapename') or d.get('name_2') or d.get('name') or ''
        if not name or name.lower() in ('none','null','nan'):continue
        try:
            point=shape(record.shape.__geo_interface__).representative_point()
            if not point.is_empty:rows.append([round(point.x,5),round(point.y,5),name])
        except Exception:continue
assert len(rows)>us_count+10000,(len(rows),us_count)
p=Path(sys.argv[1]);p.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
print('GLOBAL_ADM2_REFERENCE_PASS',len(rows),'US counties',us_count)
