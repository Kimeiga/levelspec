"""Emit the capture view list (overviews + eye-level views) from the layout frames.
Run: uv run --with shapely python projects/dragon-ford/views.py > projects/dragon-ford/views.json"""
import json
from layout import Y, W, E, N
Z0, ZM, Z1 = 0.0, 1.7, 3.4
def P(f, u, v, z): return [*f.p(u, v), z]
V = [dict(id='01-city-roofs', position=[200, -120, 170], target=[54, 46, 10], projection='orthographic', height=150, roofs=True),
     dict(id='02-city-roofs-north', position=[-90, 210, 170], target=[54, 46, 10], projection='orthographic', height=150, roofs=True),
     dict(id='03-upper-grade-roofs-off', position=[190, -110, 150], target=[54, 48, 4], projection='orthographic', height=118, roofs=False),
     dict(id='04-top-roofs-off', position=[54, 45.9, 200], target=[54, 46, 0], projection='orthographic', height=96, roofs=False),
     dict(id='05-yamen-void', position=[86, -8, 70], target=[53, 46, 2], projection='perspective', fov=45, roofs=False),
     dict(id='06-void-from-above', position=[54, 20, 95], target=[54, 48, 0], projection='perspective', fov=50, roofs=True),
     dict(id='07-site-a-roofs-off', position=[2, 30, 40], target=[17, 61, 3.4], projection='perspective', fov=45, roofs=False),
     dict(id='08-site-b-roofs-off', position=[112, 30, 42], target=[88, 58, 1], projection='perspective', fov=45, roofs=False)]
def eye(id, a, b, stance='stand'): V.append(dict(id=id, feet=a, lookAt=b, stance=stance, roofs=True))
eye('e01-t-spawn-to-gate', [52, 6, Z0], [48, 14, Z0])
eye('e02-tunnel-mouth-to-court', [48, 14.5, Z0], P(Y, 16, -3, Z0))
eye('e03-lung-chun-w-to-ruin', P(W, 31, 0, Z0), P(Y, 16, -11, Z0))
eye('e04-gate-to-hall', P(Y, 16, 1, Z0), P(Y, 16, 14, ZM))
eye('e05-front-court-to-east-lane', P(Y, 24, 5, Z0), P(Y, 28.2, 16, ZM))
eye('e06-front-court-to-arcade', P(Y, 8, 6.5, Z0), P(Y, -3, 5, Z0))
eye('e07-hall-interior-to-rear-door', P(Y, 16, 13.5, ZM), P(Y, 7.4, 19, ZM))
eye('e08-inner-court-to-terrace', P(Y, 13, 19.5, ZM), P(Y, 13, 24, Z1))
eye('e09-terrace-down-to-court', P(Y, 11, 22.7, Z1), P(Y, 16, 19, ZM))
eye('e09c-terrace-parapet-crouch', P(Y, 11, 22.7, Z1), P(Y, 16, 19, ZM), 'crouch')
eye('e10-terrace-along', P(Y, 1.5, 27.2, Z1), P(Y, 30, 27.2, Z1))
eye('e10c-planter-crouch-to-gallery', P(Y, 15.3, 24.5, Z1), P(Y, -1, 24, Z1), 'crouch')
eye('e11-gallery-window-to-terrace', P(Y, -1.7, 24.1, Z1), P(Y, 14, 27, Z1))
eye('e12-school-landing-up', P(Y, -4, 13.7, ZM), P(Y, -2.3, 18.4, Z1))
eye('e13-well-court-to-steps', P(W, 8.5, 5, Z0), P(W, 8.5, 12, ZM))
eye('e14-sai-shing-upper-to-a', P(W, 0, 22, Z1), P(W, -7, 30, Z1))
eye('e15-a-sw-arrival', P(W, -7.2, 27, Z1), P(W, -1.5, 32.5, Z1))
eye('e16-a-east-door', P(W, 6.8, 33.6, Z1), P(W, 0, 33, Z1))
eye('e17-a-north-mouth', P(W, -1.5, 43.3, Z1), P(W, 4.5, 38, Z1))
eye('e18-a-plant-looking-south', P(W, -1.5, 33.5, Z1), P(W, -4, 26, Z1))
eye('e19-kwong-ming-street', P(E, 0, -3, Z0), P(E, 0, 20, Z0))
eye('e20-foundry-mouth', P(E, 7.2, 30, Z0), P(E, 3, 45, Z0))
eye('e21-fishball-door-into-b', P(E, -5.75, 32, Z0), P(E, 2, 45, Z0))
eye('e22-b-plant-up-to-mezzanine', P(E, 3, 44, Z0), P(E, 2, 52, Z1))
eye('e23-mezzanine-rail-to-floor', P(E, 2, 49.65, Z1), P(E, 3, 42, Z0))
eye('e24-tongue-to-mouth', P(E, 5.8, 46.2, Z1), P(E, 7.2, 34, Z0))
eye('e25-coffin-arrival', P(E, -7.2, 51.5, Z1), P(E, -7.2, 44, Z1))
eye('e26-east-lane-top-to-coffin', P(Y, 29.5, 30, Z1), P(Y, 31.5, 34.5, Z1))
eye('e27-youth-hall-from-north-door', P(N, 25.5, -3.2, Z1), P(N, 25.5, -12, Z1))
eye('e28-ct-spawn-street', P(N, 22, 4, Z1), P(N, 60, 4, Z1))
eye('e29-dentist-to-a-mouth', P(N, 2, -10.5, Z1), P(N, -5, -14, Z1))
eye('e30-rubbish-yard', P(Y, 33.6, 11.3, Z0), P(E, -9.5, 24, Z0))
eye('e31-back-yard-to-hall-door', P(Y, 2.5, 34, Z1), P(N, 15.8, -15, Z1))
eye('e32-east-yard', P(N, 37.3, -13.2, Z1), P(Y, 29.5, 33, Z1))
print(json.dumps(V, indent=1))
