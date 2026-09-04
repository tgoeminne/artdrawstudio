import React, { useState, useRef, useEffect } from 'react';
import { Layers as LayersIcon, Compass, Palette } from 'lucide-react';
import { CanvasTransform } from '../../types';

interface NavigatorAndColorProps {
  primaryColor: string;
  onColorChange: (hex: string) => void;
  transform: CanvasTransform;
  canvasWidth: number;
  canvasHeight: number;
  onResetView: () => void;
  compositeThumbnail?: string;
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
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

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

const PRESET_SWATCHES = [
  '#000000',
  '#ffffff',
  '#ff4444',
  '#ff8800',
  '#ffcc00',
  '#33cc33',
  '#4a90e2',
  '#9933cc',
  '#ffe0bd', // anime skin highlight
  '#f1c27d', // anime skin mid
  '#c68642', // skin shadow
  '#2c3e50', // dark lineart
  '#465c69', // cool shadow
  '#8e44ad', // deep violet
  '#e74c3c', // vermilion
  '#27ae60', // forest green
];

export const NavigatorAndColor: React.FC<NavigatorAndColorProps> = ({
  primaryColor,
  onColorChange,
  transform,
  canvasWidth,
  canvasHeight,
  onResetView,
  compositeThumbnail,
}) => {
  const [panelTab, setPanelTab] = useState<'color' | 'navigator'>('color');
  const [hsv, setHsv] = useState(() => hexToHsv(primaryColor));
  const svBoxRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Sync external primaryColor to HSV if hex changes
  useEffect(() => {
    const currentHex = rgbToHex(
      hsvToRgb(hsv.h, hsv.s, hsv.v).r,
      hsvToRgb(hsv.h, hsv.s, hsv.v).g,
      hsvToRgb(hsv.h, hsv.s, hsv.v).b
    );
    if (currentHex.toLowerCase() !== primaryColor.toLowerCase()) {
      setHsv(hexToHsv(primaryColor));
    }
  }, [primaryColor]);

  // Update Hue from mouse/pointer position relative to wheel center
  const updateHueFromCoords = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // conic-gradient(from 0deg, #f00...) starts at 12 o'clock (0deg) and rotates clockwise.
    // atan2(dx, -dy) yields 0deg at 12 o'clock (dx=0, dy<0) and increases clockwise.
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    setHsv((prev) => {
      const next = { ...prev, h: angle };
      const rgb = hsvToRgb(next.h, next.s, next.v);
      onColorChange(rgbToHex(rgb.r, rgb.g, rgb.b));
      return next;
    });
  };

  // Handle HSV Wheel interactions (with drag support and inner box exclusion)
  const handleWheelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;

    // Ignore clicks in the center square area (let the SV box handle its own events)
    if (dist < radius * 0.55) return;

    e.preventDefault();
    e.stopPropagation();
    updateHueFromCoords(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      updateHueFromCoords(ev.clientX, ev.clientY);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle SV Square Box dragging
  const handleSvMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event from bubbling to outer wheelRef

    const updateSv = (clientX: number, clientY: number) => {
      if (!svBoxRef.current) return;
      const rect = svBoxRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const s = x / rect.width;
      const v = 1 - y / rect.height;

      setHsv((prev) => {
        const next = { ...prev, s, v };
        const rgb = hsvToRgb(next.h, next.s, next.v);
        onColorChange(rgbToHex(rgb.r, rgb.g, rgb.b));
        return next;
      });
    };

    updateSv(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      updateSv(ev.clientX, ev.clientY);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const pureHueRgb = hsvToRgb(hsv.h, 1, 1);
  const pureHueHex = rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);

  return (
    <div id="panel-navigator-color" className="h-[210px] flex flex-col border-b border-black select-none">
      {/* Panel Header with Sub-tabs */}
      <div className="bg-[#363636] px-2 py-1 text-[10px] uppercase font-bold border-b border-black flex justify-between items-center text-gray-300">
        <div className="flex gap-2">
          <button
            onClick={() => setPanelTab('color')}
            className={`flex items-center gap-1 cursor-pointer ${
              panelTab === 'color' ? 'text-white border-b border-[#4a90e2]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Palette size={11} /> Color Wheel
          </button>
          <button
            onClick={() => setPanelTab('navigator')}
            className={`flex items-center gap-1 cursor-pointer ${
              panelTab === 'navigator' ? 'text-white border-b border-[#4a90e2]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Compass size={11} /> Navigator
          </button>
        </div>
        <span className="font-mono text-[9px] text-[#4a90e2]">{primaryColor.toUpperCase()}</span>
      </div>

      {panelTab === 'color' ? (
        <div className="flex-1 p-2 flex flex-col items-center justify-center gap-2 bg-[#252525]">
          <div className="flex items-center gap-3">
            {/* HSV Color Wheel Ring */}
            <div
              ref={wheelRef}
              onMouseDown={handleWheelMouseDown}
              className="w-24 h-24 rounded-full p-2 border border-black shadow-inner relative cursor-crosshair flex items-center justify-center"
              style={{
                background:
                  'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
              }}
              title="Click or drag on outer color wheel ring to select Hue"
            >
              {/* Inner Saturation / Value Box */}
              <div
                ref={svBoxRef}
                onMouseDown={handleSvMouseDown}
                className="w-14 h-14 border border-black relative cursor-crosshair overflow-hidden shadow-inner"
                style={{
                  backgroundColor: pureHueHex,
                  backgroundImage:
                    'linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)',
                }}
                title="Drag to select Saturation and Value"
              >
                {/* SV Picker Needle Circle */}
                <div
                  className="w-2.5 h-2.5 border-2 border-white rounded-full absolute -translate-x-1/2 -translate-y-1/2 shadow pointer-events-none ring-1 ring-black/60"
                  style={{
                    left: `${hsv.s * 100}%`,
                    top: `${(1 - hsv.v) * 100}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>

              {/* Hue Angle Indicator Marker on outer ring (0deg is at 12 o'clock / top) */}
              <div
                className="absolute w-2.5 h-2.5 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow ring-1 ring-black/80"
                style={{
                  left: `${50 + 42 * Math.sin((hsv.h * Math.PI) / 180)}%`,
                  top: `${50 - 42 * Math.cos((hsv.h * Math.PI) / 180)}%`,
                  backgroundColor: pureHueHex,
                }}
              />
            </div>

            {/* Quick Hex / RGB Values Display & Input */}
            <div className="flex flex-col gap-1 text-[10px] text-gray-300">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">HEX</span>
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-16 bg-[#1a1a1a] border border-gray-600 rounded px-1 py-0.5 text-[9px] font-mono text-white text-center focus:border-[#4a90e2] outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400">
                <span>R: {hsvToRgb(hsv.h, hsv.s, hsv.v).r}</span>
                <span>G: {hsvToRgb(hsv.h, hsv.s, hsv.v).g}</span>
                <span>B: {hsvToRgb(hsv.h, hsv.s, hsv.v).b}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-gray-400 text-[9px]">Preview:</span>
                <div
                  className="w-7 h-4 rounded-xs border border-black shadow-inner"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          {/* Quick Manga / Artist Color Swatches Grid */}
          <div className="w-full grid grid-cols-8 gap-1 pt-1 border-t border-gray-800">
            {PRESET_SWATCHES.map((swatch, idx) => (
              <button
                key={idx}
                onClick={() => onColorChange(swatch)}
                className={`h-3.5 rounded-xs border transition-transform hover:scale-110 ${
                  primaryColor.toLowerCase() === swatch.toLowerCase()
                    ? 'border-white ring-1 ring-white'
                    : 'border-black/50'
                }`}
                style={{ backgroundColor: swatch }}
                title={`Select ${swatch}`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Navigator View */
        <div className="flex-1 p-2 flex flex-col items-center justify-between bg-[#202020]">
          <div className="w-full flex-1 border border-black bg-[#151515] relative flex items-center justify-center overflow-hidden rounded-xs">
            {compositeThumbnail ? (
              <img
                src={compositeThumbnail}
                alt="Canvas thumbnail"
                className="max-h-full max-w-full object-contain pointer-events-none"
              />
            ) : (
              <div className="w-20 h-14 bg-white border border-gray-400 flex items-center justify-center text-[9px] text-gray-400">
                Canvas
              </div>
            )}
            {/* Viewport Box Indicator */}
            <div
              className="absolute border border-red-500 bg-red-500/10 pointer-events-none"
              style={{
                width: `${Math.min(100, Math.max(20, 100 / transform.zoom))}%`,
                height: `${Math.min(100, Math.max(20, 100 / transform.zoom))}%`,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
              }}
            />
          </div>
          <div className="w-full flex items-center justify-between text-[10px] text-gray-400 pt-1">
            <span>
              {canvasWidth} x {canvasHeight}px
            </span>
            <button
              onClick={onResetView}
              className="text-[#4a90e2] hover:underline cursor-pointer"
            >
              Center View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
