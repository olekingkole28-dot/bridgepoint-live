export const JURISDICTIONS=[
  ['AL','Alabama','Birmingham',33.5186,-86.8104],['AK','Alaska','Anchorage',61.2181,-149.9003],
  ['AZ','Arizona','Phoenix',33.4484,-112.0740],['AR','Arkansas','Little Rock',34.7465,-92.2896],
  ['CA','California','Los Angeles',34.0522,-118.2437],['CO','Colorado','Denver',39.7392,-104.9903],
  ['CT','Connecticut','Middletown',41.5623,-72.6506],['DE','Delaware','Wilmington',39.7391,-75.5398],
  ['FL','Florida','Miami',25.7617,-80.1918],['GA','Georgia','Atlanta',33.7490,-84.3880],
  ['HI','Hawaii','Honolulu',21.3069,-157.8583],['ID','Idaho','Boise',43.6150,-116.2023],
  ['IL','Illinois','Chicago',41.8781,-87.6298],['IN','Indiana','Indianapolis',39.7684,-86.1581],
  ['IA','Iowa','Des Moines',41.5868,-93.6250],['KS','Kansas','Wichita',37.6872,-97.3301],
  ['KY','Kentucky','Louisville',38.2527,-85.7585],['LA','Louisiana','New Orleans',29.9511,-90.0715],
  ['ME','Maine','Portland',43.6591,-70.2568],['MD','Maryland','Baltimore',39.2904,-76.6122],
  ['MA','Massachusetts','Boston',42.3601,-71.0589],['MI','Michigan','Detroit',42.3314,-83.0458],
  ['MN','Minnesota','Minneapolis',44.9778,-93.2650],['MS','Mississippi','Jackson',32.2988,-90.1848],
  ['MO','Missouri','St. Louis',38.6270,-90.1994],['MT','Montana','Billings',45.7833,-108.5007],
  ['NE','Nebraska','Omaha',41.2565,-95.9345],['NV','Nevada','Las Vegas',36.1699,-115.1398],
  ['NH','New Hampshire','Manchester',42.9956,-71.4548],['NJ','New Jersey','Newark',40.7357,-74.1724],
  ['NM','New Mexico','Albuquerque',35.0844,-106.6504],['NY','New York','Lower Manhattan',40.7100,-74.0035],
  ['NC','North Carolina','Charlotte',35.2271,-80.8431],['ND','North Dakota','Fargo',46.8772,-96.7898],
  ['OH','Ohio','Columbus',39.9612,-82.9988],['OK','Oklahoma','Oklahoma City',35.4676,-97.5164],
  ['OR','Oregon','Portland',45.5152,-122.6784],['PA','Pennsylvania','Philadelphia',39.9526,-75.1652],
  ['RI','Rhode Island','Providence',41.8240,-71.4128],['SC','South Carolina','Charleston',32.7765,-79.9311],
  ['SD','South Dakota','Sioux Falls',43.5446,-96.7311],['TN','Tennessee','Nashville',36.1627,-86.7816],
  ['TX','Texas','Austin',30.2672,-97.7431],['UT','Utah','Salt Lake City',40.7608,-111.8910],
  ['VT','Vermont','Burlington',44.4759,-73.2121],['VA','Virginia','Richmond',37.5407,-77.4360],
  ['WA','Washington','Seattle',47.6062,-122.3321],['WV','West Virginia','Charleston',38.3498,-81.6326],
  ['WI','Wisconsin','Milwaukee',43.0389,-87.9065],['WY','Wyoming','Cheyenne',41.1400,-104.8202],
  ['DC','District of Columbia','Washington',38.9072,-77.0369],['PR','Puerto Rico','San Juan',18.4655,-66.1057],
  ['VI','U.S. Virgin Islands','Charlotte Amalie',18.3419,-64.9307],['GU','Guam','Hagåtña',13.4443,144.7937],
  ['AS','American Samoa','Pago Pago',-14.2756,-170.7020],['MP','Northern Mariana Islands','Saipan',15.1778,145.7500]
].map(([code,name,place,lat,lon])=>({code,name,place,lat,lon}));

export const BY_CODE=Object.fromEntries(JURISDICTIONS.map(x=>[x.code,x]));

export function currentLocation(search=location.search){
  const p=new URLSearchParams(search);
  const code=(p.get('state')||'NY').toUpperCase();
  const base=BY_CODE[code]||BY_CODE.NY;
  const lat=Number(p.get('lat')),lon=Number(p.get('lon'));
  return{
    ...base,
    lat:Number.isFinite(lat)?lat:base.lat,
    lon:Number.isFinite(lon)?lon:base.lon,
    span:Math.max(.012,Math.min(.055,Number(p.get('span'))||.028))
  };
}

export function travelUrl(code,build='3020'){
  const j=BY_CODE[code]||BY_CODE.NY;
  const u=new URL(location.href);
  u.pathname='/app/horizon-next/';
  u.search='';
  u.searchParams.set('build',build);
  u.searchParams.set('state',j.code);
  u.searchParams.set('lat',String(j.lat));
  u.searchParams.set('lon',String(j.lon));
  return u.pathname+'?'+u.searchParams.toString();
}
