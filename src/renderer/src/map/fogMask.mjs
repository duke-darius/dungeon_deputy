export function rasterizeFogMask(width, height, strokes) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !Array.isArray(strokes)) throw new TypeError('Invalid fog mask dimensions or strokes');
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) { const p = i * 4; pixels[p] = 8; pixels[p + 1] = 10; pixels[p + 2] = 9; pixels[p + 3] = 255; }
  for (const stroke of strokes) {
    if (!stroke || !['reveal', 'hide'].includes(stroke.mode) || !Array.isArray(stroke.stamps)) throw new TypeError('Invalid fog stroke');
    for (const stamp of stroke.stamps) {
      if (![stamp?.x, stamp?.y, stamp?.radius].every(Number.isFinite) || stamp.radius <= 0) throw new TypeError('Invalid fog stamp');
      const minX = Math.max(0, Math.ceil(stamp.x - stamp.radius - 0.5));
      const maxX = Math.min(width - 1, Math.floor(stamp.x + stamp.radius - 0.5));
      const minY = Math.max(0, Math.ceil(stamp.y - stamp.radius - 0.5));
      const maxY = Math.min(height - 1, Math.floor(stamp.y + stamp.radius - 0.5));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        // Pixel centers are at (x + .5, y + .5); the circle boundary is inclusive.
        const dx = x + 0.5 - stamp.x, dy = y + 0.5 - stamp.y;
        if (dx * dx + dy * dy <= stamp.radius * stamp.radius) pixels[(y * width + x) * 4 + 3] = stroke.mode === 'reveal' ? 0 : 255;
      }
    }
  }
  return pixels;
}
