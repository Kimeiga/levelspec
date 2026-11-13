"""Native AML feasibility study: hollow D-section sector with a full-size work deck."""
from pathlib import Path
from math import sin,cos,pi
from xml.sax.saxutils import quoteattr

def curve(a,b,c,d,count=12):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in range(2)) for t in [i/count for i in range(count)]]

def section():
    return curve((3.25,-2),(3.25,-4.5),(3.7,-4.5),(4.8,-4.5))+curve((4.8,-4.5),(8.2,-4.5),(9.7,-1.8),(9.7,1.2))+curve((9.7,1.2),(9.7,4.2),(8.2,6.9),(4.8,6.9))+curve((4.8,6.9),(3.7,6.9),(3.25,6.9),(3.25,4))+[(3.25,4)]

def sector_mesh(start,end):
    outer=section();inner=[(6.475+(r-6.475)*.86,1.2+(z-1.2)*.92) for r,z in outer];n=len(outer);steps=round((end-start)/2.5);verts=[];tris=[]
    for i in range(steps+1):
        a=(start+(end-start)*i/steps)*pi/180
        verts.extend((r*cos(a),r*sin(a),z) for ring in [outer,inner] for r,z in ring)
    def quad(a,b,c,d,reverse=False):
        faces=[(a,b,c),(a,c,d)];tris.extend(tuple(reversed(t)) if reverse else t for t in faces)
    for i in range(steps):
        for j in range(n):
            k=(j+1)%n
            for off,rev in [(0,False),(n,True)]:quad(i*2*n+off+j,(i+1)*2*n+off+j,(i+1)*2*n+off+k,i*2*n+off+k,rev)
    for i,rev in [(0,True),(steps,False)]:
        for j in range(n):
            k=(j+1)%n;quad(i*2*n+j,i*2*n+n+j,i*2*n+n+k,i*2*n+k,rev)
    return verts,tris

def data(rows):return '; '.join(' '.join(str(round(x,6)) for x in row) for row in rows)
verts,tris=sector_mesh(0,200)
ring=[(8.8*cos(i*pi/36),8.8*sin(i*pi/36)) for i in range(72)];hole=[(4.1*cos(-i*pi/36),4.1*sin(-i*pi/36)) for i in range(72)]
s=f'''<architecture version="1" id="fusion-reactor-study" validation="premap">
<material id="steel" color="#9aadb6" metalness="0.45" roughness="0.4"/>
<material id="deck" color="#c99f4d"/>
<subtract id="vessel" material="steel"><faceted-solid id="d-shell" points={quoteattr(data(verts))} triangles={quoteattr(data(tris))}/><box id="east-port-cut" position="8 -1.8 -0.4" width="4" depth="3.6" height="3.8"/><box id="west-port-cut" position="-12 -1.8 -0.4" width="4" depth="3.6" height="3.8"/></subtract>
<profile id="deck-profile" points={quoteattr(data(ring))}><hole points={quoteattr(data(hole))}/></profile>
<slab id="work-deck" profile="deck-profile" thickness="0.3" material="deck"/>
<player radius="0.35" height="1.8" crouch="1.1" step="0.3" slope="42"/>
<marker id="south" kind="spawn" element="work-deck" position="0 -6.5 0"/>
<marker id="north" kind="objective" element="work-deck" position="0 6.5 0"/>
<route id="inside-ring" from="south" to="north" max-distance="30" min-routes="1"/>
</architecture>'''
Path(__file__).with_suffix('.aml').write_text(s)
