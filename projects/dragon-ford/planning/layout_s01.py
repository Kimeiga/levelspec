"""S01 candidate A — "Stepped Yamen". Provisional spatial sketch, not a production layout."""
from pathlib import Path
import sys; sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from pipeline import Layout, rect, H
import json, sys
Z0, ZM, Z1, Z2 = 0.0, 1.7, 3.4, 6.8
L = Layout('dragon-ford', 'Dragon Ford', 'S01-A', rect(0, 0, 100, 92))
# --- south apron and the low (z=0) city --------------------------------------
L.space('T_APRON', rect(24, 2, 78, 10), Z0, 'spawn', 'Sai Tau apron|(T spawn, squatter sheds)', sky=True)
L.space('W_SLOT', rect(24, 10, 27.5, 22), Z0, 'alley', 'West slot')
L.space('GATE', rect(48, 10, 52, 18), Z0, 'alley', 'South Gate|tunnel')
L.space('E_SLOT', rect(72, 10, 75.5, 25), Z0, 'alley', 'East slot')
L.space('CANNON', rect(38, 18, 62, 30), Z0, 'court', 'Cannon Court|(gate ruin stumps)', sky=True)
L.space('SPINE_W', rect(14, 22, 38, 25.5), Z0, 'alley', 'Lung Chun Road W (tunnel)')
L.space('SPINE_E', rect(62, 25, 84, 28.5), Z0, 'alley', 'Lung Chun Road E (tunnel)')
L.space('STEP_LO', rect(14, 25.5, 17.5, 36), Z0, 'alley', 'Sai Shing|Lane')
L.stair('SL1', (15.75, 36), (15.75, 42.8), Z0, Z1, 3.5, 'Sai Shing steps')
L.space('STEP_HI', rect(14, 42.8, 17.5, 54), Z1, 'alley', 'Sai Shing|upper')
L.space('ARCADE', rect(29, 25.5, 33, 40), Z0, 'hall', 'Free School|arcade')
L.portal('WINGPASS', rect(33, 33, 38, 36), Z0)
L.stair('SW1', (30.2, 40), (30.2, 46.8), Z0, Z1, 2.4, 'School stair')
# --- the Yamen: a compound stepping up the slope inside the sky void ----------
L.door('YGATE', rect(48, 30, 52, 31), Z0, sky=True)
L.space('Y_FRONT', rect(38, 31, 62, 40), Z0, 'court', 'Yamen front court', sky=True)
L.stair('SY1', (50, 40), (50, 43.4), Z0, ZM, 5, 'Hall steps', sky=True)
L.space('Y_MID', rect(38, 43.4, 62, 54), ZM, 'court', 'Yamen middle hall + court|(open pavilion, spirit screen)', sky=True)
L.stair('SY2a', (39.5, 54), (39.5, 57.4), ZM, Z1, 3, 'West wing steps', sky=True)
L.stair('SY2b', (60.5, 54), (60.5, 57.4), ZM, Z1, 3, 'East wing steps', sky=True)
L.space('Y_REAR', [[38,57.4],[41,57.4],[41,54],[59,54],[59,57.4],[62,57.4],[62,63],[38,63]], Z1, 'court', 'Rear hall terrace', sky=True)
L.door('WINGDOOR', rect(62, 34, 64, 37), Z0)
L.space('E_WING', rect(64, 31, 70, 47), Z0, 'room', "Old People's|wing")
L.door('WING_S', rect(66, 28.5, 69, 31), Z0)
L.door('WING_N', rect(66.5, 47, 69.5, 50), Z0)
# --- east: factory street and Bombsite B (double-height works) ----------------
L.space('KWONG', rect(80.5, 28.5, 84, 50), Z0, 'alley', 'Kwong Ming|Street|(factories)')
L.space('B_FLOOR', rect(66, 50, 90, 70), Z0, 'site', 'B — Noodle Works floor|(double height)', ceil=Z2, label_at=(80, 58))
L.space('B_MEZZ_N', rect(66, 65, 90, 70), Z1, 'gallery', 'B mezzanine')
L.space('B_MEZZ_W', rect(66, 54, 70.5, 65), Z1, 'gallery', 'mezz')
L.stair('SB', (72, 58.2), (72, 65), Z0, Z1, 2.4, 'Works stair')
L.guard('G_BN', (73.2, 65), (90, 65), Z1); L.guard('G_BW', (70.5, 54), (70.5, 65), Z1); L.guard('G_BS', (66, 54), (70.5, 54), Z1)
L.space('NL_E', rect(62, 58.5, 66, 62), Z1, 'alley', 'N.Lane E')
L.space('NE_LANE', rect(76, 70, 79.5, 82), Z1, 'alley', 'NE lane')
# --- north (z=3.4): street frontage, lanes, Bombsite A -------------------------
L.space('CT_STREET', rect(26, 82, 80, 90), Z1, 'spawn', 'Tung Tau frontage (CT spawn, dentist arcade)', sky=True)
L.space('N_LANE', rect(48, 63, 51.5, 82), Z1, 'alley', 'Youth|Centre|lane')
L.space('NW_LANE', rect(20, 72, 23.5, 82), Z1, 'alley', 'NW lane')
L.space('A_COURT', rect(8, 54, 26, 72), Z1, 'site', 'A — Tin Hau temple court|(hemmed sky slot, debris net)', sky=True)
L.space('NL_W', rect(26, 60, 38, 63.5), Z1, 'alley', 'North Lane W')
L.space('GALLERY', rect(29, 46.8, 36, 60), Z1, 'gallery', 'Free School|gallery')
L.window('GW1', rect(36, 47.5, 38, 51.5), Z1); L.window('GW2', rect(36, 54, 38, 57), Z1)
# --- roofs (z=6.8) -------------------------------------------------------------
L.space('RLAND', rect(26.3, 58.5, 28.7, 60), Z1, 'landing', '')
L.stair('SW2', (27.5, 58.5), (27.5, 51.7), Z1, Z2, 2.4, 'Roof stair', sky=True)
L.space('SCHOOL_ROOF', rect(26.3, 38, 38, 51.7), Z2, 'roof', 'School roof', sky=True)
L.space('PIGEON', rect(5.6, 44, 26.3, 51.7), Z2, 'roof', 'Pigeon roof', sky=True)
L.guard('G_SR', (38, 38), (38, 51.7), Z2)
L.window('RW_A', rect(10, 51.7, 24, 54), Z2, sill=1.1, head=None, sky=True)
L.stair('SR', (6.8, 51.7), (6.8, 58.5), Z2, Z1, 2.4, 'Temple roof stair', sky=True)
L.space('ALAND', rect(5.6, 58.5, 8, 61), Z1, 'landing', '', sky=True)
L.guard('G_YR', (41, 54), (59, 54), Z1)
L.anchor('T', (50, 6, Z0), 'attacker_spawn'); L.anchor('CT', (52, 86, Z1), 'defender_spawn')
L.anchor('A', (15, 64, Z1), 'objective'); L.anchor('B', (82, 57, Z0), 'objective')
if __name__ == '__main__':
    out = Path(__file__).parent / 'planning' / 's01-a'
    L.write_drawings(out, [(0, 'storey 0 (z 0–3.4): low city, Yamen front'), (1, 'storey 1 (z 3.4–6.8): north grade, galleries'), (2, 'storey 2 (z 6.8+): roofs')],
                     [('NS', (50, 0), (50, 92), 'south→north through the Yamen axis'), ('EW', (0, 60.5), (100, 60.5), 'west→east through A, North Lane, rear terrace, B')])
    print(json.dumps(L.checks()))
