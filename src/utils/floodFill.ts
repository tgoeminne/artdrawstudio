export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorRgb: { r: number; g: number; b: number },
  opacity: number = 1.0,
  tolerance: number = 32
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetIdx = (y0 * width + x0) * 4;
  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];
  const targetA = data[targetIdx + 3];

  const fillR = fillColorRgb.r;
  const fillG = fillColorRgb.g;
  const fillB = fillColorRgb.b;
  const fillA = Math.round(opacity * 255);

  // If clicking on already matching color, return
  if (
    Math.abs(targetR - fillR) < 3 &&
    Math.abs(targetG - fillG) < 3 &&
    Math.abs(targetB - fillB) < 3 &&
    Math.abs(targetA - fillA) < 3
  ) {
    return;
  }

  const matchTarget = (idx: number): boolean => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    return (
      Math.abs(r - targetR) <= tolerance &&
      Math.abs(g - targetG) <= tolerance &&
      Math.abs(b - targetB) <= tolerance &&
      Math.abs(a - targetA) <= tolerance
    );
  };

  const visited = new Uint8Array(width * height);
  const queue: number[] = [x0 + y0 * width];
  visited[x0 + y0 * width] = 1;

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const x = curr % width;
    const y = Math.floor(curr / width);
    const idx = curr * 4;

    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;

    // 4 neighbors
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const [nx, ny] = neighbors[i];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = nx + ny * width;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          const nIdx = nPos * 4;
          if (matchTarget(nIdx)) {
            queue.push(nPos);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
