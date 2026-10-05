interface DecodedPng {
  width: number;
  height: number;
}

interface UpngModule {
  decode: (buffer: ArrayBuffer) => DecodedPng;
  toRGBA8: (image: DecodedPng) => ArrayBuffer[];
}

export function decodePngToRgb(bytes: Uint8Array): { width: number; height: number; rgb: Uint8Array } {
  const upng = require('upng-js') as UpngModule;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const image = upng.decode(buffer);
  const rgba = new Uint8Array(upng.toRGBA8(image)[0]);
  const rgb = new Uint8Array(image.width * image.height * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4) {
    rgb[target] = rgba[source];
    rgb[target + 1] = rgba[source + 1];
    rgb[target + 2] = rgba[source + 2];
    target += 3;
  }
  return { width: image.width, height: image.height, rgb };
}
