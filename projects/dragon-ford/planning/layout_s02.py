"""S02 — multi-grid redevelopment after the S01 proposal round and the user's interweaving-grids direction.
Four district grids at different angles meet in wedge links: Yamen +5°, West -9°, East (Kwong Ming) -12°, North frontage -3°; the apron is world-aligned."""
from pathlib import Path
import sys; sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
from pipeline import Layout, Frame, rect, link, H
import json
Z0, ZM, Z1 = 0.0, 1.7, 3.4
L = Layout('dragon-ford', 'Dragon Ford', 'S02', rect(0, 0, 108, 98))
Y = Frame(38, 30, 5)      # Yamen void, forecourt and Free School
W = Frame(12, 26, -9)     # west district: Lung Chun Road W, Sai Shing, temple lot
E = Frame(76, 14, -12)    # east district: Kwong Ming Street, workshop, foundry
N = Frame(24, 86, -3)     # north frontage: shop street, youth hall, dentist shop

# --- south apron (world grid) --------------------------------------------------
L.space('T_APRON', [[4, 2], [90, 2], [90, 10], [11.5, 10], [11.5, 29], [4, 29]], Z0, 'spawn', 'Sai Tau apron (T spawn; squatter sheds, ball court)', sky=True, label_at=(40, 6))
L.space('GATE', rect(53, 8, 57, 20), Z0, 'alley', 'South Gate|tunnel')
# --- Yamen grid: forecourt, compound, side lanes --------------------------------
L.space('CANNON', Y.r(4, -13, 28, -1.2), Z0, 'court', 'Cannon Court|(gate ruin)', sky=True)
L.door('YGATE', Y.r(13.5, -1.2, 18.5, 0), Z0, sky=True)
L.space('Y_FRONT', Y.r(0, 0, 32, 9), Z0, 'court', 'Yamen front court', sky=True)
L.stair('SY1', Y.p(16, 9), Y.p(16, 12.4), Z0, ZM, 6, 'Hall steps', sky=True)
L.space('Y_MID', Y.r(6, 12.4, 26, 22), ZM, 'court', 'Middle hall (roofed) + inner court', sky=True)
L.stair('SY2a', Y.p(7.5, 22), Y.p(7.5, 25.4), ZM, Z1, 3, 'Inner steps W', sky=True)
L.stair('SY2b', Y.p(24.5, 22), Y.p(24.5, 25.4), ZM, Z1, 3, 'Inner steps E', sky=True)
L.space('Y_STRIP', Y.r(0, 25.4, 32, 29), Z1, 'court', 'Rear terrace strip (in front of closed rear hall)', sky=True)
L.guard('G_STRIP', Y.p(9, 25.4), Y.p(23, 25.4), Z1)
# west side lane
L.stair('SLW1', Y.p(2.5, 9), Y.p(2.5, 12.4), Z0, ZM, 4, 'West lane steps 1', sky=True)
L.space('WL_MID', Y.r(0, 12.4, 5, 22), ZM, 'alley', 'West lane|terrace', sky=True)
L.stair('SLW2', Y.p(2.5, 22), Y.p(2.5, 25.4), ZM, Z1, 4, 'West lane steps 2', sky=True)
L.space('WL_TOP', Y.r(0, 25.4, 5, 36), Z1, 'alley', 'West lane|top', sky=True)
L.door('MID_W', Y.r(5, 18, 6, 20.5), ZM, sky=True)
# east side lane
L.space('EL_LOW', Y.r(27, 9, 32, 14), Z0, 'alley', 'East lane', sky=True)
L.stair('SLE1', Y.p(29.5, 14), Y.p(29.5, 17.4), Z0, ZM, 4, 'East lane steps 1', sky=True)
L.space('EL_MID', Y.r(27, 17.4, 32, 21), ZM, 'alley', 'E landing', sky=True)
L.stair('SLE2', Y.p(29.5, 21), Y.p(29.5, 24.4), ZM, Z1, 4, 'East lane steps 2', sky=True)
L.space('EL_TOP', Y.r(27, 24.4, 32, 36), Z1, 'alley', 'East lane|top', sky=True)
L.door('MID_E', Y.r(26, 18, 27, 20.5), ZM, sky=True)
# Free School on the void's west face
L.space('COLONNADE', Y.r(-7, 0, -1, 9), Z0, 'hall', 'Free School|colonnade')
L.portal('COL_E1', Y.r(-1, 1.5, 0, 4), Z0); L.portal('COL_E2', Y.r(-1, 5.5, 0, 8), Z0)
L.space('SCHOOL_LANE', Y.r(-5.8, -7, -2.2, 0), Z0, 'alley', 'School|lane')
L.stair('SW1', Y.p(-4, 9), Y.p(-4, 12.4), Z0, ZM, 2.6, 'School stair 1')
L.space('S_LAND', Y.r(-7, 12.4, -1, 15), ZM, 'landing', 'School landing')
L.door('LAND_E', Y.r(-1, 12.8, 0, 14.8), ZM)
L.stair('SW2', Y.p(-4, 15), Y.p(-4, 18.4), ZM, Z1, 2.6, 'School stair 2')
L.space('GALLERY', Y.r(-7, 18.4, -1, 30.5), Z1, 'gallery', 'Free School|gallery')
L.window('GW1', Y.r(-1, 19.5, 0, 22.5), Z1); L.window('GW2', Y.r(-1, 23.5, 0, 25.2), Z1)
L.door('BACKDOOR', Y.r(-1, 26.5, 0, 28.8), Z1)
# --- west grid ------------------------------------------------------------------
L.space('LUNG_W', W.r(-2, -1.75, 33, 1.75), Z0, 'alley', 'Lung Chun Road W (tunnel)')
L.space('WELL', W.poly([(2, 1.75), (13.5, 1.75), (12.5, 8), (5, 8)]), Z0, 'court', 'Well Court|(lit junction)', sky=True)
L.stair('SS1', W.p(8.5, 8), W.p(8.5, 11.4), Z0, ZM, 3.5, 'Sai Shing steps 1')
L.space('SS_LAND', W.r(2.75, 11.4, 10.75, 15), ZM, 'landing', 'Sai Shing landing')
L.space('TOOTH', [W.p(10.75, 11.6), (28.5, 36.6), Y.p(-7, 12.6), Y.p(-7, 14.8), W.p(10.75, 14.8)], ZM, 'room', 'Tooth|shop')
L.stair('SS2', W.p(4.5, 15), W.p(4.5, 18.4), ZM, Z1, 3, 'Sai Shing steps 2')
L.space('SS_UP', W.r(3, 18.4, 6, 26.2), Z1, 'alley', 'Sai Shing|upper')
A_LOT = W.poly([(-9, 26), (6.5, 26), (6.5, 44), (2, 44), (2, 39), (-6, 39), (-6, 44), (-9, 44)])
L.space('A_COURT', A_LOT, Z1, 'site', 'A — Tin Hau lot|(hall porch = plant)', sky=True, label_at=W.p(-1, 32))
L.door('A_EAST', link(W.p(6.5, 32.5), W.p(6.5, 35), Y.p(-7, 27.4), Y.p(-7, 29.9)), Z1)
# --- east grid ------------------------------------------------------------------
L.space('KWONG', E.r(-1.75, -5, 1.75, 26), Z0, 'alley', 'Kwong Ming|Street')
L.space('KW_BAY', E.r(1.75, 8, 4.5, 15), Z0, 'alley', 'bay')
L.space('KW_JOG', E.r(-1.75, 22.5, 9, 26), Z0, 'alley', 'Kwong jog')
L.space('KW_N', E.r(5.5, 26, 9, 34.2), Z0, 'alley', 'Foundry|mouth')
L.space('FISHBALL', E.r(-8.5, 18, -2.5, 31), Z0, 'room', 'Fishball|workshop')
L.door('FB_ST', E.r(-2.5, 19, -1.75, 21.5), Z0)
L.door('FB_YAMEN', link(Y.p(32, 10), Y.p(32, 12.5), E.p(-8.5, 27.2), E.p(-8.5, 29.6)), Z0)
L.door('FB_B', E.r(-8, 31, -5.5, 34), Z0)
L.space('B_FLOOR', E.r(-8, 34, 13, 54), Z0, 'site', 'B — Kwong Ming Foundry floor|(double height)', ceil=6.8, label_at=E.p(3, 40))
L.space('B_MEZZ_N', E.r(-8, 49, 13, 54), Z1, 'gallery', 'Foundry mezzanine')
L.space('B_MEZZ_W', E.r(-8, 41, -3.5, 49), Z1, 'gallery', 'mezz W')
L.space('B_TONGUE', E.r(4.5, 45.6, 7.2, 49), Z1, 'gallery', '')
L.stair('SB1', E.p(-2.3, 42.2), E.p(-2.3, 49), Z0, Z1, 2.4, 'Foundry stair W')
L.stair('SB2a', E.p(11.8, 42.2), E.p(11.8, 45.6), Z0, ZM, 2.4, 'Foundry stair E lower')
L.space('B_LAND', E.r(10.6, 45.6, 13, 48), ZM, 'landing', '')
L.stair('SB2b', E.p(10.6, 46.8), E.p(7.2, 46.8), ZM, Z1, 2.4, 'Foundry stair E upper')
L.space('NL_E', link(Y.p(32, 26), Y.p(32, 28.8), E.p(-8, 43), E.p(-8, 45.8)), Z1, 'alley', 'Coffin lane')
L.space('NE_LANE', E.r(0, 54, 3.5, 73), Z1, 'alley', 'NE lane')
# --- north grid -----------------------------------------------------------------
L.space('CT_STREET', N.r(0, 0, 76, 8), Z1, 'spawn', 'Tung Tau frontage (CT spawn; dentist arcade)', sky=True)
L.space('YOUTH', N.r(14, -15, 36, -2.5), Z1, 'hall', 'Youth Centre hall')
L.door('YOUTH_N', N.r(24, -2.5, 27, 0), Z1)
L.door('YOUTH_SW', link(Y.p(1, 36), Y.p(4, 36), N.p(14.5, -15), N.p(17.5, -15)), Z1, sky=True)
L.space('NW_LANE', N.r(2, -9, 5.5, 0), Z1, 'alley', 'NW lane')
L.space('DENTIST', N.r(-4, -14.5, 5.5, -9), Z1, 'room', 'Dentist shop')
L.door('A_NORTH', link(N.p(-2.5, -14.5), N.p(1, -14.5), W.p(2.5, 44), W.p(6, 44)), Z1, sky=True)
# --- principal masses (provisional) ----------------------------------------------
L.cover('RUIN_BAR', Y.r(11.5, -5, 20.5, -4.4), Z0, 3.4, 'South Gate ruin wall: blocks the gate axis')
L.cover('RUIN_STEM', Y.r(15.7, -10, 16.3, -5), Z0, 3.4, 'Ruin stem: splits Cannon Court')
L.cover('SCREEN', Y.r(12.5, 16.2, 19.5, 16.8), ZM, 3.2, 'Spirit screen behind the hall steps')
L.cover('A_SCREEN', W.r(3.2, 30.5, 3.7, 35.5), Z1, 2.6, 'Screen wall facing A east door')
L.cover('BOILER', E.r(5.2, 36.5, 9.3, 38.5), Z0, 3.0, 'Boiler inside the foundry mouth')
L.anchor('T', (55, 5, Z0), 'attacker_spawn'); L.anchor('CT', (62, 88, Z1), 'defender_spawn')
L.anchor('A', (*W.p(-2, 36.5), Z1), 'objective'); L.anchor('B', (*E.p(3, 45), Z0), 'objective')
PLANS = [(0, 'storey 0 (z 0–3.4): low city'), (1, 'storey 1 (z 3.4–6.8): upper grade')]
SECTIONS = [('NS', Y.p(16, -26), Y.p(16, 60), 'south→north along the Yamen axis (grid +5°)'),
            ('EW', Y.p(-40, 27.2), Y.p(62, 27.2), 'west→east along the rear terrace strip'),
            ('SS', W.p(8.5, -4), W.p(4.5, 48), 'Lung Chun W → Well Court → Sai Shing → A')]
if __name__ == '__main__':
    out = Path(__file__).parent / 'planning' / 's02'
    L.write_drawings(out, PLANS, SECTIONS)
    print(json.dumps(L.checks()))
