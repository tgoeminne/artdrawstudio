import React, { useState, useRef } from 'react';
import { BrushSettings } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  Sliders,
  Check,
} from 'lucide-react';

interface MobileCanvasHUDProps {
  brush: BrushSettings;
  onUpdateBrush: (updates: Partial<BrushSettings>) => void;
  primaryColor: string;
}

const COMMON_SIZES = [2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

export const MobileCanvasHUD: React.FC<MobileCanvasHUDProps> = ({
  brush,
  onUpdateBrush,
  primaryColor,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeScrub, setActiveScrub] = useState<'size' | 'opacity' | null>(null);
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
  const [showPresetRail, setShowPresetRail] = useState(false);

  const sizeTrackRef = useRef<HTMLDivElement>(null);
  const opacityTrackRef = useRef<HTMLDivElement>(null);

  // Smooth vertical pointer tracking for Size (1 to 150 px)
  const handleSizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveScrub('size');
    updateSizeFromPointer(e.clientY);
  };

  const handleSizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeScrub !== 'size') return;
    e.preventDefault();
    updateSizeFromPointer(e.clientY);
  };

  const updateSizeFromPointer = (clientY: number) => {
    if (!sizeTrackRef.current) return;
    const rect = sizeTrackRef.current.getBoundingClientRect();
    // Dragging UP increases size, dragging DOWN decreases size
    const ratio = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
    // Non-linear response curve for fine precision at smaller sizes (1-30px) and fast scaling up to 150px
    const curved = ratio ** 1.6;
    const newSize = Math.round(1 + curved * 149);
    onUpdateBrush({ size: Math.max(1, Math.min(150, newSize)) });
  };

  // Smooth vertical pointer tracking for Opacity (5% to 100%)
  const handleOpacityPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveScrub('opacity');
    updateOpacityFromPointer(e.clientY);
  };

  const handleOpacityPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeScrub !== 'opacity') return;
    e.preventDefault();
    updateOpacityFromPointer(e.clientY);
  };

  const updateOpacityFromPointer = (clientY: number) => {
    if (!opacityTrackRef.current) return;
    const rect = opacityTrackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
    const newOpacity = Math.round((0.05 + ratio * 0.95) * 100) / 100;
    onUpdateBrush({ opacity: Math.max(0.05, Math.min(1.0, newOpacity)) });
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setActiveScrub(null);
  };

  // Stepper adjustments for size
  const handleStepSize = (delta: number) => {
    onUpdateBrush({
      size: Math.max(1, Math.min(150, Math.round(brush.size + delta))),
    });
  };

  // Calculate visual height percentage for scrub tracks
  // Invert exponential formula: ratio = ((size - 1) / 149) ^ (1 / 1.6)
  const sizeRatio = Math.min(1, Math.max(0, ((brush.size - 1) / 149) ** (1 / 1.6)));
  const opacityRatio = Math.min(1, Math.max(0, (brush.opacity - 0.05) / 0.95));

  return (
    <aside
      aria-label="Brush adjustments"
      className="absolute left-2 top-14 z-20 flex items-start gap-1 select-none pointer-events-auto"
    >
      {!isCollapsed ? (
        <div className="bg-[#1e1e1e]/95 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col items-center gap-3 w-14 text-[#d1d1d1]">
          {/* Active Brush Size Preview Circle (tappable to open quick picker) */}
          <button
            onClick={() => setIsQuickPickerOpen(true)}
            className="w-10 h-10 rounded-xl bg-[#282828] border border-[#444] flex items-center justify-center relative overflow-hidden active:scale-95 transition-transform"
            title="Tap for Quick Size Menu"
            aria-label="Quick size options"
          >
            <div
              className="rounded-full shrink-0 transition-all duration-75 shadow-sm"
              style={{
                width: `${Math.min(32, Math.max(3, brush.size * 0.5))}px`,
                height: `${Math.min(32, Math.max(3, brush.size * 0.5))}px`,
                backgroundColor: primaryColor,
                opacity: brush.opacity,
              }}
            />
          </button>

          {/* ================= 1. TOUCH SIZE SCRUBBER ================= */}
          <div className="flex flex-col items-center gap-1 relative w-full">
            <div className="flex items-center justify-between w-full px-0.5">
              <span className="text-[9px] font-extrabold tracking-wider text-blue-400">
                SIZE
              </span>
              <button
                onClick={() => setShowPresetRail(!showPresetRail)}
                className={`p-0.5 rounded text-[8px] font-mono transition-colors ${
                  showPresetRail ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Toggle Quick Presets Rail"
                aria-label="Toggle Quick Presets Rail"
              >
                :::
              </button>
            </div>

            {/* Stepper Plus Button */}
            <button
              onClick={() => handleStepSize(brush.size >= 30 ? 5 : 1)}
              className="w-8 h-6 rounded-md bg-[#2d2d2d] border border-white/10 text-gray-300 active:bg-blue-600 active:text-white flex items-center justify-center transition-colors"
              title="Increase Brush Size"
              aria-label="Increase brush size"
            >
              <Plus size={13} />
            </button>

            {/* Touch Track with custom pointer drag */}
            <div
              ref={sizeTrackRef}
              onPointerDown={handleSizePointerDown}
              onPointerMove={handleSizePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              className="relative w-8 h-28 bg-[#181818] rounded-full border border-white/15 cursor-ns-resize overflow-hidden touch-none flex flex-col justify-end p-0.5"
            >
              {/* Active level fill */}
              <div
                className="w-full bg-gradient-to-t from-blue-700 to-cyan-400 rounded-full transition-all duration-75"
                style={{ height: `${sizeRatio * 100}%` }}
              />
              {/* Draggable thumb pill */}
              <div
                className="absolute left-1 right-1 h-3 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{ bottom: `calc(${sizeRatio * 100}% - 6px)` }}
              >
                <div className="w-2.5 h-0.5 bg-gray-600 rounded-full" />
              </div>
            </div>

            {/* Stepper Minus Button */}
            <button
              onClick={() => handleStepSize(brush.size >= 30 ? -5 : -1)}
              className="w-8 h-6 rounded-md bg-[#2d2d2d] border border-white/10 text-gray-300 active:bg-blue-600 active:text-white flex items-center justify-center transition-colors"
              title="Decrease Brush Size"
              aria-label="Decrease brush size"
            >
              <Minus size={13} />
            </button>

            {/* Numeric Size Badge (tappable to type) */}
            <button
              onClick={() => setIsQuickPickerOpen(true)}
              className="mt-0.5 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-[10px] font-mono font-bold text-blue-300 hover:text-white transition-colors"
              title="Tap to pick exact size"
              aria-label="Choose exact size"
            >
              {brush.size}px
            </button>

            {/* Floating Live Size Loupe / Reticle when scrubbing */}
            {activeScrub === 'size' && (
              <div className="absolute left-14 top-10 bg-[#161616] border border-blue-500 text-white rounded-xl shadow-2xl p-2 flex items-center gap-2 pointer-events-none whitespace-nowrap z-50 animate-in fade-in">
                <div
                  className="rounded-full border border-blue-400 shrink-0"
                  style={{
                    width: `${Math.min(48, Math.max(6, brush.size))}px`,
                    height: `${Math.min(48, Math.max(6, brush.size))}px`,
                    backgroundColor: primaryColor,
                    opacity: brush.opacity,
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-mono font-black text-sm text-cyan-300">
                    {brush.size} px
                  </span>
                  <span className="text-[9px] text-gray-400">Brush Size</span>
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-white/10" />

          {/* ================= 2. TOUCH OPACITY SCRUBBER ================= */}
          <div className="flex flex-col items-center gap-1 relative w-full">
            <span className="text-[9px] font-extrabold tracking-wider text-gray-400">
              OPAC
            </span>

            {/* Touch Track for Opacity */}
            <div
              ref={opacityTrackRef}
              onPointerDown={handleOpacityPointerDown}
              onPointerMove={handleOpacityPointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              className="relative w-8 h-24 bg-[#181818] rounded-full border border-white/15 cursor-ns-resize overflow-hidden touch-none flex flex-col justify-end p-0.5"
            >
              {/* Active level fill */}
              <div
                className="w-full bg-gradient-to-t from-gray-600 to-gray-200 rounded-full transition-all duration-75"
                style={{ height: `${opacityRatio * 100}%` }}
              />
              {/* Draggable thumb */}
              <div
                className="absolute left-1 right-1 h-3 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{ bottom: `calc(${opacityRatio * 100}% - 6px)` }}
              >
                <div className="w-2.5 h-0.5 bg-gray-700 rounded-full" />
              </div>
            </div>

            <span className="text-[10px] font-mono text-gray-300">
              {Math.round(brush.opacity * 100)}%
            </span>

            {/* Floating Live Opacity bubble */}
            {activeScrub === 'opacity' && (
              <div className="absolute left-14 top-6 bg-[#161616] border border-white/20 text-white rounded-xl shadow-2xl px-2.5 py-1.5 flex flex-col pointer-events-none whitespace-nowrap z-50">
                <span className="font-mono font-bold text-xs text-white">
                  {Math.round(brush.opacity * 100)}%
                </span>
                <span className="text-[8px] text-gray-400">Flow / Opacity</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Collapse / Expand Tab Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-6 h-10 mt-3 bg-[#222]/90 border border-white/15 rounded-r-xl flex items-center justify-center text-gray-300 active:text-white active:bg-[#333] shadow-lg transition-colors"
        title={isCollapsed ? 'Expand Quick Sliders' : 'Collapse Quick Sliders'}
        aria-label={isCollapsed ? 'Expand Quick Sliders' : 'Collapse Quick Sliders'}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Quick Size Presets Flyout Rail */}
      {showPresetRail && !isCollapsed && (
        <div className="bg-[#1b1b1b]/95 border border-white/10 p-1.5 rounded-xl shadow-2xl flex flex-col gap-1 z-30 animate-in fade-in slide-in-from-left-2">
          <div className="text-[8px] font-bold text-gray-400 px-1 pb-0.5 text-center">
            QUICK
          </div>
          {[2, 4, 8, 14, 24, 40, 60, 90].map((sz) => (
            <button
              key={sz}
              onClick={() => onUpdateBrush({ size: sz })}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold active:scale-95 transition-all ${
                brush.size === sz
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-[#282828] text-gray-300 hover:text-white'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      )}

      {/* Quick Size & Custom Diameter Modal Dialog */}
      {isQuickPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsQuickPickerOpen(false)}
        >
          <div
            className="bg-[#232323] border border-white/15 rounded-2xl p-4 w-full max-w-xs shadow-2xl flex flex-col gap-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-sm text-gray-200">
                Select Brush Size
              </span>
              <span className="font-mono text-sm text-blue-400 font-bold">
                {brush.size} px
              </span>
            </div>

            {/* Popular Size Grid Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {COMMON_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => {
                    onUpdateBrush({ size: sz });
                    setIsQuickPickerOpen(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 border transition-all ${
                    brush.size === sz
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                      : 'bg-[#2e2e2e] border-white/5 text-gray-300 hover:bg-[#383838]'
                  }`}
                >
                  <div
                    className="rounded-full bg-white/80"
                    style={{
                      width: `${Math.min(16, Math.max(2, sz * 0.25))}px`,
                      height: `${Math.min(16, Math.max(2, sz * 0.25))}px`,
                    }}
                  />
                  <span>{sz}px</span>
                </button>
              ))}
            </div>

            {/* Precise Slider Inside Dialog */}
            <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Fine-tune Slider</span>
                <span className="font-mono text-blue-400">{brush.size} px</span>
              </div>
              <input
                type="range"
                min={1}
                max={150}
                value={brush.size}
                onChange={(e) => onUpdateBrush({ size: Number(e.target.value) })}
                className="w-full h-2.5 bg-[#181818] rounded-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsQuickPickerOpen(false)}
              className="mt-1 w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Apply Size ({brush.size}px)
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
