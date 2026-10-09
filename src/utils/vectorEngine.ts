import { Layer, Point, VectorStroke, VectorText, VectorPath, VectorNode, BrushSettings } from '../types';
import { drawSegment, parseColor } from './brushEngine';

/**
 * Render a single VectorStroke onto a canvas context with optional scale and width multiplier.
 */
export function renderVectorStroke(
  ctx: CanvasRenderingContext2D,
  stroke: VectorStroke,
  scaleX: number = 1,
  scaleY: number = 1,
  widthMultiplier: number = 1
) {
  if (!stroke.points || stroke.points.length === 0) return;

  const colorRgb = parseColor(stroke.color);
  const effectiveBrush: BrushSettings = {
    ...stroke.brush,
    size: Math.max(0.5, stroke.brush.size * widthMultiplier * ((scaleX + scaleY) / 2)),
  };

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const scaledP: Point = {
      x: p.x * scaleX,
      y: p.y * scaleY,
      pressure: p.pressure,
      time: p.time,
    };
    drawSegment(ctx, scaledP, scaledP, effectiveBrush, colorRgb, stroke.isEraser);
    return;
  }

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    const scaledP1: Point = {
      x: p1.x * scaleX,
      y: p1.y * scaleY,
      pressure: p1.pressure,
      time: p1.time,
    };
    const scaledP2: Point = {
      x: p2.x * scaleX,
      y: p2.y * scaleY,
      pressure: p2.pressure,
      time: p2.time,
    };
    drawSegment(ctx, scaledP1, scaledP2, effectiveBrush, colorRgb, stroke.isEraser);
  }
}

/**
 * Render a 2D CAD Vector Path (polygons, polylines, Bezier curves) onto canvas context.
 */
export function renderVectorPath(
  ctx: CanvasRenderingContext2D,
  path: VectorPath,
  scaleX: number = 1,
  scaleY: number = 1,
  widthMultiplier: number = 1
): void {
  if (!path.nodes || path.nodes.length === 0) return;

  ctx.save();
  ctx.globalAlpha = path.opacity ?? 1;

  ctx.beginPath();
  const first = path.nodes[0];
  ctx.moveTo(first.x * scaleX, first.y * scaleY);

  for (let i = 0; i < path.nodes.length - 1; i++) {
    const curr = path.nodes[i];
    const next = path.nodes[i + 1];

    if (curr.handleOut || next.handleIn) {
      const cp1 = curr.handleOut
        ? { x: curr.handleOut.x * scaleX, y: curr.handleOut.y * scaleY }
        : { x: curr.x * scaleX, y: curr.y * scaleY };
      const cp2 = next.handleIn
        ? { x: next.handleIn.x * scaleX, y: next.handleIn.y * scaleY }
        : { x: next.x * scaleX, y: next.y * scaleY };
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x * scaleX, next.y * scaleY);
    } else {
      ctx.lineTo(next.x * scaleX, next.y * scaleY);
    }
  }

  if (path.closed && path.nodes.length > 1) {
    const last = path.nodes[path.nodes.length - 1];
    if (last.handleOut || first.handleIn) {
      const cp1 = last.handleOut
        ? { x: last.handleOut.x * scaleX, y: last.handleOut.y * scaleY }
        : { x: last.x * scaleX, y: last.y * scaleY };
      const cp2 = first.handleIn
        ? { x: first.handleIn.x * scaleX, y: first.handleIn.y * scaleY }
        : { x: first.x * scaleX, y: first.y * scaleY };
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.x * scaleX, first.y * scaleY);
    } else {
      ctx.lineTo(first.x * scaleX, first.y * scaleY);
    }
    ctx.closePath();
  }

  // Fill path if set
  if (path.fillColor && path.fillColor !== 'none' && path.fillColor !== 'transparent') {
    ctx.fillStyle = path.fillColor;
    ctx.fill(path.fillRule || 'nonzero');
  }

  // Stroke path
  const strokeW = Math.max(0.5, (path.strokeWidth || 1) * widthMultiplier * ((scaleX + scaleY) / 2));
  if (path.strokeColor && path.strokeColor !== 'none' && path.strokeColor !== 'transparent' && strokeW > 0) {
    ctx.strokeStyle = path.strokeColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = path.strokeCap || 'round';
    ctx.lineJoin = path.strokeJoin || 'round';

    if (path.strokeDash === 'dashed') {
      ctx.setLineDash([strokeW * 3, strokeW * 2]);
    } else if (path.strokeDash === 'dotted') {
      ctx.setLineDash([strokeW, strokeW * 1.5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render Vector Text with full typography styles (font weight, styles, letter spacing, decoration, stroke, shadow).
 */
export function renderVectorText(ctx: CanvasRenderingContext2D, item: VectorText): void {
  ctx.save();

  // Shadow
  if (item.shadowColor && item.shadowBlur && item.shadowBlur > 0) {
    ctx.shadowColor = item.shadowColor;
    ctx.shadowBlur = item.shadowBlur;
    ctx.shadowOffsetX = item.shadowOffsetX || 0;
    ctx.shadowOffsetY = item.shadowOffsetY || 0;
  }

  const weight = item.fontWeight || (item.bold ? '700' : '400');
  const style = item.italic ? 'italic ' : '';
  ctx.font = `${style}${weight} ${Math.round(item.fontSize)}px "${item.fontFamily}", sans-serif`;
  ctx.textAlign = item.align || 'left';
  ctx.textBaseline = 'top';

  // Letter spacing support if available in canvas context
  if ('letterSpacing' in ctx && typeof item.letterSpacing === 'number') {
    (ctx as any).letterSpacing = `${item.letterSpacing}px`;
  }

  let displayText = item.text || '';
  if (item.uppercase) {
    displayText = displayText.toUpperCase();
  }

  const lines = displayText.split('\n');
  const lineHeight = item.lineHeight || Math.round(item.fontSize * 1.25);

  lines.forEach((line, index) => {
    const yPos = item.y + index * lineHeight;

    // Stroke outline
    if (item.strokeColor && item.strokeWidth && item.strokeWidth > 0) {
      ctx.strokeStyle = item.strokeColor;
      ctx.lineWidth = item.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, item.x, yPos);
    }

    // Fill
    ctx.fillStyle = item.color;
    ctx.fillText(line, item.x, yPos);

    // Text decorations: Underline & Strikethrough
    if (item.underline || item.strikethrough) {
      const metrics = ctx.measureText(line);
      const textWidth = metrics.width;
      let startX = item.x;
      if (item.align === 'center') {
        startX = item.x - textWidth / 2;
      } else if (item.align === 'right') {
        startX = item.x - textWidth;
      }

      ctx.lineWidth = Math.max(1, Math.round(item.fontSize / 16));
      ctx.strokeStyle = item.color;

      if (item.underline) {
        const lineY = yPos + item.fontSize + 2;
        ctx.beginPath();
        ctx.moveTo(startX, lineY);
        ctx.lineTo(startX + textWidth, lineY);
        ctx.stroke();
      }

      if (item.strikethrough) {
        const lineY = yPos + item.fontSize * 0.55;
        ctx.beginPath();
        ctx.moveTo(startX, lineY);
        ctx.lineTo(startX + textWidth, lineY);
        ctx.stroke();
      }
    }
  });

  ctx.restore();
}

/**
 * Measure text bounding box on canvas.
 */
export function measureVectorTextBounds(
  ctx: CanvasRenderingContext2D,
  item: VectorText
): { x: number; y: number; width: number; height: number } {
  ctx.save();
  const weight = item.fontWeight || (item.bold ? '700' : '400');
  const style = item.italic ? 'italic ' : '';
  ctx.font = `${style}${weight} ${Math.round(item.fontSize)}px "${item.fontFamily}", sans-serif`;

  let displayText = item.text || '';
  if (item.uppercase) displayText = displayText.toUpperCase();
  const lines = displayText.split('\n');
  const lineHeight = item.lineHeight || Math.round(item.fontSize * 1.25);

  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);

  let x = item.x;
  if (item.align === 'center') {
    x = item.x - maxWidth / 2;
  } else if (item.align === 'right') {
    x = item.x - maxWidth;
  }

  ctx.restore();
  return {
    x,
    y: item.y,
    width: Math.max(16, maxWidth),
    height: totalHeight,
  };
}

/**
 * Re-render all vector strokes, paths, and texts of a layer onto its canvas context.
 */
export function reRenderVectorLayer(
  layer: Layer,
  scaleX: number = 1,
  scaleY: number = 1,
  widthMultiplier: number = 1
) {
  if (!layer.vectorStrokes && !layer.vectorTexts && !layer.vectorPaths) return;
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

  for (const stroke of layer.vectorStrokes || []) {
    renderVectorStroke(layer.ctx, stroke, scaleX, scaleY, widthMultiplier);
  }
  for (const path of layer.vectorPaths || []) {
    renderVectorPath(layer.ctx, path, scaleX, scaleY, widthMultiplier);
  }
  for (const item of layer.vectorTexts || []) {
    renderVectorText(layer.ctx, {
      ...item,
      x: item.x * scaleX,
      y: item.y * scaleY,
      fontSize: item.fontSize * ((scaleX + scaleY) / 2),
      lineHeight: item.lineHeight * ((scaleX + scaleY) / 2),
    });
  }
}

/**
 * Ramer-Douglas-Peucker line simplification for vector strokes.
 * Removes redundant points while preserving overall shape and sharp corners.
 */
function getPerpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const last = points.length - 1;

  for (let i = 1; i < last; i++) {
    const dist = getPerpendicularDistance(points[i], points[0], points[last]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilon);
    const right = rdpSimplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[last]];
}

/**
 * Smart Curve Smoothing & Tremor Filter for Vector Strokes.
 * Identifies sharp corners (angles > 65 deg) to keep them crisp,
 * while applying Catmull-Rom style relaxation to curved spans.
 */
export function smartCleanUpVectorStroke(stroke: VectorStroke, tolerance: number = 1.2): VectorStroke {
  if (stroke.points.length <= 3) return stroke;

  // 1. Simplify micro-jitters
  const simplified = rdpSimplify(stroke.points, tolerance);

  // 2. Chaikin corner-preserving relaxation
  const smoothed: Point[] = [simplified[0]];

  for (let i = 1; i < simplified.length - 1; i++) {
    const p0 = simplified[i - 1];
    const p1 = simplified[i];
    const p2 = simplified[i + 1];

    // Check turning angle to preserve sharp corners
    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);

    const cosTheta = mag1 > 0 && mag2 > 0 ? dot / (mag1 * mag2) : 1;

    // If corner is sharp (angle change > 65 deg / cos < 0.42), keep sharp node
    if (cosTheta < 0.42) {
      smoothed.push(p1);
    } else {
      // Smooth curve interpolation
      const q: Point = {
        x: 0.75 * p1.x + 0.25 * p0.x,
        y: 0.75 * p1.y + 0.25 * p0.y,
        pressure: p1.pressure,
        time: p1.time,
      };
      const r: Point = {
        x: 0.75 * p1.x + 0.25 * p2.x,
        y: 0.75 * p1.y + 0.25 * p2.y,
        pressure: p1.pressure,
        time: p1.time,
      };
      smoothed.push(q);
      smoothed.push(r);
    }
  }

  smoothed.push(simplified[simplified.length - 1]);

  return {
    ...stroke,
    points: smoothed,
  };
}

/**
 * Clean up / smooth all strokes on a vector layer.
 */
export function cleanUpVectorLayer(layer: Layer, tolerance: number = 1.2) {
  if (!layer.vectorStrokes || layer.vectorStrokes.length === 0) return;
  layer.vectorStrokes = layer.vectorStrokes.map((s) => smartCleanUpVectorStroke(s, tolerance));
  reRenderVectorLayer(layer);
}

/**
 * Adjust the line width (stroke weight) of all strokes on a vector layer.
 */
export function adjustVectorLayerWidth(layer: Layer, factor: number) {
  if (layer.vectorStrokes) {
    layer.vectorStrokes = layer.vectorStrokes.map((s) => ({
      ...s,
      brush: {
        ...s.brush,
        size: Math.max(1, Math.min(200, Math.round(s.brush.size * factor))),
      },
    }));
  }
  if (layer.vectorPaths) {
    layer.vectorPaths = layer.vectorPaths.map((p) => ({
      ...p,
      strokeWidth: Math.max(0.5, Math.min(100, Math.round(p.strokeWidth * factor * 10) / 10)),
    }));
  }
  reRenderVectorLayer(layer);
}

export const adjustVectorStrokeWidths = adjustVectorLayerWidth;

/**
 * Scale the entire vector layer cleanly without resolution pixelation.
 */
export function scaleVectorLayer(layer: Layer, scaleFactor: number) {
  const hasStrokes = !!layer.vectorStrokes?.length;
  const hasTexts = !!layer.vectorTexts?.length;
  const hasPaths = !!layer.vectorPaths?.length;
  if (!hasStrokes && !hasTexts && !hasPaths) return;

  const cx = layer.canvas.width / 2;
  const cy = layer.canvas.height / 2;

  if (layer.vectorStrokes) {
    layer.vectorStrokes = layer.vectorStrokes.map((s) => ({
      ...s,
      brush: {
        ...s.brush,
        size: Math.max(1, Math.round(s.brush.size * scaleFactor)),
      },
      points: s.points.map((p) => ({
        ...p,
        x: cx + (p.x - cx) * scaleFactor,
        y: cy + (p.y - cy) * scaleFactor,
      })),
    }));
  }

  if (layer.vectorPaths) {
    layer.vectorPaths = layer.vectorPaths.map((path) => ({
      ...path,
      strokeWidth: Math.max(0.5, path.strokeWidth * scaleFactor),
      nodes: path.nodes.map((node) => ({
        ...node,
        x: cx + (node.x - cx) * scaleFactor,
        y: cy + (node.y - cy) * scaleFactor,
        handleIn: node.handleIn
          ? { x: cx + (node.handleIn.x - cx) * scaleFactor, y: cy + (node.handleIn.y - cy) * scaleFactor }
          : undefined,
        handleOut: node.handleOut
          ? { x: cx + (node.handleOut.x - cx) * scaleFactor, y: cy + (node.handleOut.y - cy) * scaleFactor }
          : undefined,
      })),
    }));
  }

  if (layer.vectorTexts) {
    layer.vectorTexts = layer.vectorTexts.map((item) => ({
      ...item,
      x: cx + (item.x - cx) * scaleFactor,
      y: cy + (item.y - cy) * scaleFactor,
      fontSize: item.fontSize * scaleFactor,
      lineHeight: item.lineHeight * scaleFactor,
    }));
  }

  reRenderVectorLayer(layer);
}

/**
 * Erase vector strokes/paths touching the given (x, y) coordinates within hitRadius.
 */
export function vectorEraseAt(layer: Layer, x: number, y: number, hitRadius: number): boolean {
  let changed = false;

  if (layer.vectorStrokes && layer.vectorStrokes.length > 0) {
    const initialStrokes = layer.vectorStrokes.length;
    layer.vectorStrokes = layer.vectorStrokes.filter((stroke) => {
      for (const p of stroke.points) {
        if (Math.hypot(p.x - x, p.y - y) <= hitRadius + stroke.brush.size / 2) {
          return false;
        }
      }
      return true;
    });
    if (layer.vectorStrokes.length !== initialStrokes) changed = true;
  }

  if (layer.vectorPaths && layer.vectorPaths.length > 0) {
    const initialPaths = layer.vectorPaths.length;
    layer.vectorPaths = layer.vectorPaths.filter((path) => {
      for (const node of path.nodes) {
        if (Math.hypot(node.x - x, node.y - y) <= hitRadius + path.strokeWidth / 2) {
          return false;
        }
      }
      return true;
    });
    if (layer.vectorPaths.length !== initialPaths) changed = true;
  }

  if (layer.vectorTexts && layer.vectorTexts.length > 0) {
    const initialTexts = layer.vectorTexts.length;
    layer.vectorTexts = layer.vectorTexts.filter((t) => {
      return Math.hypot(t.x - x, t.y - y) > hitRadius + t.fontSize / 2;
    });
    if (layer.vectorTexts.length !== initialTexts) changed = true;
  }

  if (changed) {
    reRenderVectorLayer(layer);
    return true;
  }
  return false;
}
