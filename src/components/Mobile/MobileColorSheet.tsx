import React, { useRef, useEffect, useState } from 'react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ArrowLeftRight } from 'lucide-react';

interface MobileColorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  secondaryColor: string;
  onColorChange: (color: string) => void;
  onSwapColors: () => void;
}

// Convert HSV to Hex
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  let r = 0,
    g = 0,
    b = 0;
  const i = Math.floor((h / 60) % 6);
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, v };
}

const MANGA_SWATCHES = [
  '#1e293b', '#000000', '#4a4a4a', '#888888', '#d1d1d1', '#ffffff',
  '#fce2cf', '#f7c2a7', '#e29c81', '#9e5a40', '#63321f', '#361b10',
  '#ff4d4f', '#ff7a45', '#ffa940', '#ffec3d', '#73d13d', '#36cfc9',
  '#4096ff', '#597ef7', '#9254de', '#f759ab', '#4a90e2', '#2f54eb',
];

export const MobileColorSheet: React.FC<MobileColorSheetProps> = ({
  isOpen,
  onClose,
  primaryColor,
  secondaryColor,
  onColorChange,
  onSwapColors,
}) => {
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 215, s: 0.65, v: 0.4 });
  const [isInteracting, setIsInteracting] = useState<'ring' | 'square' | null>(null);

  // Sync HSV from incoming primaryColor
  useEffect(() => {
    try {
      const rgb = hexToRgb(primaryColor);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    } catch {
      // ignore
    }
  }, [primaryColor]);

  // Draw HSV Color Wheel & Center Square
  useEffect(() => {
    if (!isOpen) return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius - 20;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw outer hue ring
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 1.5) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(center, center, (outerRadius + innerRadius) / 2, startAngle, endAngle);
      const rgb = hsvToRgb(angle, 1, 1);
      ctx.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.lineWidth = outerRadius - innerRadius;
      ctx.stroke();
    }

    // Outer ring marker for selected hue
    const hueRad = (hsv.h * Math.PI) / 180;
    const markerRadius = (outerRadius + innerRadius) / 2;
    const markerX = center + Math.cos(hueRad) * markerRadius;
    const markerY = center + Math.sin(hueRad) * markerRadius;

    ctx.beginPath();
    ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Center Saturation-Value box
    const boxSize = Math.floor(innerRadius * 1.35);
    const boxLeft = Math.floor(center - boxSize / 2);
    const boxTop = Math.floor(center - boxSize / 2);

    const hueRgb = hsvToRgb(hsv.h, 1, 1);
    const gradH = ctx.createLinearGradient(boxLeft, boxTop, boxLeft + boxSize, boxTop);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`);
    ctx.fillStyle = gradH;
    ctx.fillRect(boxLeft, boxTop, boxSize, boxSize);

    const gradV = ctx.createLinearGradient(boxLeft, boxTop, boxLeft, boxTop + boxSize);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(boxLeft, boxTop, boxSize, boxSize);

    // SV point marker
    const svX = boxLeft + hsv.s * boxSize;
    const svY = boxTop + (1 - hsv.v) * boxSize;

    ctx.beginPath();
    ctx.arc(svX, svY, 5, 0, Math.PI * 2);
    ctx.strokeStyle = hsv.v < 0.5 ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hsv, isOpen]);

  // Handle touch / pointer input on color wheel
  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = 200;
    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius - 20;

    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const boxSize = Math.floor(innerRadius * 1.35);
    const boxLeft = Math.floor(center - boxSize / 2);
    const boxTop = Math.floor(center - boxSize / 2);

    if (dist >= innerRadius - 4 && dist <= outerRadius + 8) {
      // Dragging hue ring
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      const newHsv = { ...hsv, h: angle };
      setHsv(newHsv);
      const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
      onColorChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    } else if (
      x >= boxLeft - 4 &&
      x <= boxLeft + boxSize + 4 &&
      y >= boxTop - 4 &&
      y <= boxTop + boxSize + 4
    ) {
      // Dragging SV box
      const s = Math.max(0, Math.min(1, (x - boxLeft) / boxSize));
      const v = Math.max(0, Math.min(1, 1 - (y - boxTop) / boxSize));
      const newHsv = { ...hsv, s, v };
      setHsv(newHsv);
      const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
      onColorChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    }
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="HSV Color Wheel & Palette"
      maxHeightClass="max-h-[85vh]"
    >
      <div className="flex flex-col items-center gap-4 pb-4">
        {/* Color Previews & Switcher Bar */}
        <div className="flex items-center justify-between w-full max-w-xs px-2 py-1.5 bg-[#2a2a2a] rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            {/* Primary Swatch */}
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full border-2 border-white/40 shadow-inner"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-[9px] text-gray-400 mt-0.5 font-bold">Main</span>
            </div>

            {/* Swap Button */}
            <button
              onClick={onSwapColors}
              className="w-8 h-8 rounded-lg bg-[#333] hover:bg-[#444] text-gray-300 flex items-center justify-center active:scale-90 transition-transform"
              title="Swap primary and secondary colors"
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* Secondary Swatch */}
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full border border-gray-600 shadow-inner"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-[8px] text-gray-500 mt-0.5">Sub</span>
            </div>
          </div>

          {/* Hex Display & Input */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400">HEX Code</span>
            <input
              type="text"
              value={primaryColor.toUpperCase()}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                  onColorChange(val);
                }
              }}
              className="w-20 bg-[#1a1a1a] border border-gray-700 text-center font-mono font-bold text-xs py-1 rounded text-white"
            />
          </div>
        </div>

        {/* HSV Circular Canvas */}
        <div className="p-3 bg-[#1d1d1d] rounded-2xl border border-white/5 shadow-inner">
          <canvas
            ref={wheelCanvasRef}
            width={200}
            height={200}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              handlePointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) handlePointer(e);
            }}
            className="cursor-crosshair touch-none select-none"
          />
        </div>

        {/* Quick Manga / Art Palette Swatches */}
        <div className="w-full max-w-xs flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Manga & Comic Swatches
          </span>
          <div className="grid grid-cols-8 gap-2 p-2 bg-[#1e1e1e] rounded-xl border border-white/5">
            {MANGA_SWATCHES.map((swatch, idx) => (
              <button
                key={idx}
                onClick={() => onColorChange(swatch)}
                className={`w-7 h-7 rounded-lg border active:scale-90 transition-transform ${
                  primaryColor.toLowerCase() === swatch.toLowerCase()
                    ? 'border-white ring-2 ring-blue-500'
                    : 'border-black/50'
                }`}
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
