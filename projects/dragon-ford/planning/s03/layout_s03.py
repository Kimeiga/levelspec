"""Dragon Ford layout source. Four district grids at different angles interweave:
Yamen +5°, West / Lung Chun Road -9° (its street cuts through the Yamen forecourt to the east district),
East / Kwong Ming -12°, North frontage -3°. Wedge yards and rooms occupy the seams.
Run: uv run --with shapely python projects/dragon-ford/layout.py [outdir]"""
from pathlib import Path
from pipeline import Layout, Frame, rect, link, H
import json, sys
Z0, ZM, Z1 = 0.0, 1.7, 3.4
REV = 'S03'
L = Layout('dragon-ford', 'Dragon Ford', REV, rect(0, 0, 108, 98))
Y = Frame(38, 30, 5)      # Yamen void, forecourt and Free School
W = Frame(12, 26, -9)     # west district and Lung Chun Road (runs on to the east district)
E = Frame(76, 14, -12)    # east district: Kwong Ming Street, workshop, foundry
N = Frame(24, 86, -3)     # north frontage: shop street, youth hall, dentist shop

# --- south apron (world grid) and its two entries --------------------------------
L.space('T_APRON', rect(4, 2, 62, 10), Z0, 'spawn', 'Sai Tau apron (T spawn; squatter sheds, ball court)', sky=True)
L.space('W_SLOT', rect(6, 10, 9.5, 28), Z0, 'alley', 'West|slot')
L.space('GATE', rect(46, 8, 50, 18), Z0, 'alley', 'South Gate|tunnel')
# --- Lung Chun Road on the west grid, cutting the Yamen forecourt ------------------
L.space('LUNG_W', W.poly([(-6, -1.75), (33, -1.5), (33, 1.5), (22, 1.5), (22, 4.2), (18, 4.2), (18, 1.75), (-6, 1.75)]), Z0, 'alley', 'Lung Chun Road W (tunnel; standpipe niche)', label_at=W.p(22, 0))
L.space('WELL', W.poly([(2, 1.75), (13.5, 1.75), (12.5, 8), (5, 8)]), Z0, 'court', 'Well Court|(lit junction)', sky=True)
L.space('CANNON', Y.r(4, -15.5, 28, -1.2), Z0, 'court', 'Cannon Court', sky=True, label_at=Y.p(9, -4))
L.space('LUNG_E', W.r(52, -1.5, 66, 1.5), Z0, 'alley', 'Lung Chun|Road E')
L.cover('RUIN', Y.r(13.6, -16.5, 18, -9.2), Z0, 3.4, 'South Gate footing: solid ruin standing on the Lung Chun line')
L.cover('RUIN_WALL', Y.r(10.5, -5.2, 21.5, -4.6), Z0, 2.6, 'Ruin wall screening the Yamen gate from the tunnel mouth')
# --- Yamen grid: compound stepping up inside the sky void ---------------------------
L.door('YGATE', Y.r(13.5, -1.2, 18.5, 0), Z0, sky=True)
L.space('Y_FRONT', Y.r(0, 0, 32, 9), Z0, 'court', 'Yamen front court', sky=True)
L.stair('SY1', Y.p(16, 9), Y.p(16, 12.4), Z0, ZM, 6, 'Hall steps', sky=True)
L.space('Y_HALL', Y.r(6, 12.4, 26, 17.4), ZM, 'hall', 'Middle hall (roofed, open front)', ceil=4.8, roof=True)
L.air('Y_HALL_SKY', Y.r(6, 12.4, 26, 17.4), 5.1)
L.space('Y_COURT', Y.poly([(0, 12.4), (6, 12.4), (6, 17.4), (26, 17.4), (26, 22), (0, 22)]), ZM, 'court', 'West wing + inner court', sky=True, label_at=Y.p(13, 19.7))
L.cover('SCREEN', Y.r(12.5, 16.5, 19.5, 17.1), ZM, 3.1, 'Spirit screen closing the hall axis')
L.stair('SLW2', Y.p(2.5, 22), Y.p(2.5, 25.4), ZM, Z1, 4, 'West wing steps', sky=True)
L.stair('SY2b', Y.p(24.5, 22), Y.p(24.5, 25.4), ZM, Z1, 3, 'Inner steps E', sky=True)
L.space('Y_STRIP', Y.r(0, 25.4, 32, 29), Z1, 'court', 'Rear terrace strip (closed rear hall behind)', sky=True)
L.guard('G_STRIP', Y.p(4.5, 25.4), Y.p(23, 25.4), Z1)
L.space('WL_TOP', Y.r(0, 29, 5, 36), Z1, 'alley', 'West|lane top', sky=True)
L.space('EL_LOW', Y.r(27, 9, 32, 14), Z0, 'alley', 'East lane', sky=True)
L.stair('SLE1', Y.p(29.5, 14), Y.p(29.5, 17.4), Z0, ZM, 4, 'East lane steps 1', sky=True)
L.space('EL_MID', Y.r(27, 17.4, 32, 21), ZM, 'alley', 'E landing', sky=True)
L.stair('SLE2', Y.p(29.5, 21), Y.p(29.5, 24.4), ZM, Z1, 4, 'East lane steps 2', sky=True)
L.space('EL_TOP', Y.r(27, 24.4, 32, 36), Z1, 'alley', 'East|lane top', sky=True)
L.door('MID_E', Y.r(26, 18.3, 27, 20.7), ZM, sky=True)
# Free School on the void's west face
L.space('COLONNADE', Y.r(-7, 0, -1, 9), Z0, 'hall', 'Free School|colonnade')
L.portal('COL_E1', Y.r(-1, 1.5, 0, 4), Z0); L.portal('COL_E2', Y.r(-1, 5.5, 0, 8), Z0)
L.space('SCHOOL_LANE', Y.r(-5.8, -7, -2.2, 0), Z0, 'alley', 'School|lane')
L.stair('SW1', Y.p(-4, 9), Y.p(-4, 12.4), Z0, ZM, 2.6, 'School stair 1')
L.space('S_LAND', Y.r(-7, 12.4, -1, 15), ZM, 'landing', 'School landing')
L.door('LAND_E', Y.r(-1, 12.8, 0, 14.8), ZM)
L.stair('SW2', Y.p(-4, 15), Y.p(-4, 18.4), ZM, Z1, 2.6, 'School stair 2')
L.space('GALLERY', Y.r(-7, 18.4, -1, 30.5), Z1, 'gallery', 'Free School|gallery')
L.window('GW1', Y.r(-1, 19.2, 0, 21.8), Z1); L.window('GW2', Y.r(-1, 23, 0, 25), Z1)
L.door('BACKDOOR', Y.r(-1, 26.6, 0, 28.8), Z1)
# --- west grid: Sai Shing climb, Tooth shop, temple lot -------------------------------
L.stair('SS1', W.p(8.5, 8), W.p(8.5, 11.4), Z0, ZM, 3.5, 'Sai Shing steps 1')
L.space('SS_LAND', W.r(2.75, 11.4, 10.75, 15), ZM, 'landing', 'Sai Shing landing')
L.space('TOOTH', [W.p(10.5, 11.6), (28.5, 36.6), Y.p(-6.8, 12.6), Y.p(-6.8, 14.8), W.p(10.5, 14.8)], ZM, 'room', 'Tooth|shop')
L.stair('SS2', W.p(4.5, 15), W.p(4.5, 18.4), ZM, Z1, 3, 'Sai Shing steps 2')
L.space('SS_UP', W.poly([(3, 18.4), (6, 18.4), (6, 21.5), (-5.5, 25), (-5.5, 26.2), (-9, 26.2), (-9, 22.6), (3, 19.4)]), Z1, 'alley', 'Sai Shing upper', label_at=W.p(-1, 22.3))
A_LOT = W.poly([(-9, 26), (6.5, 26), (6.5, 44), (-9, 44)])
HALL_A = W.r(-5.5, 34.5, 2.5, 41)
L.space('A_COURT', A_LOT, Z1, 'site', 'A — Tin Hau lot', sky=True, label_at=W.p(-1, 29))
L.cover('TINHAU', HALL_A, Z1, 4.2, 'Tin Hau hall: free-standing closed cella (gaps W 3.5, N 3, E 4 m)')
L.cover('A_SCREEN', W.r(3.6, 29.5, 4.1, 33.5), Z1, 2.6, 'Screen wall facing the slot-yard door')
L.space('SLOT_YARD', [W.p(7.1, 27.5), Y.p(-7.6, 24.8), Y.p(-7.6, 30.6), W.p(7.1, 36.5)], Z1, 'court', 'Slot|yard', sky=True)
L.door('A_EAST', W.r(6.5, 32.3, 7.1, 35), Z1, sky=True)
L.door('GAL_W', Y.r(-7.6, 27.2, -7, 29.8), Z1)
# --- east grid ------------------------------------------------------------------------
L.space('KWONG', E.poly([(-1.5, -1.5), (1.5, -1.5), (1.5, 6), (1.75, 6), (1.75, 26), (-1.75, 26), (-1.75, 8), (-1.5, 8)]), Z0, 'alley', 'Kwong Ming|Street', label_at=E.p(0, 18))
L.space('PLASTICS', E.r(1.75, 6, 7.5, 14), Z0, 'court', 'Plastics|yard (lit)', sky=True)
L.space('KW_JOG', E.r(-1.75, 22.5, 9, 26), Z0, 'alley', 'Kwong jog')
L.space('KW_N', E.r(5.5, 26, 9, 34.2), Z0, 'alley', 'Foundry|mouth')
L.space('FISHBALL', E.r(-8.5, 18, -2.5, 31), Z0, 'room', 'Fishball|workshop')
L.door('FB_ST', E.r(-2.5, 19, -1.75, 21.5), Z0)
L.space('RUBBISH', link(Y.p(32.6, 9.5), Y.p(32.6, 14), E.p(-9.1, 22), E.p(-9.1, 30.5)), Z0, 'court', 'Rubbish|yard', sky=True)
L.door('EL_YARD', Y.r(32, 10, 32.6, 12.6), Z0, sky=True)
L.door('FB_YARD', E.r(-9.1, 26.5, -8.5, 29), Z0)
L.door('FB_B', E.r(-7, 31, -4.5, 34), Z0)
L.space('B_FLOOR', E.r(-8, 34, 13, 54), Z0, 'site', 'B — Kwong Ming Foundry floor|(double height)', ceil=6.8, label_at=E.p(3, 39.5))
L.space('B_MEZZ_N', E.r(-8, 49, 13, 54), Z1, 'gallery', 'Foundry mezzanine')
L.space('B_MEZZ_W', E.r(-8, 41, -3.5, 49), Z1, 'gallery', 'mezz W')
L.space('B_TONGUE', E.r(4.5, 45.6, 7.2, 49), Z1, 'gallery', '')
L.stair('SB1', E.p(-2.3, 42.2), E.p(-2.3, 49), Z0, Z1, 2.4, 'Foundry stair W')
L.stair('SB2a', E.p(11.8, 42.2), E.p(11.8, 45.6), Z0, ZM, 2.4, 'Foundry stair E lower')
L.space('B_LAND', E.r(10.6, 45.6, 13, 48), ZM, 'landing', '')
L.stair('SB2b', E.p(10.6, 46.8), E.p(7.2, 46.8), ZM, Z1, 2.4, 'Foundry stair E upper')
L.guard('G_MW', E.p(-3.5, 41), E.p(-3.5, 49), Z1); L.guard('G_MS', E.p(-5, 41), E.p(-3.5, 41), Z1)
L.guard('G_MN1', E.p(-1.1, 49), E.p(4.5, 49), Z1); L.guard('G_MN2', E.p(7.2, 49), E.p(13, 49), Z1)
L.guard('G_T1', E.p(4.5, 45.6), E.p(4.5, 49), Z1); L.guard('G_T2', E.p(4.5, 45.6), E.p(7.2, 45.6), Z1)
L.guard('G_BL', E.p(10.6, 45.6), E.p(10.6, 46), ZM, height=1.05)
L.cover('BOILER', E.r(5.2, 36.5, 9.3, 38.5), Z0, 3.0, 'Boiler inside the foundry mouth')
L.space('COFFIN', link(Y.p(32, 32.5), Y.p(32, 35.5), E.p(-8, 50), E.p(-8, 53)), Z1, 'alley', 'Coffin lane')
L.space('NE_LANE', E.r(0, 54, 3.5, 73), Z1, 'alley', 'NE lane')
# experimental overhead perch: catwalk from mezz W onto the Fishball roof
L.space('FB_ROOF', E.r(-8.5, 22, -2.5, 31), Z1, 'roof', 'Fishball roof|(experimental perch)', sky=True)
L.space('CATWALK', E.r(-7.5, 31, -5, 41), Z1, 'gallery', 'catwalk')
L.window('FBR_W', E.r(-9.1, 23, -8.5, 30), Z1, sill=1.1, head=None, sky=True)
# --- north grid -----------------------------------------------------------------------
L.space('CT_STREET', N.r(0, 0, 76, 8), Z1, 'spawn', 'Tung Tau frontage (CT spawn; dentist arcade)', sky=True)
L.space('YOUTH', N.r(14, -15, 36, -2.5), Z1, 'hall', 'Youth Centre hall')
L.door('YOUTH_N', N.r(24, -2.5, 27, 0), Z1)
L.space('BACK_STEPS', link(Y.p(0.5, 36), Y.p(4.5, 36), N.p(14.3, -15), N.p(19.5, -15)), Z1, 'court', 'Back|yard', sky=True)
L.space('NW_LANE', N.r(2, -9, 5.5, 0), Z1, 'alley', 'NW lane')
L.space('DENTIST', N.r(-4, -14.5, 5.5, -9), Z1, 'room', 'Dentist shop')
L.door('A_NORTH', link(N.p(-3.6, -14.5), N.p(-0.4, -14.5), W.p(-1, 44), W.p(2.5, 44)), Z1, sky=True)
L.anchor('T', (40, 6, Z0), 'attacker_spawn'); L.anchor('CT', (60, 89, Z1), 'defender_spawn')
L.anchor('A', (*W.p(-1.5, 32.5), Z1), 'objective'); L.anchor('B', (*E.p(3, 45), Z0), 'objective')
PLANS = [(0, 'storey 0 (z 0–3.4): low city'), (1, 'storey 1 (z 3.4–6.8): upper grade')]
SECTIONS = [('NS', Y.p(16, -26), Y.p(16, 60), 'south→north along the Yamen axis (grid +5°)'),
            ('EW', Y.p(-40, 27.2), Y.p(62, 27.2), 'west→east along the rear terrace strip'),
            ('LC', W.p(-8, 0), W.p(70, 0), 'along Lung Chun Road (grid -9°): west slot → Well → Cannon Court → Kwong Ming'),
            ('SS', W.p(8.5, -4), W.p(4.5, 20), 'Lung Chun W → Well Court → Sai Shing flights'),
            ('KM', E.p(0, -4), E.p(0, 76), 'along Kwong Ming Street axis through the foundry to the NE lane')]
if __name__ == '__main__':
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'planning' / REV.lower()
    L.write_drawings(out, PLANS, SECTIONS)
    c = L.checks(); print(json.dumps(c))
