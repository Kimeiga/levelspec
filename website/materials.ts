/** Bundled authored textures exposed to the shared reviewer by the site adapter. */
const images = import.meta.glob<string>("./assets/textures/*-*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
export const materialURLs: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(images).map(([file, url]) => [
      file.replace("./assets/", ""),
      url,
    ]),
  ),
);
