export function imageSize(
  bytes: ArrayBuffer,
): { width: number; height: number } | undefined {
  const b = new Uint8Array(bytes);
  if (b.length < 24) return undefined;
  const view = new DataView(bytes);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 8) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      if (marker === 0xff) {
        i += 1;
        continue;
      }
      const len = (b[i + 2] << 8) + b[i + 3];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: (b[i + 5] << 8) + b[i + 6],
          width: (b[i + 7] << 8) + b[i + 8],
        };
      }
      i += 2 + len;
    }
  }
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (tag === "VP8 " && b.length >= 30) {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (tag === "VP8L" && b.length >= 25) {
      const bits = view.getUint32(21, true);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (tag === "VP8X" && b.length >= 30) {
      return {
        width: u24(view, 24) + 1,
        height: u24(view, 27) + 1,
      };
    }
  }
  return undefined;
}

function u24(view: DataView, offset: number): number {
  return (
    view.getUint8(offset) |
    (view.getUint8(offset + 1) << 8) |
    (view.getUint8(offset + 2) << 16)
  );
}
