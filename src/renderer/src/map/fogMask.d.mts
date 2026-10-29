export function rasterizeFogMask(width: number, height: number, strokes: Array<{ mode: 'reveal' | 'hide'; stamps: Array<{ x: number; y: number; radius: number }> }>): Uint8ClampedArray;
