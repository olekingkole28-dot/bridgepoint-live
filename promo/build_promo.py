import os, subprocess, json, math, random, wave, struct, shlex
from pathlib import Path

ROOT=Path(os.environ.get("OUT_DIR","promo-work"))
OUT=Path(os.environ.get("FINAL_DIR","promo-output"))
OUT.mkdir(parents=True,exist_ok=True)
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

clips=[
("01-globe","THIS ISN'T A NORMAL MAP","A live 3D intelligence world"),
("02-weather-3d","LIVE WEATHER ON A 3D EARTH","Radar + hazards stay spatial as the map tilts"),
("03-city-3d","GLOBE → CITY → BUILDING","Zoom from Earth scale into real 3D structures"),
("04-free-tools","FREE PREMIUM TOOLS","Built directly into the same BridgePoint world"),
("05-flight-sim","FLIGHT SIMULATOR","Fly the globe with the live map still underneath"),
("06-road-drive","ROAD DRIVE","3D roads · live weather · MPH · nearby fire distance"),
("07-scenario-lab","SCENARIO LAB","Wildfire · hurricane · flood · quake · volcano + more"),
("08-weather-time","WEATHER TIME","Scrub current source timestamps across the map"),
("09-3d-wind","3D WIND","Tilt the weather context instead of flattening it"),
("10-space-weather","NOAA SPACE WEATHER","SWPC context on the BridgePoint globe"),
("11-source-gated","NO FAKE 'LIVE' DATA","Aircraft · satellites · cameras stay source-gated when needed"),
("12-space-view","EARTH → SOLAR SYSTEM","Sun-centered orbital view, then zoom back to Earth"),
("13-outro","BRIDGEPOINT INTELLIGENCE","bridgepointintelligence.online"),
]
positions={
"01-globe":"top","02-weather-3d":"top","03-city-3d":"top","04-free-tools":"bottom",
"05-flight-sim":"bottom","06-road-drive":"top","07-scenario-lab":"top","08-weather-time":"bottom",
"09-3d-wind":"bottom","10-space-weather":"bottom","11-source-gated":"bottom","12-space-view":"top","13-outro":"top"
}
transitions=["fade","smoothleft","fadeblack","wipeup","fade","smoothright","fadeblack","wipedown","fade","circleopen","fadeblack","smoothleft"]

# Keep the final social cut tight even when live source-gated tools take longer to respond.
MAX_DURATIONS={
"01-globe":5.2,"02-weather-3d":5.8,"03-city-3d":7.2,"04-free-tools":4.4,
"05-flight-sim":5.9,"06-road-drive":8.2,"07-scenario-lab":5.6,"08-weather-time":4.8,
"09-3d-wind":3.8,"10-space-weather":4.4,"11-source-gated":5.8,"12-space-view":7.2,"13-outro":3.6
}

def run(cmd):
    print("+"," ".join(shlex.quote(str(x)) for x in cmd))
    subprocess.run([str(x) for x in cmd],check=True)

def probe(p):
    r=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(p)],capture_output=True,text=True,check=True)
    return float(r.stdout.strip())

def esc(t):
    return t.replace("\\","\\\\").replace(":","\\:").replace("'","\\'").replace("%","\\%").replace(",","\\,")

# The live browser shoot intentionally ends after the expensive space renderer. Build the brand close in post.
outro_src=ROOT/"13-outro.mp4"
if not outro_src.exists():
    logo=Path("rebuild-v5000/bridgepoint-favicon-48.png")
    vf=(
      "scale=1080:1920,"
      "drawbox=x=0:y=0:w=iw:h=ih:color=0x030910:t=fill,"
      "drawbox=x=88:y=730:w=904:h=5:color=0x55E6FF@0.9:t=fill,"
      "drawtext=fontfile="+FONT+":text='BRIDGEPOINT INTELLIGENCE':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=790,"
      "drawtext=fontfile="+FONT_REG+":text='THE WORLD. LIVE. IN 3D.':fontsize=36:fontcolor=0x9CEEFF:x=(w-text_w)/2:y=900,"
      "drawtext=fontfile="+FONT_REG+":text='bridgepointintelligence.online':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=1010,"
      "fade=t=in:st=0:d=.25,fade=t=out:st=3.25:d=.35,format=yuv420p"
    )
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","lavfi","-i","color=c=0x030910:s=1080x1920:r=30:d=3.6","-vf",vf,"-an","-c:v","libx264","-preset","veryfast","-crf","18","-movflags","+faststart",outro_src])

norm=[]
dur=[]
for name,title,sub in clips:
    src=ROOT/(name+".mp4")
    if not src.exists():
        print("SKIP missing",src);continue
    source_d=probe(src)
    d=min(source_d,MAX_DURATIONS.get(name,source_d))
    pos=positions.get(name,"top")
    y1="95" if pos=="top" else "h-360"
    y2="165" if pos=="top" else "h-285"
    box_y="55" if pos=="top" else "h-405"
    vf=(
      "scale=1080:1920:force_original_aspect_ratio=decrease,"
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,"
      "eq=contrast=1.07:saturation=1.10:brightness=-0.005,"
      "drawbox=x=34:y="+box_y+":w=1012:h=205:color=black@0.48:t=fill,"
      "drawbox=x=34:y="+box_y+":w=8:h=205:color=0x55E6FF@0.95:t=fill,"
      "drawtext=fontfile="+FONT+":text='"+esc(title)+"':fontsize=52:fontcolor=white:x=70:y="+y1+":shadowcolor=black@0.8:shadowx=2:shadowy=2,"
      "drawtext=fontfile="+FONT_REG+":text='"+esc(sub)+"':fontsize=27:fontcolor=0xBFEAF5:x=72:y="+y2+":shadowcolor=black@0.9:shadowx=2:shadowy=2,"
      "drawtext=fontfile="+FONT+":text='BRIDGEPOINT INTELLIGENCE':fontsize=22:fontcolor=0x9CEEFF@0.92:x=44:y=h-74:shadowcolor=black@0.8:shadowx=2:shadowy=2,"
      "fade=t=in:st=0:d=0.12,fade=t=out:st="+str(max(.1,d-.12))+":d=0.12,format=yuv420p"
    )
    dst=ROOT/(name+"-norm.mp4")
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",src,"-t",f"{d:.3f}","-vf",vf,"-an","-c:v","libx264","-preset","veryfast","-crf","18","-movflags","+faststart",dst])
    norm.append(dst);dur.append(probe(dst))

if len(norm)<6:
    raise SystemExit("Too few promo clips were captured: "+str(len(norm)))

# Xfade every clip into one continuous social cut.
inputs=[]
for p in norm: inputs += ["-i",str(p)]
filter_parts=[]
for i in range(len(norm)):
    filter_parts.append("["+str(i)+":v]settb=AVTB,fps=30[v"+str(i)+"]")
cur="v0";elapsed=dur[0];td=.22
for i in range(1,len(norm)):
    out="x"+str(i)
    off=max(.01,elapsed-td*i)
    tr=transitions[(i-1)%len(transitions)]
    filter_parts.append("["+cur+"][v"+str(i)+"]xfade=transition="+tr+":duration="+str(td)+":offset="+f"{off:.3f}"+"["+out+"]")
    cur=out
    elapsed += dur[i]

silent=ROOT/"bridgepoint-promo-silent.mp4"
run(["ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,"-filter_complex",";".join(filter_parts),"-map","["+cur+"]","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",silent])
total=probe(silent)

# Original intense electronic soundtrack + transition FX. Purely synthesized here.
sr=48000
random.seed(5539)
music=ROOT/"bridgepoint-original-intense.wav"
beat=60.0/128.0
starts=[]
acc=0.0
for i,d in enumerate(dur):
    if i: acc -= td
    starts.append(acc)
    acc += d
risers=starts[1:]

with wave.open(str(music),"wb") as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
    chunk=4096
    total_n=int((total+.25)*sr)
    for base in range(0,total_n,chunk):
        n=min(chunk,total_n-base);buf=bytearray()
        for j in range(n):
            i=base+j;t=i/sr
            bidx=int(t/beat)
            phase=t-bidx*beat
            chord=[55.0,65.406,82.407,73.416][(bidx//4)%4]
            side=0.38+0.62*min(1.0,phase/0.12)
            bass=(math.sin(2*math.pi*chord*t)+0.32*math.sin(2*math.pi*chord*2*t))*0.12*side
            arp_notes=[220.0,261.626,329.628,392.0,329.628,261.626,246.942,329.628]
            af=arp_notes[(int(t/(beat/2)))%len(arp_notes)]
            arp=(math.sin(2*math.pi*af*t)+0.28*math.sin(2*math.pi*af*2*t))*0.045*(0.55+0.45*math.sin(2*math.pi*t/beat)**2)
            kick=0.0
            if phase<0.16:
                env=math.exp(-24*phase)
                f=72-34*(phase/.16)
                kick=0.30*env*math.sin(2*math.pi*f*phase)
            half=beat/2
            hp=t%half
            hat=0.0
            if hp<0.045:
                noise=(random.random()*2-1)
                hat=0.055*math.exp(-55*hp)*noise
            sn=0.0
            beatnum=bidx%4
            if beatnum in (1,3) and phase<0.12:
                noise=(random.random()*2-1)
                sn=0.13*math.exp(-28*phase)*noise+0.05*math.exp(-24*phase)*math.sin(2*math.pi*175*phase)
            fx=0.0
            for st in risers:
                dt=t-st
                if -0.52<dt<0:
                    u=(dt+.52)/.52
                    fx+=0.035*u*(random.random()*2-1)+0.035*u*math.sin(2*math.pi*(330+900*u)*t)
                if 0<=dt<0.18:
                    fx+=0.22*math.exp(-18*dt)*math.sin(2*math.pi*48*dt)+0.035*math.exp(-24*dt)*(random.random()*2-1)
            intro=min(1,t/1.0); outro=min(1,max(0,total-t)/1.2)
            val=(bass+arp+kick+sn+hat+fx)*intro*outro
            val=max(-0.95,min(0.95,val))
            l=int(val*32767);r=int(val*32767*(0.985+0.015*math.sin(2*math.pi*.21*t)))
            buf+=struct.pack("<hh",l,r)
        w.writeframes(buf)

final=OUT/"BridgePoint_Intelligence_Viral_Promo_9x16.mp4"
run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",silent,"-i",music,
     "-filter_complex","[1:a]volume=0.78,highpass=f=34,lowpass=f=15500,alimiter=limit=0.92[a]",
     "-map","0:v:0","-map","[a]","-c:v","libx264","-preset","medium","-crf","21","-maxrate","9M","-bufsize","18M","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",final])

thumb=OUT/"BridgePoint_Intelligence_Viral_Promo_Thumbnail.jpg"
run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss","1.25","-i",final,"-frames:v","1","-q:v","2",thumb])

report={"duration":probe(final),"resolution":"1080x1920","format":"H.264/AAC MP4","clips":[p.name for p in norm],"source":"Live BridgePoint production screen capture","music":"Original synthesized intense electronic score","final":str(final)}
(OUT/"promo_report.json").write_text(json.dumps(report,indent=2))
print("PROMO_BUILD_COMPLETE",json.dumps(report))
