import React from 'react';
import {
  Paintbrush,
  PenTool,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Hand,
  Search,
  Sparkles,
  ArrowLeftRight,
  CircleDot,
  Minus,
  Layers,
} from 'lucide-react';
import { ToolType, BrushSettings } from '../types';
import { BrushStrokePreview } from './BrushStrokePreview';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  primaryColor: string;
  secondaryColor: string;
  isTransparentMode: boolean;
  onSwapColors: () => void;
  onToggleTransparentMode: () => void;
  onPrimaryColorChange: (color: string) => void;
  activeBrush?: BrushSettings;
  onOpenBrushMenu?: () => void;
  isBrushMenuOpen?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  primaryColor,
  secondaryColor,
  isTransparentMode,
  onSwapColors,
  onToggleTransparentMode,
  activeBrush,
  onOpenBrushMenu,
  isBrushMenuOpen,
}) => {
  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'brush', label: 'Pen & Brush', icon: <PenTool size={16} />, shortcut: 'P' },
    { id: 'pencil', label: 'Pencil', icon: <Minus size={16} className="-rotate-45" />, shortcut: 'N' },
    { id: 'airbrush', label: 'Airbrush & Blend', icon: <Paintbrush size={16} />, shortcut: 'B' },
    { id: 'eraser', label: 'Eraser', icon: <Eraser size={16} />, shortcut: 'E' },
    { id: 'bucket', label: 'Fill / Paint Bucket', icon: <PaintBucket size={16} />, shortcut: 'G' },
    { id: 'eyedropper', label: 'Eyedropper', icon: <Pipette size={16} />, shortcut: 'I' },
    { id: 'line', label: 'Figure / Line', icon: <Minus size={16} />, shortcut: 'U' },
    { id: 'select', label: 'Marquee Selection', icon: <Square size={16} className="border-dashed" />, shortcut: 'M' },
    { id: 'pan', label: 'Move / Hand Tool', icon: <Hand size={16} />, shortcut: 'H' },
    { id: 'zoom', label: 'Zoom Tool', icon: <Search size={16} />, shortcut: 'Z' },
  ];

  return (
    <aside
      id="main-toolbar"
      className="w-12 bg-[#2d2d2d] border-r border-black flex flex-col items-center py-2.5 gap-2 select-none z-20"
    >
      {/* Tool Buttons */}
      <div className="flex flex-col gap-1 w-full items-center">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const isBrushTool = tool.id === 'brush' || tool.id === 'pencil' || tool.id === 'airbrush';
          return (
            <button
              key={tool.id}
              id={`tool-${tool.id}`}
              onClick={() => {
                if (isActive && isBrushTool && onOpenBrushMenu) {
                  onOpenBrushMenu();
                } else {
                  onSelectTool(tool.id);
                }
              }}
              title={`${tool.label} (${tool.shortcut})${isBrushTool ? ' - Click to switch or open brush menu' : ''}`}
              className={`p-2 rounded transition-all duration-100 relative group flex items-center justify-center ${
                isActive
                  ? 'bg-[#4a90e2] text-white shadow-sm'
                  : 'text-gray-300 hover:bg-[#3d3d3d] hover:text-white'
              }`}
            >
              {tool.icon}
              {/* Little indicator dot for tools with subtool menus */}
              {isBrushTool && (
                <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white/40" />
              )}
              {/* Tooltip */}
              <span className="absolute left-12 px-2 py-0.5 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                {tool.label} <span className="text-gray-400">({tool.shortcut})</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub Tool [Brush Selection] Dedicated Shortcut Button with Active Stroke Preview */}
      {onOpenBrushMenu && activeBrush && (
        <div className="w-full px-1.5 flex flex-col items-center pt-1 border-t border-white/5">
          <button
            id="btn-toolbar-subtool-brushes"
            onClick={onOpenBrushMenu}
            title={`Sub Tool: Brush Selection (${activeBrush.name})`}
            className={`w-9 h-11 rounded flex flex-col items-center justify-center relative group transition-all border ${
              isBrushMenuOpen
                ? 'bg-[#273d57] border-[#4a90e2] text-white shadow-md ring-1 ring-[#4a90e2]/50'
                : 'bg-[#212121] border-black text-gray-300 hover:bg-[#333] hover:border-gray-500 hover:text-white'
            }`}
          >
            {/* Live Micro Stroke Preview */}
            <div className="w-7 h-3 rounded bg-[#131313] border border-black/80 overflow-hidden mb-1 flex items-center justify-center shadow-inner">
              <BrushStrokePreview brush={activeBrush} width={28} height={12} strokeColor="#ffffff" />
            </div>
            <span className="text-[8px] font-bold font-mono text-[#4a90e2] leading-none">
              SUB
            </span>
            <span className="text-[7px] text-gray-400 leading-none mt-0.5 font-mono">
              {activeBrush.size}px
            </span>

            {/* Hover Tooltip */}
            <span className="absolute left-12 px-2 py-0.5 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Sub Tool: Brush Selection &amp; Previews
            </span>
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Color Switcher & Transparent Color Block */}
      <div className="flex flex-col items-center gap-1.5 pb-2">
        {/* Transparent Color Slot (Signature Art Draw Studio feature) */}
        <button
          id="btn-transparent-mode"
          onClick={onToggleTransparentMode}
          title="Transparent Color Mode (Turns current brush into eraser retaining all texture) (C)"
          className={`w-7 h-5 rounded-sm border ${
            isTransparentMode ? 'border-[#4a90e2] ring-1 ring-[#4a90e2]' : 'border-gray-500 hover:border-white'
          } flex items-center justify-center overflow-hidden relative cursor-pointer`}
          style={{
            backgroundImage:
              'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
            backgroundColor: '#ddd',
          }}
        >
          {isTransparentMode && (
            <div className="w-2 h-2 rounded-full bg-[#4a90e2] shadow" />
          )}
        </button>

        {/* Primary & Secondary Color Overlapping Swatches */}
        <div className="relative w-8 h-8 my-1 cursor-pointer">
          {/* Secondary Color Swatch (Behind) */}
          <div
            id="swatch-secondary"
            title={`Secondary Color: ${secondaryColor} (Click swap to toggle)`}
            className="absolute right-0 bottom-0 w-5 h-5 rounded-full border border-black shadow"
            style={{ backgroundColor: secondaryColor }}
          />

          {/* Primary Color Swatch (Front) */}
          <div
            id="swatch-primary"
            title={`Main Color: ${primaryColor}`}
            className="absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-white shadow-md z-10"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Swap Color Button */}
        <button
          id="btn-swap-colors"
          onClick={onSwapColors}
          title="Swap Main / Sub Colors (X)"
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#3d3d3d]"
        >
          <ArrowLeftRight size={11} />
        </button>
      </div>
    </aside>
  );
};
