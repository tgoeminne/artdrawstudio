import React from 'react';
import {
  PenTool,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Hand,
  Search,
  Minus,
  Check,
  Type,
} from 'lucide-react';
import { ToolType } from '../../types';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const MobileToolsSheet: React.FC<MobileToolsSheetProps> = ({
  isOpen,
  onClose,
  activeTool,
  onSelectTool,
}) => {
  const tools: { id: ToolType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'brush',
      label: 'Brush presets',
      desc: 'Choose pen, pencil, airbrush and paint presets',
      icon: <PenTool size={22} />,
    },
    {
      id: 'vector',
      label: 'Vector pen',
      desc: 'Draw resolution-independent editable strokes',
      icon: <PenTool size={22} />,
    },
    {
      id: 'text',
      label: 'Text',
      desc: 'Place editable text and choose a font',
      icon: <Type size={22} />,
    },
    {
      id: 'eraser',
      label: 'Eraser',
      desc: 'Clear pixels on active layer',
      icon: <Eraser size={22} />,
    },
    {
      id: 'bucket',
      label: 'Fill / Bucket',
      desc: 'Instant color boundary flood fill',
      icon: <PaintBucket size={22} />,
    },
    {
      id: 'eyedropper',
      label: 'Eyedropper',
      desc: 'Sample color directly from artwork',
      icon: <Pipette size={22} />,
    },
    {
      id: 'line',
      label: 'Figure Line',
      desc: 'Draw straight structural lines',
      icon: <Minus size={22} />,
    },
    {
      id: 'select',
      label: 'Marquee Selection',
      desc: 'Select area to edit or clear',
      icon: <Square size={22} className="border-dashed" />,
    },
    {
      id: 'pan',
      label: 'Pan Canvas',
      desc: 'Drag to scroll across canvas',
      icon: <Hand size={22} />,
    },
    {
      id: 'zoom',
      label: 'Zoom Tool',
      desc: 'Tap to magnify canvas area',
      icon: <Search size={22} />,
    },
  ];

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Drawing Tools">
      <div className="grid grid-cols-2 gap-2 pb-4">
        {tools.map((t) => {
          const isSelected = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                onSelectTool(t.id);
                onClose();
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left active:scale-98 transition-all ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-[#2a2a2a] border-white/5 text-gray-300 active:bg-[#383838]'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-[#1e1e1e] text-blue-400'
                }`}
              >
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs flex items-center justify-between">
                  <span className="truncate">{t.label}</span>
                  {isSelected && <Check size={14} className="text-blue-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </MobileBottomSheet>
  );
};
