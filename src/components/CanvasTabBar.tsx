import React from 'react';
import { X, Plus, Sparkles, Smartphone, Crosshair, ChevronDown, PenTool } from 'lucide-react';
import { BrushSettings } from '../types';
import { BrushStrokePreview } from './BrushStrokePreview';

interface CanvasTabBarProps {
  canvasName: string;
  isModified: boolean;
  zoom: number;
  onNewCanvas: () => void;
  onResetView: () => void;
  onFitScreen: () => void;
  onToggleMobileLayout?: () => void;
  isMobileLayout?: boolean;
  onOpenTouchCalibration?: () => void;
  activeBrush?: BrushSettings;
  onOpenBrushMenu?: () => void;
  isBrushMenuOpen?: boolean;
}

export const CanvasTabBar: React.FC<CanvasTabBarProps> = ({
  canvasName,
  isModified,
  zoom,
  onNewCanvas,
  onResetView,
  onFitScreen,
  onToggleMobileLayout,
  isMobileLayout,
  onOpenTouchCalibration,
  activeBrush,
  onOpenBrushMenu,
  isBrushMenuOpen,
}) => {
  return (
    <div
      id="canvas-tab-bar"
      className="h-7 bg-[#323232] border-b border-black flex items-center px-2 text-[10px] gap-2 select-none z-10"
    >
      {/* Active Document Tab */}
      <div className="bg-[#262626] px-2.5 py-1 border-x border-t border-black rounded-t-sm text-white flex items-center gap-1.5 shadow-sm font-medium">
        <span>
          {canvasName}
          {isModified ? '*' : ''}
        </span>
        <span className="text-[9px] text-[#4a90e2]">({Math.round(zoom * 100)}%)</span>
      </div>

      {/* Secondary Demo Project Tabs */}
      <div
        className="px-2 py-1 text-gray-400 hover:text-gray-200 cursor-pointer hidden lg:block"
        title="Sample reference canvas tab"
      >
        Concept_Sketch.png
      </div>

      <button
        onClick={onNewCanvas}
        title="New Canvas"
        className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#444]"
      >
        <Plus size={12} />
      </button>

      {/* Active Sub Tool [Brush] Quick Selector Trigger with Stroke Preview */}
      {activeBrush && onOpenBrushMenu && (
        <button
          id="btn-tabbar-brush-selector"
          onClick={onOpenBrushMenu}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
            isBrushMenuOpen
              ? 'bg-[#273d57] border-[#4a90e2] text-white shadow-xs ring-1 ring-[#4a90e2]/40'
              : 'bg-[#252525] border-white/10 text-gray-300 hover:bg-[#333] hover:text-white hover:border-gray-500'
          }`}
          title="Sub Tool: Brush Selection Menu with previews (Click to browse)"
        >
          {/* Micro S-Curve Stroke Canvas */}
          <div className="w-14 h-4 rounded bg-[#151515] border border-black/80 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
            <BrushStrokePreview brush={activeBrush} width={56} height={16} strokeColor="#ffffff" />
          </div>
          <span className="font-semibold text-gray-100 text-xs truncate max-w-[130px]">
            {activeBrush.name}
          </span>
          <span className="text-[9px] text-gray-400 font-mono">
            {activeBrush.size}px
          </span>
          <ChevronDown size={11} className="text-gray-400" />
        </button>
      )}

      <div className="flex-1" />

      {/* Quick view scale buttons */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <button
          onClick={onFitScreen}
          className="px-1.5 py-0.5 rounded hover:bg-[#444] hover:text-white"
          title="Fit Canvas in Viewport"
        >
          Fit
        </button>
        <button
          onClick={onResetView}
          className="px-1.5 py-0.5 rounded hover:bg-[#444] hover:text-white"
          title="Zoom 100%"
        >
          100%
        </button>

        {onOpenTouchCalibration && (
          <button
            onClick={onOpenTouchCalibration}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#444] text-blue-400"
            title="Touch & Stylus Calibration"
          >
            <Crosshair size={11} />
            <span className="hidden sm:inline">Calibrate Touch</span>
          </button>
        )}

        {onToggleMobileLayout && (
          <button
            onClick={onToggleMobileLayout}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2b2b] hover:bg-[#444] text-[#4a90e2] border border-white/5"
            title="Switch to Mobile Touch UI"
          >
            <Smartphone size={11} />
            <span>Mobile UI</span>
          </button>
        )}
      </div>
    </div>
  );
};
