declare module 'cdt2d' { export default function cdt2d(points:number[][],edges:number[][],options?:Record<string,boolean>):number[][]; }
declare module 'gltf-validator' {
  export function validateBytes(data: Uint8Array, options?: Record<string, unknown>): Promise<{issues: {numErrors: number; numWarnings: number; messages: unknown[]}}>;
  export function validateString(data: string, options?: Record<string, unknown>): Promise<{issues: {numErrors: number; numWarnings: number; messages: unknown[]}}>;
}
