import React from 'react';
import {
  PenTool,
  Paintbrush,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Hand,
  Search,
  Minus,
  Layers,
  Sliders,
  Sparkles,
  ArrowLeftRight,
  CircleDot,
  Wand2,
} from 'lucide-react';
import { ToolType, BrushSettings } from '../../types';

interface MobileBottomDockProps {
  activeTool: ToolType;
  brush: BrushSettings;
  primaryColor: string;
  secondaryColor: string;
  isTransparentMode: boolean;
  layerCount: number;
  activeLayerName: string;
  onSwapColors: () => void;
  onToggleTransparentMode: () => void;
  onOpenToolsSheet: () => void;
  onOpenColorSheet: () => void;
  onOpenBrushSheet: () => void;
  onOpenLayersSheet: () => void;
  onOpenActionsSheet: () => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeTool,
  brush,
  primaryColor,
  secondaryColor,
  isTransparentMode,
  layerCount,
  activeLayerName,
  onSwapColors,
  onToggleTransparentMode,
  onOpenToolsSheet,
  onOpenColorSheet,
  onOpenBrushSheet,
  onOpenLayersSheet,
  onOpenActionsSheet,
}) => {
  const getToolIcon = (tool: ToolType) => {
    switch (tool) {
      case 'brush':
        return <PenTool size={18} />;
      case 'pencil':
        return <Minus size={18} className="-rotate-45" />;
      case 'airbrush':
        return <Paintbrush size={18} />;
      case 'eraser':
        return <Eraser size={18} />;
      case 'bucket':
        return <PaintBucket size={18} />;
      case 'eyedropper':
        return <Pipette size={18} />;
      case 'line':
        return <Minus size={18} />;
      case 'select':
        return <Square size={18} className="border-dashed" />;
      case 'pan':
        return <Hand size={18} />;
      case 'zoom':
        return <Search size={18} />;
      default:
        return <PenTool size={18} />;
    }
  };

  const getToolLabel = (tool: ToolType) => {
    switch (tool) {
      case 'brush':
        return 'Pen';
      case 'pencil':
        return 'Pencil';
      case 'airbrush':
        return 'Airbrush';
      case 'eraser':
        return 'Eraser';
      case 'bucket':
        return 'Fill';
      case 'eyedropper':
        return 'Sample';
      case 'line':
        return 'Line';
      case 'select':
        return 'Select';
      case 'pan':
        return 'Pan';
      case 'zoom':
        return 'Zoom';
      default:
        return 'Tool';
    }
  };

  return (
    <nav className="h-14 bg-[#232323] border-t border-black px-2 flex items-center justify-around select-none shrink-0 z-30 shadow-2xl">
      {/* 1. Tool Selector Button */}
      <button
        onClick={onOpenToolsSheet}
        className="flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg active:bg-[#333] text-gray-200 transition-colors"
        aria-label="Select Drawing Tool"
      >
        <div className="p-1 rounded-md bg-[#2f2f2f] text-blue-400">
          {getToolIcon(activeTool)}
        </div>
        <span className="text-[9px] font-semibold mt-0.5 capitalize truncate max-w-[52px]">
          {getToolLabel(activeTool)}
        </span>
      </button>

      {/* 2. Color Swatches & Modes */}
      <div className="flex items-center gap-1.5 px-1 py-1 bg-[#1c1c1c] rounded-xl border border-white/5">
        {/* Primary Color Bubble */}
        <button
          onClick={onOpenColorSheet}
          className="relative w-8 h-8 rounded-full border-2 border-[#444] shadow-inner active:scale-95 transition-transform flex items-center justify-center overflow-hidden"
          title="Open Color Wheel"
          aria-label="Color Wheel"
        >
          <div
            className="w-full h-full"
            style={{ backgroundColor: primaryColor }}
          />
        </button>

        {/* Swap Colors Button */}
        <button
          onClick={onSwapColors}
          className="w-6 h-6 rounded-md bg-[#2b2b2b] text-gray-400 hover:text-white flex items-center justify-center active:scale-90 transition-transform"
          title="Swap Colors"
          aria-label="Swap Colors"
        >
          <ArrowLeftRight size={12} />
        </button>

        {/* Transparent Color Mode (Eraser Brush) */}
        <button
          onClick={onToggleTransparentMode}
          className={`w-7 h-7 rounded-md border flex items-center justify-center active:scale-90 transition-all ${
            isTransparentMode
              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
              : 'border-gray-700 bg-[#282828] text-gray-400'
          }`}
          title="Transparent Color Mode"
          aria-label="Transparent Color Mode"
        >
          <div className="w-4 h-4 rounded-sm bg-[conic-gradient(#555_90deg,#222_90deg_180deg,#555_180deg_270deg,#222_270deg)] bg-[length:6px_6px]" />
        </button>
      </div>

      {/* 3. Brush Settings & Sub-tools Button */}
      <button
        onClick={onOpenBrushSheet}
        className="flex flex-col items-center justify-center min-w-[54px] h-12 rounded-lg active:bg-[#333] text-gray-200 transition-colors"
        aria-label="Brush Settings"
      >
        <div className="p-1 rounded-md bg-[#2f2f2f] text-emerald-400 relative">
          <Sliders size={18} />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold bg-blue-600 text-white rounded px-1 shadow-sm">
            {brush.size}
          </span>
        </div>
        <span className="text-[9px] font-semibold mt-0.5 truncate max-w-[60px] text-gray-300">
          {brush.name.split(' ')[0]}
        </span>
      </button>

      {/* 4. Layers Button */}
      <button
        onClick={onOpenLayersSheet}
        className="relative flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg active:bg-[#333] text-gray-200 transition-colors"
        aria-label="Layers Panel"
      >
        <div className="p-1 rounded-md bg-[#2f2f2f] text-amber-400 relative">
          <Layers size={18} />
          <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-full bg-blue-500 text-white font-mono text-[9px] font-bold flex items-center justify-center px-0.5 shadow">
            {layerCount}
          </span>
        </div>
        <span className="text-[9px] font-semibold mt-0.5 truncate max-w-[56px] text-gray-300">
          Layers
        </span>
      </button>

      {/* 5. Quick Actions & Effects */}
      <button
        onClick={onOpenActionsSheet}
        className="flex flex-col items-center justify-center min-w-[46px] h-12 rounded-lg active:bg-[#333] text-gray-200 transition-colors"
        aria-label="Art Effects & Tools"
      >
        <div className="p-1 rounded-md bg-[#2f2f2f] text-purple-400">
          <Wand2 size={18} />
        </div>
        <span className="text-[9px] font-semibold mt-0.5 text-gray-300">
          Effects
        </span>
      </button>
    </nav>
  );
};
