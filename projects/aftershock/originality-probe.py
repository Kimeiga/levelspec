from pathlib import Path
P=Path(__file__).parent
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="970" viewBox="0 0 1680 970"><rect width="1680" height="970" fill="#10212b"/><style>text{font-family:Arial,sans-serif;fill:#e5eee9}.note{font-size:18px;fill:#bccbc9}.sub{font-size:22px;font-weight:700}.tag{font-size:21px;font-weight:700;paint-order:stroke;stroke:#10212b;stroke-width:5px}</style><text x="45" y="52" font-size="32" font-weight="700">AFTERSHOCK / ORIGINALITY PROBE / new spatial organizations</text><text x="45" y="88" class="note">Rejected r01: south T → three parallel fronts → two flank sites → rear CT bar + central overpass.</text>']
for x in [35,590,1145]:s.append(f'<rect x="{x}" y="125" width="500" height="780" rx="12" fill="#192e38" stroke="#48616a"/>')
def path(d,c,w=40,dash=''):
 s.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {dash}/>')
def tag(x,y,t,c='#edf6f0'):
 s.append(f'<text x="{x}" y="{y}" class="tag" fill="{c}">{t}</text>')
def note(x,y,t):s.append(f'<text x="{x}" y="{y}" class="note">{t}</text>')
# Diagonal two-line interchange.
s.append('<text x="60" y="166" class="sub">01 / CROSS-LINE KNOT</text>')
path('M100 500 L190 420 Q290 320 450 250','#bc7969',58)
path('M95 260 Q230 310 310 405 L450 510','#74a8b9',58)
path('M190 420 Q100 350 150 310 L190 300','#d8b66f',22)
path('M380 450 Q450 375 370 320','#d8b66f',22)
s.append('<rect x="250" y="325" width="70" height="70" rx="20" fill="#12212b" stroke="#9a9690" stroke-width="12"/>')
tag(80,552,'T / lower');tag(380,560,'CT / upper');tag(70,225,'A / upper');tag(385,220,'B / lower');tag(222,374,'void')
note(60,625,'Two rail directions, two levels.');note(60,658,'Transfers loop around an offset shaft.');note(60,710,'+ Strong station logic; four distinct arms.');note(60,743,'? Could still reduce to two long corridors.');note(60,795,'Crash loops must create real local choices.');note(60,828,'No traverse through the central crossing.')
# Spiral split objective station.
s.append('<text x="615" y="166" class="sub">02 / BROKEN SPIRAL</text>')
path('M665 470 L725 465 Q680 300 810 280 Q905 270 940 350 L1000 380','#74a8b9',60)
path('M665 470 L730 520 Q830 600 935 510 Q1010 445 960 400','#bc7969',60)
path('M725 465 Q780 420 770 370','#d8b66f',24)
path('M900 490 Q850 420 900 345','#d8b66f',24)
path('M960 400 L1025 435','#74a8b9',42)
s.append('<ellipse cx="825" cy="413" rx="47" ry="66" fill="#10212b" stroke="#73818a" stroke-width="13"/>')
tag(650,427,'T / west');tag(978,485,'CT / east');tag(755,237,'A / upper crescent');tag(807,590,'B / lower collision');tag(787,408,'solid');tag(787,434,'drum')
note(615,655,'Sites wrap above and below a solid drum.');note(615,688,'Stair journeys and local loops intertwine.');note(615,740,'+ Changes site geography and rotation.');note(615,773,'+ Earthquake can sever a former full loop.');note(615,825,'? Prevent the drum becoming a universal hold.');note(615,858,'No all-seeing balcony or endless ring.')
# Fan station.
s.append('<text x="1170" y="166" class="sub">03 / SHATTERED FAN</text>')
path('M1220 430 L1340 430 L1460 285','#bc7969',48)
path('M1340 430 L1515 415','#74a8b9',48)
path('M1340 430 L1450 545 L1570 520','#d8b66f',48)
path('M1275 375 Q1355 275 1460 285','#bc7969',24)
path('M1450 545 Q1550 460 1515 415','#74a8b9',24)
s.append('<rect x="1310" y="405" width="65" height="45" transform="rotate(-25 1340 430)" fill="#4a6069"/>')
tag(1185,485,'T');tag(1480,580,'CT');tag(1420,245,'A');tag(1525,385,'B');tag(1250,530,'scissor wreck')
note(1170,655,'Radial tracks feed an obstructed throat.');note(1170,688,'Terminal loops give bypasses and returns.');note(1170,740,'+ Fan geometry reads as rail infrastructure.');note(1170,773,'? Throat can become one mandatory choke.');note(1170,825,'Need separate pressure without recreating');note(1170,858,'three attacker lanes in a different outline.')
s.append('</svg>')
(P/'originality-probe.svg').write_text(''.join(s))
