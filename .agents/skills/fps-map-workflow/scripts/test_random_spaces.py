"""Small executable experiment checks, separate from the repository test suite."""
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT=Path(__file__).with_name("random_spaces.py")


class SeedCliTests(unittest.TestCase):
    def invoke(self, out, *args):
        return subprocess.run([sys.executable,str(SCRIPT),"--out",str(out),*args],capture_output=True,text=True)

    def test_same_seed_and_configuration_reproduce_both_files(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as folder:
            a,b=Path(folder)/"a",Path(folder)/"b"
            for target in (a,b):
                result=self.invoke(target,"--seed","731","--nodes","18","--connectivity",".6")
                self.assertEqual(result.returncode,0,result.stderr)
            for name in ("raw.svg","seed.json"):
                self.assertEqual((a/name).read_bytes(),(b/name).read_bytes(),name)

    def test_declared_graph_is_connected_with_unique_valid_links(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as folder:
            out=Path(folder)
            for seed,count,density in ((0,4,0),(17,40,1),(-93,16,.4)):
                result=self.invoke(out,"--seed",str(seed),"--nodes",str(count),"--connectivity",str(density))
                self.assertEqual(result.returncode,0,result.stderr)
                data=json.loads((out/"seed.json").read_text())
                ids={n["id"] for n in data["nodes"]}
                self.assertEqual(len(ids),count)
                links=set()
                reached={next(iter(ids))}
                for e in data["edges"]:
                    self.assertIn(e["from"],ids)
                    self.assertIn(e["to"],ids)
                    self.assertNotEqual(e["from"],e["to"])
                    pair=frozenset((e["from"],e["to"]))
                    self.assertNotIn(pair,links)
                    links.add(pair)
                for _ in range(count):
                    for pair in links:
                        if pair & reached:
                            reached |= pair
                self.assertEqual(reached,ids)

    def test_bounded_finite_geometry_and_varied_seed_outputs(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as folder:
            out=Path(folder)
            shapes,paths,digests=set(),set(),set()
            for seed,width,height in ((41,50,50),(732,120,96),(1987,240,72)):
                result=self.invoke(out,"--seed",str(seed),"--width",str(width),"--height",str(height))
                self.assertEqual(result.returncode,0,result.stderr)
                raw=(out/"seed.json").read_text()
                digests.add(raw)
                data=json.loads(raw)
                for item in data["nodes"]+data["edges"]:
                    for x,y in item["polygon"]:
                        self.assertTrue(math.isfinite(x) and math.isfinite(y))
                        self.assertTrue(0<=x<=width and 0<=y<=height,(seed,x,y))
                    if "centerline" in item:
                        self.assertEqual(len(item["centerline"]),len(item["widths"]))
                        self.assertTrue(all(math.isfinite(w) and w>0 for w in item["widths"]))
                        self.assertTrue(all(0<=x<=width and 0<=y<=height for x,y in item["centerline"]))
                        paths.add(item["path_kind"])
                    else:
                        shapes.add(item["shape"])
            self.assertEqual(len(digests),3)
            self.assertGreaterEqual(len(shapes),4)
            self.assertGreaterEqual(len(paths),4)

    def test_invalid_arguments_fail_without_creating_outputs(self):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as folder:
            out=Path(folder)/"must-not-exist"
            for args in (("--seed","1","--nodes","2"),("--seed","1","--width","nan"),
                         ("--seed","1","--height","241"),("--seed","1","--connectivity","-0.1"),
                         ("--seed","1","--connectivity","nan"),("--nodes","12"),("--seed","oops")):
                result=self.invoke(out,*args)
                self.assertEqual(result.returncode,2,args)
                self.assertIn("error",result.stderr)
                self.assertFalse(out.exists())


if __name__=="__main__":
    unittest.main(verbosity=2)
