import base64,datetime as dt,json,sys,urllib.request
from pathlib import Path
import numpy as np
from eccodes import codes_new_from_message,codes_get_array,codes_get_values,codes_release
def get(url,headers=None):
    r=urllib.request.Request(url,headers={'User-Agent':'BridgePoint Temperature/1.0',**(headers or {})})
    with urllib.request.urlopen(r,timeout=55) as f:return f.read()
def build():
    now=dt.datetime.now(dt.timezone.utc)
    cycle=now.replace(hour=now.hour//6*6,minute=0,second=0,microsecond=0)
    for delta in range(5):
        run=cycle-dt.timedelta(hours=6*delta)
        if now-run>dt.timedelta(hours=24):break
        target=max(0,int((now-run).total_seconds()//3600))
        for hour in dict.fromkeys([target,0]):
            root=f'https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.{run:%Y%m%d}/{run:%H}/atmos/gfs.t{run:%H}z.pgrb2.0p25.f{hour:03d}'
            try:
                lines=get(root+'.idx').decode().splitlines()
                i=next(i for i,l in enumerate(lines) if ':TMP:2 m above ground:' in l)
                start=int(lines[i].split(':')[1]);end=int(lines[i+1].split(':')[1])-1
                message=get(root,{'Range':f'bytes={start}-{end}'})
                if len(message)!=end-start+1:raise ValueError('invalid byte range')
                h=codes_new_from_message(message)
                try:
                    lat=codes_get_array(h,'latitudes');lon=codes_get_array(h,'longitudes');val=codes_get_values(h)-273.15
                    if len(val)!=1440*721 or not np.isfinite(val).all() or val.min()<-100 or val.max()>75:raise ValueError('invalid GFS grid')
                    x=np.rint(lon%360*4).astype(int)%1440;y=np.rint((90-lat)*4).astype(int)
                    grid=np.empty((721,1440),dtype='<i2');grid[y,x]=np.rint(val*10).astype('<i2')
                    valid=run+dt.timedelta(hours=hour)
                    return dict(nx=1440,ny=721,step=.25,valid_at=valid.isoformat(),run_at=run.isoformat(),forecast_hour=hour,source='NOAA GFS 0.25 degree, 2 m above ground',data=base64.b64encode(grid.tobytes()).decode())
                finally:codes_release(h)
            except Exception as e:print('GFS cycle unavailable',run,hour,str(e)[:200],flush=True)
    raise RuntimeError('No current NOAA GFS temperature grid available')
p=Path(sys.argv[1]);p.parent.mkdir(parents=True,exist_ok=True)
j=build();p.write_text(json.dumps(j,separators=(',',':')))
print('NOAA_GFS_TEMPERATURE_PASS',j['valid_at'],p.stat().st_size)
