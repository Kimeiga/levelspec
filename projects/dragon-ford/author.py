"""Emit the editable native AML from the layout source.
Run: uv run --with shapely python projects/dragon-ford/author.py [out.aml] [--cut N] [--theme]"""
import sys, json
from pathlib import Path
from layout import L, REV
P = Path(__file__).parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
cut = int(sys.argv[sys.argv.index('--cut') + 1]) if '--cut' in sys.argv else None
theme = '--theme' in sys.argv
out = Path(args[0]) if args else P / ('kowloon/level.aml' if theme else 'level.aml')
out.parent.mkdir(exist_ok=True)
mapping = L.aml(out, cut=cut, theme='textures' if theme else None, description=('Kowloon street kit presentation of ' if theme else '') + f'Dragon Ford {REV}: Kowloon Walled City-inspired 5v5 bomb-defusal blockout carved from a solid city block on four interweaving district grids. Bounded harness checks only; no balance claim.')
if cut is None and not args and not theme:
    (P / 'source-map.json').write_text(json.dumps(dict(revision=REV, objects=mapping), indent=1) + '\n')
print('wrote', out)
