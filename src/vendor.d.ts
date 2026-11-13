declare module 'cdt2d' { export default function cdt2d(points:number[][],edges:number[][],options?:Record<string,boolean>):number[][]; }
declare module 'pngjs/browser.js' {
  const png: {
    PNG: { new(options: { width: number; height: number }): { data: Uint8Array }; sync: {
      read(bytes: Uint8Array): { width: number; height: number; data: Uint8Array };
      write(image: { width: number; height: number; data: Uint8Array }, options?: { deflateLevel: number }): Uint8Array;
    } };
  };
  export default png;
}
declare module 'gltf-validator' {
  export function validateBytes(data: Uint8Array, options?: Record<string, unknown>): Promise<{issues: {numErrors: number; numWarnings: number; messages: unknown[]}}>;
  export function validateString(data: string, options?: Record<string, unknown>): Promise<{issues: {numErrors: number; numWarnings: number; messages: unknown[]}}>;
}
