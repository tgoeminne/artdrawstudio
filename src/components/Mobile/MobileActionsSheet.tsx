import React from 'react';
import {
  FlipHorizontal,
  RotateCw,
  Maximize2,
  Sparkles,
  Contrast,
  Trash2,
  Square,
  EyeOff,
  Layers,
  Crosshair,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onFlipCanvasH: () => void;
  onRotateCanvas90: () => void;
  onResetView: () => void;
  onApplyFilter: (filter: 'invert' | 'grayscale' | 'manga_tone' | 'blur') => void;
  onClearActiveLayer: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onOpenTouchCalibration?: () => void;
}

export const MobileActionsSheet: React.FC<MobileActionsSheetProps> = ({
  isOpen,
  onClose,
  onFlipCanvasH,
  onRotateCanvas90,
  onResetView,
  onApplyFilter,
  onClearActiveLayer,
  onSelectAll,
  onDeselect,
  onOpenTouchCalibration,
}) => {
  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Art Actions & Filters">
      <div className="flex flex-col gap-4 pb-6">
        {/* Canvas Orientation */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Canvas Orientation
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                onFlipCanvasH();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200"
            >
              <FlipHorizontal size={20} className="text-blue-400 mb-1" />
              <span className="text-xs font-semibold">Flip H</span>
            </button>

            <button
              onClick={() => {
                onRotateCanvas90();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200"
            >
              <RotateCw size={20} className="text-blue-400 mb-1" />
              <span className="text-xs font-semibold">Rotate 90°</span>
            </button>

            <button
              onClick={() => {
                onResetView();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200"
            >
              <Maximize2 size={20} className="text-blue-400 mb-1" />
              <span className="text-xs font-semibold">Reset View</span>
            </button>
          </div>

          {onOpenTouchCalibration && (
            <button
              onClick={() => {
                onOpenTouchCalibration();
                onClose();
              }}
              className="mt-1 flex items-center justify-between p-3 rounded-xl bg-blue-500/10 active:bg-blue-500/20 border border-blue-500/30 text-blue-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Crosshair size={18} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white">Touch & Stylus Calibration</div>
                  <div className="text-[9px] text-gray-400">Align finger offsets, palm rejection & 3-point test</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded">CALIBRATE</span>
            </button>
          )}
        </div>

        {/* Manga Effects & Filters */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Manga Effects & Filters
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onApplyFilter('manga_tone');
                onClose();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200 text-left"
            >
              <div className="p-2 rounded-lg bg-[#1e1e1e] text-cyan-400">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-xs font-bold">Manga Screentone</div>
                <div className="text-[9px] text-gray-400">Halftone dot pattern</div>
              </div>
            </button>

            <button
              onClick={() => {
                onApplyFilter('grayscale');
                onClose();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200 text-left"
            >
              <div className="p-2 rounded-lg bg-[#1e1e1e] text-amber-400">
                <Contrast size={18} />
              </div>
              <div>
                <div className="text-xs font-bold">Grayscale</div>
                <div className="text-[9px] text-gray-400">Monochrome tonality</div>
              </div>
            </button>

            <button
              onClick={() => {
                onApplyFilter('invert');
                onClose();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200 text-left"
            >
              <div className="p-2 rounded-lg bg-[#1e1e1e] text-purple-400">
                <Contrast size={18} className="rotate-180" />
              </div>
              <div>
                <div className="text-xs font-bold">Invert Colors</div>
                <div className="text-[9px] text-gray-400">Negative polarity</div>
              </div>
            </button>

            <button
              onClick={() => {
                onApplyFilter('blur');
                onClose();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-gray-200 text-left"
            >
              <div className="p-2 rounded-lg bg-[#1e1e1e] text-emerald-400">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-xs font-bold">Gaussian Blur</div>
                <div className="text-[9px] text-gray-400">Soft focus blend</div>
              </div>
            </button>
          </div>
        </div>

        {/* Selection & Layer Edits */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Selection & Canvas Edit
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSelectAll();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-xs text-gray-200 font-semibold"
            >
              <Square size={14} className="border-dashed text-blue-400" />
              Select All
            </button>
            <button
              onClick={() => {
                onDeselect();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#2a2a2a] active:bg-[#383838] border border-white/5 text-xs text-gray-200 font-semibold"
            >
              <EyeOff size={14} className="text-gray-400" />
              Deselect
            </button>
          </div>

          <button
            onClick={() => {
              onClearActiveLayer();
              onClose();
            }}
            className="flex items-center justify-center gap-2 p-3 mt-1 rounded-xl bg-red-950/40 border border-red-900/50 active:bg-red-900/60 text-red-400 text-xs font-bold"
          >
            <Trash2 size={16} />
            Clear Active Layer Pixels
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
