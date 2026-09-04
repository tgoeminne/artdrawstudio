import React from 'react';
import { X, Plus, Sparkles, Smartphone, Crosshair } from 'lucide-react';

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
}) => {
  return (
    <div
      id="canvas-tab-bar"
      className="h-6 bg-[#363636] border-b border-black flex items-center px-3 text-[10px] gap-2 select-none z-10"
    >
      {/* Active Document Tab */}
      <div className="bg-[#2d2d2d] px-3 py-1 border-x border-t border-black rounded-t-sm text-white flex items-center gap-2 shadow-sm font-medium">
        <span>
          {canvasName}
          {isModified ? '*' : ''}
        </span>
        <span className="text-[9px] text-[#4a90e2]">({Math.round(zoom * 100)}%)</span>
      </div>

      {/* Secondary Demo Project Tabs */}
      <div
        className="px-3 py-1 text-gray-400 hover:text-gray-200 cursor-pointer hidden sm:block"
        title="Sample reference canvas tab"
      >
        Concept_Sketch.png
      </div>
      <div
        className="px-3 py-1 text-gray-400 hover:text-gray-200 cursor-pointer hidden md:block"
        title="Sample reference canvas tab"
      >
        Final_Render_v2
      </div>

      <button
        onClick={onNewCanvas}
        title="New Canvas"
        className="p-0.5 text-gray-400 hover:text-white rounded hover:bg-[#444]"
      >
        <Plus size={12} />
      </button>

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
