from pathlib import Path
import xml.etree.ElementTree as E
P=Path(__file__).parent
# First spatial proposal. Coordinates remain Z-up meters in the authored packet.
rooms=[('A · FORMER ANCHOR',[(4,4),(20,4),(20,20),(4,20)],0),('SOUTH PROMENADE',[(20,8),(36,8),(36,24),(28,24),(28,20),(20,20)],0),('WEST ARCADE',[(4,20),(20,20),(20,32),(28,32),(28,48),(4,48)],0),('FOUNTAIN COURT',[(34,24),(46,24),(52,30),(52,42),(46,48),(34,48),(28,42),(28,30)],0),('NORTH PROMENADE',[(44,48),(52,48),(52,52),(60,52),(60,64),(44,64)],0),('EAST CINEMA',[(60,24),(76,24),(76,52),(60,52),(60,40),(52,40),(52,24)],0),('B · FORMER ANCHOR',[(60,52),(76,52),(76,68),(60,68)],0),('WEST FOOD LOFT',[(16,34),(28,34),(28,44),(16,44)],3),('EAST PROJECTION LOFT',[(52,28),(64,28),(64,38),(52,38)],3)]
# Open shared boundaries are invitations to circulate, not tiny symbolic doors.
s=9; ox=70; oy=715
p=lambda q:f'{ox+q[0]*s},{oy-q[1]*s}'
a=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="850" viewBox="0 0 1000 850">','<rect width="1000" height="850" fill="#f4f0e6"/>','<style>text{font-family:Arial;fill:#26373a}.room{stroke:#46595b;stroke-width:2;fill:#dfd9c9}.loft{stroke:#914b62;stroke-width:2;fill:#d6b6c3;fill-opacity:.85}</style>','<text x="65" y="38" font-size="27" font-weight="bold">LAST LIGHT GALLERIA</text>','<text x="65" y="63" font-size="15">S01 · Dead mall · 5v5 hero shooter · provisional control-point mode · meters / +Y north</text>']
for name,poly,z in rooms:
 a.append(f'<polygon class="{"loft" if z else "room"}" points="{" ".join(map(p,poly))}"/>')
 cx=sum(x for x,y in poly)/len(poly); cy=sum(y for x,y in poly)/len(poly)
 a.append(f'<text x="{ox+cx*s}" y="{oy-cy*s}" text-anchor="middle" font-size="12">{name}<tspan x="{ox+cx*s}" dy="15">+{z} m</tspan></text>')
for x,y,name in [(12,12,'A SPAWN'),(68,60,'B SPAWN'),(40,36,'CONTROL')]:
 a.append(f'<circle cx="{ox+x*s}" cy="{oy-y*s}" r="30" fill="none" stroke="#c57d38" stroke-width="3"/><text x="{ox+x*s}" y="{oy-y*s+4}" font-size="11" text-anchor="middle">{name}</text>')
# Transfers have real footprints; stairs rise toward the arrow.
for poly in [[(10,22),(16,22),(16,34),(10,34)],[(64,38),(70,38),(70,50),(64,50)]]:
 a.append(f'<polygon points="{" ".join(map(p,poly))}" fill="#a6b8bb" stroke="#46595b"/>')
for x,y,t in [(13,28,'↑ +3'),(67,44,'↓ +3')]:a.append(f'<text x="{ox+x*s}" y="{oy-y*s}" text-anchor="middle" font-size="12">{t}</text>')
for x,y,w,h in [(38.5,33,3,6),(22,12,5,3),(53,57,5,3)]:a.append(f'<rect x="{ox+x*s}" y="{oy-(y+h)*s}" width="{w*s}" height="{h*s}" fill="#6e7974"/>')
a += ['<text x="800" y="150" font-size="14">N ↑</text>','<text x="800" y="205" font-size="13">Ground court</text>','<text x="800" y="225" font-size="13">Four oblique mouths</text>','<text x="800" y="260" font-size="13">Two local lofts</text>','<text x="800" y="280" font-size="13">No overhead bridge</text>','<text x="800" y="315" font-size="13">Sealed stores between</text>','<text x="800" y="335" font-size="13">the occupied wings</text>','<text x="65" y="790" font-size="15">Connections are full shared edges in this rough proposal. Open-top cutaway; unshaded voids become sealed retail masses.</text>','<text x="65" y="815" font-size="15">Assumption: all essential routes walkable; mobility adds choices. Loft access and exposure develop after first review.</text>','</svg>']
(P/'sketch.svg').write_text('\n'.join(a))
