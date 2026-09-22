"""Original deterministic, mip-friendly texture collections for three authored worlds."""
from pathlib import Path
import math, struct, zlib
ROOT=Path(__file__).resolve().parents[1]/'website/assets/textures'
ROOT.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def noise(x,y): return (((x*73856093)^(y*19349663))%101)/100-.5

def tex(style,kind,x,y):
    grain=noise(int(x*256),int(y*256))*3
    v=(244 if style=="chalk" else 234)+3*math.sin(x*TAU*(3 if style=="chalk" else 5))*math.sin(y*TAU*4)+grain
    color=None
    if kind in ('travertine','limestone','basalt'):
        rows=3 if kind=="limestone" else 5;row=int(y*rows);u=(x*3+(row%2)*.5)%1;t=y*rows%1
        v=161 if min(u,1-u)<.009 or min(t,1-t)<.018 else 227+5*math.sin(y*TAU*33+2*math.sin(x*TAU*2))+grain
        if kind=='basalt': v-=15;v+=9*math.sin(int(x*3)*9+row*15)
    elif kind=='terracotta':
        rows=6 if style=="chalk" else 4;row=int(y*rows);u=(x*4+.5*(row%2))%1;t=y*rows%1
        v=169 if min(u,1-u,t,1-t)<.014 else 230+10*math.sin(row*5+int(x*4)*12)+grain
    elif kind in ('cedar','oak','charred'):
        u=x*(3 if kind=="oak" else 5)%1;v=145 if min(u,1-u)<.008 else 229+6*math.sin(x*TAU*51+2*math.sin(y*TAU))+grain
        if kind=='charred': v-=25;v+=8*math.sin(y*TAU*3)
    elif kind in ('brass','copper'):
        v=235+5*math.sin(y*TAU*90)+grain
        if kind=='copper':
            p=math.sin(x*TAU*3)*math.cos(y*TAU*4)+.2*math.sin(y*TAU*9)
            if p>.48:color=(145,190,174)
    elif kind in ('azulejo','zellige','mosaic'):
        u=x*4%1;t=y*4%1;dx=abs(u-.5);dy=abs(t-.5)
        if min(u,1-u,t,1-t)<.014:v=161
        elif kind=='azulejo':
            mark=(.18<dx+dy<.3) or (dx<.047 or dy<.047) and max(dx,dy)>.32
            color=(60,103,170) if mark else (247,244,228)
        elif kind=='mosaic':
            color=(196,218,183) if dx+dy<.32 else (237,241,217)
        else:v=228+14*math.sin(int(x*4)*12+int(y*4)*5)+grain
    elif kind=='concrete':
        u=x*2%1;t=y*2%1
        v=183 if min(u,1-u,t,1-t)<.007 else 232+5*math.sin(x*TAU*3)*math.sin(y*TAU*2)+grain
        if min(math.hypot(u-a,t-b) for a in [.1,.9] for b in [.1,.9])<.019:v=133
    elif kind=='steel':
        u=(x+y)*8%1;t=(x-y)*8%1
        v=229+(14 if min(u,1-u)<.05 or min(t,1-t)<.05 else 0)+grain
    elif kind=='grid':
        u=x*7%1;t=y*7%1
        v=161 if .12<u<.88 and .12<t<.88 else 235
    if color is None:color=(v,v,v)
    return tuple(max(0,min(255,round(c))) for c in color)

def write(name,style,kind):
    size=256;data=b''.join(b'\0'+b''.join(bytes(tex(style,kind,x/size,y/size)) for x in range(size)) for y in range(size))
    def chunk(k,d):return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(data,9))+chunk(b'IEND',b'')
    (ROOT/(name+'.png')).write_bytes(png)
collections={'clay':['limewash','travertine','terracotta','zellige','cedar','brass'],'chalk':['limewash','limestone','terracotta','azulejo','oak','mosaic'],'night':['concrete','basalt','steel','grid','charred','copper']}
for style,kinds in collections.items():
    for kind in kinds:write(style+'-'+kind,style,kind)
print('Wrote 18 original material images.')
