import { Layer, Point, VectorStroke, BrushSettings } from '../types';
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
 * Re-render all vector strokes of a layer onto its canvas context.
 */
export function reRenderVectorLayer(
  layer: Layer,
  scaleX: number = 1,
  scaleY: number = 1,
  widthMultiplier: number = 1
) {
  if (!layer.vectorStrokes) return;
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

  for (const stroke of layer.vectorStrokes) {
    renderVectorStroke(layer.ctx, stroke, scaleX, scaleY, widthMultiplier);
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
 * Factor: e.g. 1.2 = +20% thicker, 0.8 = -20% thinner.
 */
export function adjustVectorLayerWidth(layer: Layer, factor: number) {
  if (!layer.vectorStrokes || layer.vectorStrokes.length === 0) return;
  layer.vectorStrokes = layer.vectorStrokes.map((s) => ({
    ...s,
    brush: {
      ...s.brush,
      size: Math.max(1, Math.min(200, Math.round(s.brush.size * factor))),
    },
  }));
  reRenderVectorLayer(layer);
}

export const adjustVectorStrokeWidths = adjustVectorLayerWidth;

/**
 * Scale the entire vector layer cleanly without resolution pixelation.
 */
export function scaleVectorLayer(layer: Layer, scaleFactor: number) {
  if (!layer.vectorStrokes || layer.vectorStrokes.length === 0) return;
  const cx = layer.canvas.width / 2;
  const cy = layer.canvas.height / 2;

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
  reRenderVectorLayer(layer);
}

/**
 * Erase vector strokes touching the given (x, y) coordinates within hitRadius.
 * Returns true if any strokes were erased.
 */
export function vectorEraseAt(layer: Layer, x: number, y: number, hitRadius: number): boolean {
  if (!layer.vectorStrokes || layer.vectorStrokes.length === 0) return false;

  const initialCount = layer.vectorStrokes.length;
  layer.vectorStrokes = layer.vectorStrokes.filter((stroke) => {
    // Check if any point is within hitRadius
    for (const p of stroke.points) {
      if (Math.hypot(p.x - x, p.y - y) <= hitRadius + stroke.brush.size / 2) {
        return false; // remove stroke
      }
    }
    return true;
  });

  if (layer.vectorStrokes.length !== initialCount) {
    reRenderVectorLayer(layer);
    return true;
  }
  return false;
}
