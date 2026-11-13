"""Compose review boards from actual native captures and retain local repair overlays."""
from pathlib import Path
import json,base64,html
R=Path(__file__).parent;out=Path('generated/last-light-reboot-c01-boards');out.mkdir(exist_ok=True)
def img(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
views=json.loads((R/'views-c01.json').read_text());available=[]
for v in views:
 p=Path('generated/last-light-reboot-c01-captures')/(v['id']+'.png')
 if not p.exists():p=Path('generated/last-light-reboot-c01-over-under')/(v['id']+'.png')
 if p.exists():available.append((v,p))
for start in range(0,len(available),12):
 body=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1030"><rect width="1600" height="1030" fill="#f7f2e8"/><style>text{font-family:Arial;fill:#203c42;font-size:14px}</style>',f'<text x="20" y="26" style="font-size:22px">Last Light C01 / actual native captures {start+1}–{min(start+12,len(available))}</text>']
 for i,(v,p) in enumerate(available[start:start+12]):
  x=(i%4)*400;y=44+(i//4)*326
  body.append(f'<image href="{img(p)}" x="{x}" y="{y}" width="400" height="300"/>')
  body.append(f'<text x="{x+8}" y="{y+318}">{html.escape(v["id"])}</text>')
 body.append('</svg>');(out/f'board-{start//12+1:02}.svg').write_text('\n'.join(body))
repairs=json.loads((R/'construction-c01.json').read_text())['residueRepairs']
for layer,z0 in [('ground',0),('upper',3.6)]:
 s=(R/f'planning/layout-l02-{layer}.svg').read_text().replace('LAST LIGHT / L02','LAST LIGHT / C01 construction overlay').replace('exact proposal geometry · no compiled acceptance','L02 base + magenta native infill / paths unchanged / compiled independent review pending')
 extra=[]
 for r in repairs:
  if r['z0']!=z0:continue
  x,y,xx,yy=r['bounds'];px=80+x*11.1;py=1260-yy*11.1
  extra.append(f'<rect x="{px}" y="{py}" width="{(xx-x)*11.1}" height="{(yy-y)*11.1}" fill="#d13e83" fill-opacity=".55" stroke="#9d1755" stroke-width="3"/>')
  extra.append(f'<text x="{px+5}" y="{py+17}" style="font-size:13px;fill:#72113e;stroke:#fff;stroke-width:3;paint-order:stroke">{r["id"]}</text>')
 s=s.replace('</svg>','\n'.join(extra)+'\n</svg>');(R/f'planning/construction-c01-{layer}.svg').write_text(s)
print(len(available),'captures composed')
