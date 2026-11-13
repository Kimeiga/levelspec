import blockout from "../generated/dressing-demo/presets/blockout/level.aml?raw";
import source from "../generated/dressing-demo/presets/kowloon/level.aml?raw";
import blockoutSnapshot from "../generated/dressing-demo/presets/blockout/preview.json?url";
import kowloonSnapshot from "../generated/dressing-demo/presets/kowloon/preview.json?url";
import blockoutModel from "../generated/dressing-demo/presets/blockout/dressing-demo.glb?url";
import kowloonModel from "../generated/dressing-demo/presets/kowloon/dressing-demo.glb?url";
import blockoutPackage from "../generated/dressing-demo/presets/blockout/package.zip?url";
import kowloonPackage from "../generated/dressing-demo/presets/kowloon/package.zip?url";
import type { DemoPreset } from "./app.ts";

const textures = import.meta.glob<string>(
  "../projects/dressing-demo/textures/**/*.{png,jpg,jpeg}",
  { eager: true, query: "?url", import: "default" },
);
const assets = Object.fromEntries(
  Object.entries(textures).map(([path, url]) => [
    path.slice("../projects/dressing-demo/".length),
    url,
  ]),
);

const generatedImages = import.meta.glob<string>(
  "../generated/dressing-demo/presets/*/textures/**/*.{png,jpg,jpeg}",
  { eager: true, query: "?url", import: "default" },
);

/** Keeps generated file names resolvable after Vite fingerprints and relocates each asset. */
function presetImages(id: string): Record<string, string> {
  const prefix = `../generated/dressing-demo/presets/${id}/`;
  return Object.fromEntries(Object.entries(generatedImages)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, url]) => [path.slice(prefix.length), url]));
}

export const dressingDemo: {
  presets: DemoPreset[];
  assets: Record<string, string>;
} = {
  assets,
  presets: [
    {
      id: "kowloon",
      label: "Kowloon street",
      source,
      snapshot: kowloonSnapshot,
      model: kowloonModel,
      package: kowloonPackage,
      images: presetImages("kowloon"),
    },
    {
      id: "blockout",
      label: "Blockout",
      source: blockout,
      snapshot: blockoutSnapshot,
      model: blockoutModel,
      package: blockoutPackage,
      images: presetImages("blockout"),
    },
  ],
};
