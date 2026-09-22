"""Create original, deterministic seamless material images. No external assets."""
from pathlib import Path
import random, struct, zlib, math
root=Path(__file__).resolve().parents[1]/'website/assets/textures';root.mkdir(parents=True,exist_ok=True)
def png(name,fn,size=256):
 r=random.Random(17);rows=[]
 for y in range(size):
  row=bytearray([0])
  for x in range(size):
   v=max(0,min(255,round(fn(x/size,y/size,r))))
   row.extend([v,v,v])
  rows.append(bytes(row))
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
 (root/(name+'.png')).write_bytes(data)
def plaster(x,y,r):return 230+r.uniform(-6,6)+3*math.sin(x*math.tau*5)*math.sin(y*math.tau*5)
def brick(x,y,r):
 row=int(y*8);u=(x*4+(row%2)*.5)%1;v=y*8%1
 return (159 if min(u,1-u)<.012 or min(v,1-v)<.045 else 227+8*math.sin(int(x*4+(row%2)*.5)*17+row*31))+r.uniform(-7,7)
def paving(x,y,r):
 u=x*4%1;v=y*4%1
 return (146 if min(u,1-u,v,1-v)<.013 else 223+6*math.sin(int(x*4)*17+int(y*4)*5))+r.uniform(-3,3)
def tile(x,y,r):
 u=x*6%1;v=y*6%1
 return (159 if min(u,1-u,v,1-v)<.025 else 225+12*math.sin(int(x*6)*8+int(y*6)*3))+r.uniform(-2,2)
def wood(x,y,r):
 u=x*5%1
 return (125 if min(u,1-u)<.012 else 215+6*math.sin(x*math.tau*65+3*math.sin(y*math.tau*2))+3*math.sin(y*math.tau*5))+r.uniform(-4,4)
for name,fn in [('plaster',plaster),('stone',lambda x,y,r:plaster(x,y,r)+6),('brick',brick),('paving',paving),('tile',tile),('wood',wood)]:png(name,fn)
print('Original textures written')
