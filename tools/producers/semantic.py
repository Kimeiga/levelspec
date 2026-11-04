"""Python declaration-data boundary. Never compose plan text or write an artifact."""
import argparse
import contextlib
import importlib.util
import json
import sys


FIELDS = {
    "ID", "NAME", "DESCRIPTION", "GRID", "WIDTH", "HEIGHT", "WALL_THICKNESS",
    "FLOOR_THICKNESS", "LAYER_HEIGHT", "LAYERS", "AREAS", "RAMPS", "COVER",
    "PORTALS", "STAIRS", "DIRECTIVES", "PLAYER", "GAMEPLAY", "MOVE_SPEED",
    "EXPECT_FAIL", "VALIDATION",
}


def main():
    sys.dont_write_bytecode = True
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("spec")
    args = parser.parse_args()
    specification = importlib.util.spec_from_file_location("semantic_declarations", args.spec)
    if specification is None or specification.loader is None:
        raise ValueError("Cannot load Python declaration module: " + args.spec)
    module = importlib.util.module_from_spec(specification)
    with contextlib.redirect_stdout(sys.stderr):
        specification.loader.exec_module(module)
    unknown = [name for name in vars(module) if name.isupper() and name not in FIELDS]
    if unknown:
        raise ValueError("Unsupported semantic declarations: " + ", ".join(unknown))
    values = {name: getattr(module, name) for name in FIELDS if hasattr(module, name)}
    json.dump({"format": "levelspec-python/1", "declarations": values}, sys.stdout, allow_nan=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
