import { BrushSettings, Point, BrushTipShape } from '../types';

export interface StrokeColorState {
  r: number;
  g: number;
  b: number;
  carriedR: number;
  carriedG: number;
  carriedB: number;
  carriedStrength: number; // 0 to 1, depletes along stroke
}

/**
 * Apply hardware pressure curves (linear, soft, firm, s-curve) to map Wacom pressure levels.
 */
export function applyPressureCurve(
  pressure: number,
  curve: 'linear' | 'soft' | 'firm' | 's-curve' = 'linear'
): number {
  const p = Math.max(0, Math.min(1, pressure));
  switch (curve) {
    case 'soft':
      // Higher output with light touch (sqrt response for effortless light sketching)
      return Math.pow(p, 0.65);
    case 'firm':
      // Requires deliberate force (pow response for controlled manga line-art)
      return Math.pow(p, 1.55);
    case 's-curve':
      // Sigmoid smooth curve (gentle start, steep middle, soft top)
      return p * p * (3 - 2 * p);
    case 'linear':
    default:
      return p;
  }
}

export class StrokeStabilizer {
  private buffer: Point[] = [];
  private windowSize: number = 5;

  constructor(stabilization: number = 10) {
    this.setStabilization(stabilization);
  }

  setStabilization(level: number) {
    // level 0..30 -> window size 1..16
    this.windowSize = Math.max(1, Math.round(level / 2) + 1);
  }

  reset() {
    this.buffer = [];
  }

  addPoint(p: Point): Point {
    if (this.windowSize <= 1) {
      return p;
    }

    this.buffer.push(p);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    // Weighted moving average: points closer to the latest point have slightly higher weight
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    let sumPressure = 0;
    let sumTiltX = 0;
    let sumTiltY = 0;
    let sumTwist = 0;
    let hasTilt = false;
    let hasTwist = false;

    for (let i = 0; i < this.buffer.length; i++) {
      const weight = i + 1;
      totalWeight += weight;
      sumX += this.buffer[i].x * weight;
      sumY += this.buffer[i].y * weight;
      sumPressure += this.buffer[i].pressure * weight;

      if (this.buffer[i].tiltX !== undefined && this.buffer[i].tiltY !== undefined) {
        sumTiltX += (this.buffer[i].tiltX ?? 0) * weight;
        sumTiltY += (this.buffer[i].tiltY ?? 0) * weight;
        hasTilt = true;
      }

      if (this.buffer[i].twist !== undefined) {
        sumTwist += (this.buffer[i].twist ?? 0) * weight;
        hasTwist = true;
      }
    }

    const result: Point = {
      ...p,
      x: sumX / totalWeight,
      y: sumY / totalWeight,
      pressure: sumPressure / totalWeight,
      time: p.time,
    };

    if (hasTilt) {
      result.tiltX = sumTiltX / totalWeight;
      result.tiltY = sumTiltY / totalWeight;
    }

    if (hasTwist) {
      result.twist = sumTwist / totalWeight;
    }

    return result;
  }
}

/**
 * Smart Stroke Correction & Hand-Tremor Filter.
 * Eliminates micro-jitters while detecting and preserving intentional sharp corners (angles > 65°).
 */
export function smartCorrectStroke(points: Point[], preserveCorners: boolean = true): Point[] {
  if (points.length <= 3) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (preserveCorners) {
      // Vector turn calculation
      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.hypot(v1x, v1y);
      const mag2 = Math.hypot(v2x, v2y);
      const cosAngle = mag1 > 0 && mag2 > 0 ? dot / (mag1 * mag2) : 1;

      // If angle change > 65 deg (cos < 0.42), anchor sharp corner
      if (cosAngle < 0.42) {
        result.push(curr);
        continue;
      }
    }

    // Gaussian smoothing window [0.25, 0.5, 0.25]
    result.push({
      ...curr,
      x: 0.25 * prev.x + 0.5 * curr.x + 0.25 * next.x,
      y: 0.25 * prev.y + 0.5 * curr.y + 0.25 * next.y,
      pressure: 0.25 * prev.pressure + 0.5 * curr.pressure + 0.25 * next.pressure,
      time: curr.time,
    });
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Apply lead-in and lead-out pressure tapering for crisp manga/inking line ends.
 */
export function applyStrokeTapering(points: Point[], taperFactor: number = 0.5): Point[] {
  if (points.length < 6 || taperFactor <= 0) return points;

  const count = points.length;
  const taperSpan = Math.min(12, Math.max(3, Math.floor(count * 0.15)));

  return points.map((p, idx) => {
    let multiplier = 1;

    // Lead-in taper
    if (idx < taperSpan) {
      const t = idx / taperSpan;
      multiplier = 0.2 + 0.8 * (t ** 1.5);
    }
    // Lead-out taper
    else if (idx >= count - taperSpan) {
      const t = (count - 1 - idx) / taperSpan;
      multiplier = 0.2 + 0.8 * (t ** 1.5);
    }

    return {
      ...p,
      pressure: p.pressure * (1 - taperFactor * (1 - multiplier)),
    };
  });
}

// Convert hex color + alpha to RGBA components
export function parseColor(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  // Default dark tone if unparseable
  return { r: 30, g: 30, b: 30 };
}

/**
 * Render a single tip stamp on canvas with support for tip shape, angle, hardness,
 * dual brush composition, physical color mixing, Wacom pressure curves, tilt shading, and barrel rotation.
 */
export function drawBrushStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  brush: BrushSettings,
  colorRgb: { r: number; g: number; b: number },
  pressure: number,
  isEraser: boolean = false,
  colorState?: StrokeColorState,
  tiltX?: number,
  tiltY?: number,
  twist?: number
) {
  if (radius <= 0) return;

  // Apply mapped hardware pressure curve
  const mappedPressure = applyPressureCurve(pressure, brush.pressureCurve || 'linear');

  ctx.save();

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  // Calculate actual opacity based on pressure settings
  let effectiveAlpha = brush.opacity * (brush.flow || 1);
  if (brush.pressureOpacity) {
    effectiveAlpha *= Math.max(0.1, mappedPressure);
  }

  // Wacom Stylus Dynamics (Tilt & Rotation)
  let effectiveRadius = radius;
  let effectiveAngle = brush.angle || 0;
  let tiltParams: { tiltFactor: number; azimuth: number; aspect: number } | undefined;

  // 1. Wacom Barrel Rotation (Twist) - 360° rotation from Art Pen / 6DOF Stylus
  if (twist !== undefined && twist > 0 && brush.rotationTwist !== false) {
    effectiveAngle = (effectiveAngle + twist) % 360;
  }

  // 2. Wacom Stylus Tilt Dynamics (tiltX, tiltY)
  if (brush.tiltSensitivity !== false && tiltX !== undefined && tiltY !== undefined) {
    const tiltDist = Math.hypot(tiltX, tiltY); // 0 (perpendicular) to ~90 (flat on surface)
    if (tiltDist > 8) {
      const tiltFactor = Math.min(1.0, (tiltDist - 8) / 60);
      const azimuth = (Math.atan2(tiltY, tiltX) * 180) / Math.PI;

      // If pen hardware does not support barrel twist, tilt direction guides directional nibs
      if ((twist === undefined || twist === 0) && brush.tipShape !== 'round') {
        effectiveAngle = (brush.angle + azimuth) % 360;
      }

      // Tilt shading expansion (simulates drawing with the side of a graphite lead or chalk)
      if (brush.tiltShading || brush.category === 'pencil') {
        effectiveRadius *= 1 + tiltFactor * 1.5;
        effectiveAlpha *= Math.max(0.4, 1 - tiltFactor * 0.35); // Broad soft shading
      }

      tiltParams = {
        tiltFactor,
        azimuth,
        aspect: Math.max(0.3, 1 - tiltFactor * 0.55),
      };
    }
  }

  ctx.globalAlpha = Math.min(1, Math.max(0, effectiveAlpha));

  // ================= 1. REALISTIC COLOR MIXING & PIGMENT PULL =================
  let { r, g, b } = colorRgb;

  if (brush.mixGroundColor && !isEraser && brush.colorMixRatio > 0) {
    try {
      // Area sample under brush footprint (up to 7x7 sample) for physical paint pickup
      const sampleRadius = Math.min(6, Math.max(1, Math.floor(effectiveRadius * 0.35)));
      const sampleDiameter = sampleRadius * 2 + 1;
      const sampleData = ctx.getImageData(
        Math.floor(x - sampleRadius),
        Math.floor(y - sampleRadius),
        sampleDiameter,
        sampleDiameter
      ).data;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let alphaCount = 0;

      for (let i = 0; i < sampleData.length; i += 4) {
        const a = sampleData[i + 3];
        if (a > 15) {
          rSum += sampleData[i];
          gSum += sampleData[i + 1];
          bSum += sampleData[i + 2];
          alphaCount++;
        }
      }

      if (alphaCount > 0) {
        const avgR = rSum / alphaCount;
        const avgG = gSum / alphaCount;
        const avgB = bSum / alphaCount;

        const mixRatio = Math.min(0.9, brush.colorMixRatio * (alphaCount / (sampleDiameter * sampleDiameter)));
        r = Math.round(r * (1 - mixRatio) + avgR * mixRatio);
        g = Math.round(g * (1 - mixRatio) + avgG * mixRatio);
        b = Math.round(b * (1 - mixRatio) + avgB * mixRatio);

        // Update stroke color state for pigment stretch & smear across strokes
        if (colorState) {
          const smearAmount = brush.colorSmear ?? 0.5;
          colorState.carriedR = avgR;
          colorState.carriedG = avgG;
          colorState.carriedB = avgB;
          colorState.carriedStrength = Math.min(1, colorState.carriedStrength + smearAmount * 0.3);
        }
      }
    } catch {
      // ignore coordinate bounds
    }
  }

  // Smear carrying: if the brush is carrying wet pigment, it blends along the stroke
  if (colorState && colorState.carriedStrength > 0.02 && !isEraser) {
    const pullWeight = colorState.carriedStrength * 0.5;
    r = Math.round(r * (1 - pullWeight) + colorState.carriedR * pullWeight);
    g = Math.round(g * (1 - pullWeight) + colorState.carriedG * pullWeight);
    b = Math.round(b * (1 - pullWeight) + colorState.carriedB * pullWeight);
    // Gradual pigment falloff/depletion as brush travels
    colorState.carriedStrength *= 0.985;
  }

  // Jitter offset if any
  let stampX = x;
  let stampY = y;
  if (brush.jitter > 0) {
    const jDist = effectiveRadius * brush.jitter * 1.5;
    stampX += (Math.random() - 0.5) * jDist;
    stampY += (Math.random() - 0.5) * jDist;
  }

  // Render Primary Stamp Tip Shape with tilt and rotation angle
  renderTipShape(
    ctx,
    brush.tipShape,
    stampX,
    stampY,
    effectiveRadius,
    effectiveAngle,
    brush.hardness,
    r,
    g,
    b,
    tiltParams
  );

  // ================= 2. ADVANCED DUAL BRUSH ENGINE =================
  if (brush.dualBrush?.enabled && !isEraser) {
    const db = brush.dualBrush;
    const dualRadius = Math.max(1, effectiveRadius * (db.sizeRatio || 0.8));
    ctx.save();
    ctx.globalCompositeOperation = db.blendMode || 'multiply';
    ctx.globalAlpha = Math.min(1, Math.max(0.05, effectiveAlpha * (db.textureIntensity ?? 0.75)));

    let dualStampX = stampX;
    let dualStampY = stampY;
    if (db.jitter > 0) {
      const djDist = dualRadius * db.jitter * 1.5;
      dualStampX += (Math.random() - 0.5) * djDist;
      dualStampY += (Math.random() - 0.5) * djDist;
    }

    const dualAngle = (db.angle || 0) + (twist || 0);

    renderTipShape(
      ctx,
      db.tipShape || 'stipple',
      dualStampX,
      dualStampY,
      dualRadius,
      dualAngle,
      db.hardness || 0.5,
      r,
      g,
      b,
      tiltParams
    );
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Helper to render individual tip shapes (round, chisel, calligraphy, flat, stipple)
 * with elliptical tilt geometry distortion.
 */
function renderTipShape(
  ctx: CanvasRenderingContext2D,
  tipShape: BrushTipShape,
  stampX: number,
  stampY: number,
  radius: number,
  angle: number,
  hardness: number,
  r: number,
  g: number,
  b: number,
  tiltParams?: { tiltFactor: number; azimuth: number; aspect: number }
) {
  const applyTiltTransform = Boolean(tiltParams && tiltParams.tiltFactor > 0.05);

  if (applyTiltTransform && tiltParams) {
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate((tiltParams.azimuth * Math.PI) / 180);
    ctx.scale(1 + tiltParams.tiltFactor * 1.2, tiltParams.aspect);
    ctx.rotate((-tiltParams.azimuth * Math.PI) / 180);
    ctx.translate(-stampX, -stampY);
  }

  switch (tipShape) {
    case 'chisel': {
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(((angle || 45) * Math.PI) / 180);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      const w = radius * 2;
      const h = radius * 0.45;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
      break;
    }

    case 'calligraphy': {
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(((angle || 45) * Math.PI) / 180);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'flat': {
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(((angle || 0) * Math.PI) / 180);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(-radius, -radius * 0.5, radius * 2, radius);
      ctx.restore();
      break;
    }

    case 'stipple': {
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      const dotsCount = Math.max(3, Math.floor(radius * 1.3));
      for (let i = 0; i < dotsCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const dotX = stampX + Math.cos(a) * dist;
        const dotY = stampY + Math.sin(a) * dist;
        const dotR = Math.max(0.6, (1 - dist / radius) * 1.8);
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'round':
    default: {
      if (hardness >= 0.9) {
        ctx.beginPath();
        ctx.arc(stampX, stampY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(
          stampX,
          stampY,
          Math.max(0.5, radius * hardness),
          stampX,
          stampY,
          radius
        );
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(stampX, stampY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  if (applyTiltTransform) {
    ctx.restore();
  }
}

/**
 * Draw smooth stroke segment between p1 and p2 with continuous stamp deposition,
 * interpolating pressure, tiltX, tiltY, and Wacom twist rotation across the segment.
 */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  brush: BrushSettings,
  colorRgb: { r: number; g: number; b: number },
  isEraser: boolean = false,
  colorState?: StrokeColorState
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  const baseRadius = brush.size / 2;
  const mappedP1 = applyPressureCurve(p1.pressure, brush.pressureCurve || 'linear');
  const mappedP2 = applyPressureCurve(p2.pressure, brush.pressureCurve || 'linear');
  const r1 = brush.pressureSize ? baseRadius * Math.max(0.15, mappedP1) : baseRadius;
  const r2 = brush.pressureSize ? baseRadius * Math.max(0.15, mappedP2) : baseRadius;

  const spacing = Math.max(1, baseRadius * (brush.spacing || 0.1));
  const steps = Math.max(1, Math.ceil(dist / spacing));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curX = p1.x + dx * t;
    const curY = p1.y + dy * t;
    const curRadius = r1 + (r2 - r1) * t;
    const curPressure = mappedP1 + (mappedP2 - mappedP1) * t;

    const curTiltX =
      p1.tiltX !== undefined && p2.tiltX !== undefined
        ? p1.tiltX + (p2.tiltX - p1.tiltX) * t
        : p1.tiltX ?? p2.tiltX;
    const curTiltY =
      p1.tiltY !== undefined && p2.tiltY !== undefined
        ? p1.tiltY + (p2.tiltY - p1.tiltY) * t
        : p1.tiltY ?? p2.tiltY;
    const curTwist =
      p1.twist !== undefined && p2.twist !== undefined
        ? p1.twist + (p2.twist - p1.twist) * t
        : p1.twist ?? p2.twist;

    drawBrushStamp(
      ctx,
      curX,
      curY,
      curRadius,
      brush,
      colorRgb,
      curPressure,
      isEraser,
      colorState,
      curTiltX,
      curTiltY,
      curTwist
    );
  }
}
