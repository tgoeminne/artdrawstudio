import React from 'react';
import { ZoomIn, ZoomOut, Check, Wifi, PenTool, Compass, RotateCw } from 'lucide-react';
import { WacomStylusState } from '../types';

interface BottomStatusBarProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  rotation: number;
  cursorPos: { x: number; y: number } | null;
  pressure: number;
  stylusState?: WacomStylusState | null;
  onOpenWacomSettings?: () => void;
  onZoomChange: (newZoom: number) => void;
  onResetView: () => void;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  rotation,
  cursorPos,
  pressure,
  stylusState,
  onOpenWacomSettings,
  onZoomChange,
  onResetView,
}) => {
  const isPen = stylusState?.isPen;

  return (
    <footer
      id="bottom-status-bar"
      className="h-6 bg-[#2d2d2d] border-t border-black flex items-center px-3 text-[10px] text-gray-400 select-none z-20 font-sans"
    >
      {/* Left side telemetry & performance indicators */}
      <div className="flex gap-3 items-center">
        {/* Wacom Hardware Status Badge */}
        <button
          onClick={onOpenWacomSettings}
          title="Click to calibrate Wacom Stylus, Tilt & Pressure Curves"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer border ${
            isPen
              ? 'bg-blue-950/70 border-blue-500/60 text-blue-300 hover:bg-blue-900/80 hover:text-white'
              : 'bg-[#242424] border-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <PenTool size={11} className={isPen ? 'text-blue-400' : 'text-gray-400'} />
          <span className="font-medium text-[9px]">
            {isPen ? 'Wacom Pro Pen' : 'Stylus / Digitizer'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPen ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
        </button>

        {/* Live Pressure Gauge */}
        <div className="flex items-center gap-1 font-mono text-[9px] text-gray-300">
          <span>P:</span>
          <div className="w-12 h-1.5 bg-[#181818] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-75"
              style={{ width: `${Math.round(pressure * 100)}%` }}
            />
          </div>
          <span className="w-7 text-right">{Math.round(pressure * 100)}%</span>
        </div>

        {/* Live Tilt & Rotation Telemetry (When Stylus is Active) */}
        {stylusState && (
          <div className="hidden sm:flex items-center gap-2 font-mono text-[9px]">
            <span
              className={`flex items-center gap-0.5 ${
                stylusState.tiltAngle > 0 ? 'text-indigo-300' : 'text-gray-400'
              }`}
              title={`Pen Tilt: ${stylusState.tiltAngle}° (X: ${stylusState.tiltX}°, Y: ${stylusState.tiltY}°)`}
            >
              <Compass size={10} />
              Tilt {stylusState.tiltAngle}°
            </span>

            {stylusState.twist > 0 && (
              <span
                className="text-purple-300 flex items-center gap-0.5"
                title={`Wacom Barrel Twist: ${stylusState.twist}°`}
              >
                <RotateCw size={10} />
                Twist {stylusState.twist}°
              </span>
            )}

            {stylusState.isEraserTip && (
              <span className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold uppercase text-[8px] animate-pulse">
                Eraser
              </span>
            )}
          </div>
        )}

        <span className="hidden md:inline text-gray-400">•</span>
        <span className="hidden md:inline font-mono text-gray-400 text-[9px]">
          {canvasWidth} × {canvasHeight}px
        </span>
      </div>

      <div className="flex-1" />

      {/* Right side controls */}
      <div className="flex gap-3 items-center">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-[#202020] px-2 py-0.5 rounded border border-gray-800">
          <button
            onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
            className="hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={10} />
          </button>
          <input
            type="range"
            min={10}
            max={400}
            value={Math.round(zoom * 100)}
            onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
            className="w-16 h-1 bg-[#111] rounded-full accent-[#4a90e2] cursor-pointer"
          />
          <button
            onClick={() => onZoomChange(Math.min(8.0, zoom + 0.1))}
            className="hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={10} />
          </button>
          <button
            onClick={onResetView}
            className="text-[9px] font-mono text-gray-300 hover:text-white w-9 text-right"
            title="Click to reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

        <span className="text-gray-400 hidden md:inline">Wacom Native API</span>
        <span className="text-white font-semibold text-[9px] px-1 bg-[#3a3a3a] rounded">ENG</span>
      </div>
    </footer>
  );
};
