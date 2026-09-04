import React, { useEffect, useRef } from 'react';
import { BrushSettings } from '../types';

interface BrushStrokePreviewProps {
  brush: BrushSettings;
  width?: number;
  height?: number;
  strokeColor?: string; // default white like authentic Clip Studio Paint
  className?: string;
}

/**
 * Renders an authentic Clip Studio Paint style S-curve stroke preview
 * displaying the brush's real tip shape, hardness, opacity, stipple/bristles,
 * and pressure taper.
 */
export const BrushStrokePreview: React.FC<BrushStrokePreviewProps> = ({
  brush,
  width = 120,
  height = 32,
  strokeColor = '#ffffff',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use devicePixelRatio for crisp retina display
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Calculate normalized preview radius based on brush size and characteristics
    // Keeps it well-framed within the 32px preview height while showing size contrast
    const sizeRatio = Math.min(1, Math.max(0.1, brush.size / 60));
    const baseRadius = 2.0 + sizeRatio * 6.5;

    // S-curve parametric definition
    // Start with a small inset
    const startX = 10;
    const endX = width - 10;
    const curveAmp = Math.min(8, height * 0.25);
    const centerY = height / 2;

    const steps = 75;
    const points: { x: number; y: number; pressure: number; angle: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + t * (endX - startX);
      // Double wave S-curve matching Clip Studio Paint Sub Tool preview
      const y = centerY - Math.sin(t * Math.PI * 2) * curveAmp;

      // Tangent angle
      const dx = (endX - startX) / steps;
      const dy = -Math.cos(t * Math.PI * 2) * (Math.PI * 2) * curveAmp / steps;
      const angle = Math.atan2(dy, dx);

      // Pressure profile: delicate start, swelling belly at loops, tapering off to fine tip
      let pressure: number;
      if (brush.pressureSize) {
        pressure = Math.sin(t * Math.PI) ** 0.85 * (0.8 + 0.3 * Math.abs(Math.sin(t * Math.PI * 2)));
        pressure = Math.max(0.12, Math.min(1.0, pressure));
      } else {
        pressure = 0.9;
      }

      points.push({ x, y, pressure, angle });
    }

    // Parse base color
    let r = 255;
    let g = 255;
    let b = 255;
    if (strokeColor.startsWith('#')) {
      const hex = strokeColor.replace('#', '');
      const num = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
      r = (num >> 16) & 255;
      g = (num >> 8) & 255;
      b = num & 255;
    }

    // Step through and stamp the brush along the curve
    ctx.save();

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const curRadius = Math.max(0.8, baseRadius * pt.pressure);

      // Opacity dynamic
      let alpha = brush.opacity;
      if (brush.pressureOpacity) {
        alpha *= Math.max(0.15, pt.pressure);
      }
      alpha = Math.min(1, Math.max(0.05, alpha));

      ctx.save();
      ctx.globalAlpha = alpha;

      switch (brush.tipShape) {
        case 'calligraphy': {
          ctx.translate(pt.x, pt.y);
          ctx.rotate(((brush.angle || 45) * Math.PI) / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, curRadius * 1.3, curRadius * 0.35, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
          break;
        }

        case 'flat': {
          ctx.translate(pt.x, pt.y);
          ctx.rotate(((brush.angle || 25) * Math.PI) / 180);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(-curRadius * 1.2, -curRadius * 0.45, curRadius * 2.4, curRadius * 0.9);
          break;
        }

        case 'chisel': {
          ctx.translate(pt.x, pt.y);
          ctx.rotate(((brush.angle || 60) * Math.PI) / 180);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(-curRadius, -curRadius * 0.3, curRadius * 2, curRadius * 0.6);
          break;
        }

        case 'stipple': {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          const dots = Math.max(2, Math.floor(curRadius * 1.2));
          for (let d = 0; d < dots; d++) {
            const rad = Math.random() * curRadius;
            const a = Math.random() * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(pt.x + Math.cos(a) * rad, pt.y + Math.sin(a) * rad, Math.max(0.5, 0.9 - rad / curRadius * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'round':
        default: {
          if (brush.category === 'airbrush' || brush.hardness <= 0.25) {
            // Soft airbrush gradient
            const grad = ctx.createRadialGradient(
              pt.x,
              pt.y,
              Math.max(0.2, curRadius * 0.1),
              pt.x,
              pt.y,
              curRadius * 1.4
            );
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, curRadius * 1.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (brush.hardness < 0.85) {
            // Watercolor soft blend with slight water edge
            const grad = ctx.createRadialGradient(
              pt.x,
              pt.y,
              Math.max(0.4, curRadius * (brush.hardness * 0.5)),
              pt.x,
              pt.y,
              curRadius
            );
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
            grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, curRadius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Crisp solid inking stroke (G-Pen style)
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, curRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
          }
          break;
        }
      }

      // Dual Brush Overlay in Preview
      if (brush.dualBrush?.enabled) {
        const db = brush.dualBrush;
        const dualRadius = Math.max(0.6, curRadius * (db.sizeRatio || 0.8));
        ctx.save();
        ctx.globalCompositeOperation = db.blendMode || 'multiply';
        ctx.globalAlpha = Math.min(1, Math.max(0.05, alpha * (db.textureIntensity ?? 0.75)));

        if (db.tipShape === 'stipple') {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          const dots = Math.max(2, Math.floor(dualRadius * 0.8));
          for (let d = 0; d < dots; d++) {
            const da = Math.random() * Math.PI * 2;
            const dist = Math.random() * dualRadius;
            ctx.beginPath();
            ctx.arc(pt.x + Math.cos(da) * dist, pt.y + Math.sin(da) * dist, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (db.tipShape === 'flat') {
          ctx.translate(pt.x, pt.y);
          ctx.rotate(((db.angle || 30) * Math.PI) / 180);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(-dualRadius, -dualRadius * 0.4, dualRadius * 2, dualRadius * 0.8);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dualRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [brush, width, height, strokeColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`shrink-0 pointer-events-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
