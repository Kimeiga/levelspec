from pathlib import Path
import json,math,importlib.util
s=importlib.util.spec_from_file_location('v','projects/galini-reboot/planning/draw-l02.py');v=importlib.util.module_from_spec(s);s.loader.exec_module(v);d=v.d
body=''
for i,w in enumerate(d['windows']):
 y=160+i*355;x=65;scale=22
 o=w['observer'];t=w['target'];lo=t[2];distance=math.dist(o[:2],t[:2])
 # Both current eye rays have constant X or a horizontal wall at y63.
 wy=87.65 if w['id']=='W02' else 63
 fraction=(o[1]-wy)/(o[1]-t[1]);wallDistance=distance*fraction
 z0=o[2]+1.674;z1=t[2]+1.674;ray=z0+(z1-z0)*fraction;cr=o[2]+1.023+(z1-o[2]-1.023)*fraction
 px=lambda a:x+a*scale;py=lambda z:y+220-(z-lo)*scale
 body+=f'<text x="65" y="{y-45}" font-size="22" font-weight="700" fill="#294b55">{w["id"]} / {w["name"]}</text>'
 body+=f'<path d="M{px(-1)},{py(o[2])} H{px(wallDistance)} M{px(distance-1)},{py(t[2])} H{px(distance+1)}" stroke="#315c65" stroke-width="4" fill="none"/>'
 body+=f'<path d="M{px(wallDistance)},{py(o[2])} V{py(o[2]+w["sill"])} M{px(wallDistance)},{py(o[2]+w["head"])} V{py(o[2]+w["wallHeight"])}" stroke="#315c65" stroke-width="10" fill="none"/>'
 body+=f'<path d="M{px(0)},{py(z0)} L{px(distance)},{py(z1)}" stroke="#a34e70" stroke-width="2" fill="none"/><path d="M{px(0)},{py(o[2]+1.023)} L{px(distance)},{py(z1)}" stroke="#537f9c" stroke-width="2" stroke-dasharray="5 3" fill="none"/>'
 body+=v.wrap(f'Observer {o}; opponent {t}. Standing eye crosses the aperture at world Z {ray:.3f}; upper crouched eye at {cr:.3f}. Sill {o[2]+w["sill"]:.2f}; head {o[2]+w["head"]:.2f}; opaque screen top {o[2]+w["wallHeight"]:.2f}.',860,y+5,68,15)
 body+=v.wrap('The selected standing ray lies within the aperture and is reciprocal; the crouched observer ray lies below the sill. This is an analytic point-ray prediction, not proof of body visibility, camera placement, ballistics or safe occupation. The opening is not traversable.',860,y+135,68,14)
 body+=v.wrap('Purple: standing eye-to-eye. Blue dashed: upper crouched eye. Coordinate planes and wall thickness must survive AML; then capture both stances and the neighboring cover/guard from both sides.',65,y+268,165,13)
(v.out/'information-sections.svg').write_text(v.base(1500,930,'GALINI / L02 / coordinate observation sections','Positive information with explicit floor, sill, head and observer heights / predictions only',body))
body=''
for i,(name,start,end,z,thick,piers) in enumerate([('BR-M / market bridge',50,78,4,.6,[58,70]),('BR-U / bent civic bridge',54,76,8,.7,[61,70])]):
 x=95;y=155+i*380;scale=21;px=lambda q:x+(q-start)*scale;py=lambda h:y+300-(h+6)*scale
 body+=f'<text x="65" y="{y-45}" font-size="22" font-weight="700" fill="#294b55">{name}</text><path d="M{px(start)},{py(z)} H{px(end)} V{py(z-thick)} H{px(start)} Z" fill="#9a9c87" stroke="#486b72" stroke-width="1.5"/>'
 for p in piers:body+=f'<rect x="{px(p-1)}" y="{py(z-thick)}" width="{2*scale}" height="{(z-thick+6)*scale}" fill="#b9ae94" stroke="#8c8b76"/>'
 body+=f'<path d="M{px(start-3)},{py(-6)} L{px(start-3)},{py(z)} H{px(start)} V{py(-6)} M{px(end)},{py(-6)} V{py(z)} H{px(end+3)} V{py(-6)}" fill="#b4ac93" stroke="#7c8272"/><line x1="{px(start-4)}" y1="{py(-6)}" x2="{px(end+4)}" y2="{py(-6)}" stroke="#6b827d" stroke-width="2"/>'
 body+=v.wrap(f'Floor +{z}; deck thickness {thick:.2f}; scenic bed -6. Full rock-bank abutments at both ends; two masonry pier assemblies at X {piers}. Clear floor width is 6 m, with .35 m external parapets. The upper path bends in plan; this is its east-west coordinate projection, not a false straight-route claim.',900,y-5,62,14)
 body+=v.wrap('Continuous masonry arch/abutment language comes from the inspected real bridge photo. Arch soffit shaping and decorative relieving arches remain architectural modeling choices. The declared supports reserve real volume and cannot be omitted in AML; no engineering capacity is inferred.',900,y+160,62,14)
body+=v.wrap('All bridge ground is inaccessible scenery. Neither bridge lies over another playable floor. Upper south screen is 2.4 m except W02; other bridge edge guards are 1.1 m. Roof-on and opposite-bank compiled captures must verify complete supports and enclosure.',48,915,175,13)
(v.out/'bridge-sections.svg').write_text(v.base(1500,990,'GALINI / L02 / bridge construction coordinate sections','Reserved supports, abutments and deck thickness / no structural engineering or compiled acceptance',body))
print('Wrote coordinate information and bridge-support sections.')
