from pathlib import Path
import re
import subprocess

root=Path('site/index.html')
text=root.read_text()

# Every real acquisition CTA goes directly to create-account mode.
pat=re.compile(r'(?P<prefix><a[^>]*href=")(?P<href>/app/\?entry=1[^\"]*)(?P<suffix>"[^>]*data-track="CREATE_ACCOUNT_CLICK"[^>]*>)')
count=0
def create_href(m):
    global count
    href=m.group('href')
    if 'mode=create' not in href:
        href=href.replace('/app/?entry=1','/app/?entry=1&mode=create',1)
    href=href.replace('utm_campaign=national_open','utm_campaign=start_trial_v1071')
    count+=1
    return m.group('prefix')+href+m.group('suffix')
text=pat.sub(create_href,text)
if count != 3:
    raise SystemExit(f'Expected 3 homepage account CTAs, patched {count}')

# Keep signup labels stable; the old localization keys would rewrite them to Open BridgePoint.
def lock_cta(m):
    tag=m.group(0)
    return re.sub(r'\sdata-i="(?:open|openApp)"','',tag)
text=re.sub(r'<a\b[^>]*data-track="CREATE_ACCOUNT_CLICK"[^>]*>',lock_cta,text)
text=text.replace('>Open BridgePoint</a>','>Start free trial</a>')
text=text.replace('>OPEN BRIDGEPOINT</a>','>START 7-DAY FREE TRIAL</a>')

# Explicit returning-user sign in on the same public page.
nav_marker='<select id="language" class="lang" aria-label="Language"></select>'
if 'returning_user_v1071' not in text:
    if nav_marker not in text: raise SystemExit('homepage nav marker missing')
    text=text.replace(nav_marker,nav_marker+'<a href="/app/?entry=1&mode=signin&utm_source=homepage&utm_medium=nav&utm_campaign=returning_user_v1071">Sign in</a>',1)
    hero_watch='<a class="btn secondary" href="#network" data-i="watch">WATCH THE U.S. NETWORK BUILD</a>'
    if hero_watch not in text: raise SystemExit('homepage hero marker missing')
    text=text.replace(hero_watch,'<a class="btn secondary" href="/app/?entry=1&mode=signin&utm_source=homepage&utm_medium=hero&utm_campaign=returning_user_v1071">SIGN IN</a>'+hero_watch,1)
root.write_text(text)

# Bare /app/ is not another marketing page. Logged-out users go directly to sign in.
pre=Path('site/app/preapp-funnel-v1044.js')
s=pre.read_text()
old="async function start(){if(window.__bridgepointEntryRequested)return;const token=findToken();if(await validToken(token))return;mount();}"
new="async function start(){if(window.__bridgepointEntryRequested)return;const token=findToken();if(await validToken(token))return;window.__bridgepointEntryRequested=true;if(window.BridgePointPreAuthLegalV1059?.begin){window.BridgePointPreAuthLegalV1059.begin('signin',null);return;}location.replace('./?entry=1&mode=signin');}"
if old not in s: raise SystemExit('preapp start marker missing')
pre.write_text(s.replace(old,new,1))

# Closing auth while logged out returns to the public page instead of a half-loaded app.
auth=Path('site/app/auth-restoration-v1046.js')
a=auth.read_text()
old="function close(){root?.classList.remove('show');}"
new="function close(){root?.classList.remove('show');let signed=false;try{const raw=localStorage.getItem(STORAGE);if(raw){const x=JSON.parse(raw);signed=!!x?.access_token;}}catch(_){}if(!signed&&location.pathname.startsWith('/app/'))location.href='../';}"
if old not in a: raise SystemExit('auth close marker missing')
auth.write_text(a.replace(old,new,1))

# V1072 signup clarity: replace the easy-to-miss legacy toast with a persistent two-step flow.
clarity_src=Path('deploy/entry-flow-v1071/signup-clarity-v1072.js')
clarity_dst=Path('site/app/signup-clarity-v1072.js')
if not clarity_src.exists(): raise SystemExit('signup clarity source missing')
clarity_dst.write_text(clarity_src.read_text())
subprocess.run(['node','--check',str(clarity_dst)],check=True)
clarity=clarity_dst.read_text()
for marker in ['Two quick steps to activate BridgePoint','Create account & send verification email','Check your email to finish.','SIGNUP_SUBMIT','SIGNUP_SUCCESS','SIGNUP_ERROR','auth\\/v1\\/signup']:
    if marker not in clarity: raise SystemExit(f'signup clarity marker missing: {marker}')

app=Path('site/app/index.html')
app_text=app.read_text()
legacy='  <script defer src="signup-confirmation-v946.js?v=1066"></script>'
modern='  <script defer src="signup-clarity-v1072.js?v=1072"></script>'
if legacy not in app_text: raise SystemExit('legacy signup confirmation script marker missing')
app_text=app_text.replace(legacy,modern,1)
if modern not in app_text or legacy in app_text: raise SystemExit('signup clarity script wiring failed')
app.write_text(app_text)
