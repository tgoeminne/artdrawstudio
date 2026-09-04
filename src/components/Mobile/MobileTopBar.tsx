import React from 'react';
import {
  Menu,
  Undo2,
  Redo2,
  Maximize2,
  Download,
  Monitor,
  Smartphone,
  Crosshair,
} from 'lucide-react';

interface MobileTopBarProps {
  canvasName: string;
  isModified: boolean;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenMenu: () => void;
  onFitScreen: () => void;
  onQuickExport: () => void;
  isForcedMobile: boolean;
  onToggleLayoutMode: () => void;
  onOpenTouchCalibration?: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  canvasName,
  isModified,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenMenu,
  onFitScreen,
  onQuickExport,
  isForcedMobile,
  onToggleLayoutMode,
  onOpenTouchCalibration,
}) => {
  return (
    <header className="h-11 bg-[#232323] border-b border-black flex items-center justify-between px-2 text-[#d1d1d1] select-none shrink-0 z-30 shadow-md">
      {/* Left: Menu & Brand */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenMenu}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2e2e2e] active:bg-[#3d3d3d] text-gray-200"
          title="Project Menu"
          aria-label="Open Project Menu"
        >
          <Menu size={18} />
        </button>

        {/* Title & Status */}
        <div className="flex flex-col ml-1 max-w-[130px] sm:max-w-[200px]">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-gray-100 truncate">
              {canvasName}
            </span>
            {isModified && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
          </div>
          <span className="text-[9px] text-gray-400 font-mono">
            CSP • {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`h-9 w-9 flex items-center justify-center rounded-lg ${
            canUndo
              ? 'bg-[#2e2e2e] active:bg-[#444] text-white'
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`h-9 w-9 flex items-center justify-center rounded-lg ${
            canRedo
              ? 'bg-[#2e2e2e] active:bg-[#444] text-white'
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>

        {/* Touch & Stylus Calibration */}
        {onOpenTouchCalibration && (
          <button
            onClick={onOpenTouchCalibration}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2e2e2e] active:bg-[#444] text-blue-400"
            title="Touchscreen & Stylus Calibration"
            aria-label="Calibrate Touch"
          >
            <Crosshair size={16} />
          </button>
        )}

        {/* Fit to Screen */}
        <button
          onClick={onFitScreen}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2e2e2e] active:bg-[#444] text-gray-300"
          title="Fit to Screen"
          aria-label="Fit to Screen"
        >
          <Maximize2 size={15} />
        </button>

        {/* Quick Export PNG */}
        <button
          onClick={onQuickExport}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2e2e2e] active:bg-[#444] text-cyan-400"
          title="Export PNG"
          aria-label="Export PNG"
        >
          <Download size={15} />
        </button>

        {/* Toggle between Mobile & Desktop layout */}
        <button
          onClick={onToggleLayoutMode}
          className="h-9 px-2 flex items-center gap-1 rounded-lg bg-[#333333] active:bg-[#444] text-gray-300 text-[10px]"
          title="Switch Layout Mode"
        >
          {isForcedMobile ? <Monitor size={14} className="text-blue-400" /> : <Smartphone size={14} />}
          <span className="hidden sm:inline">View</span>
        </button>
      </div>
    </header>
  );
};
