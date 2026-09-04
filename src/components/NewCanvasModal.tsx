import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface NewCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (width: number, height: number, bgColor: string, name: string) => void;
}

const PRESETS = [
  { name: 'FHD Illustration (1920 x 1080)', width: 1920, height: 1080 },
  { name: 'Standard Canvas (1200 x 900)', width: 1200, height: 900 },
  { name: 'Square Art (1000 x 1000)', width: 1000, height: 1000 },
  { name: 'Manga / Portrait (1080 x 1440)', width: 1080, height: 1440 },
  { name: 'Webtoon Strip (800 x 2400)', width: 800, height: 2400 },
];

export const NewCanvasModal: React.FC<NewCanvasModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(900);
  const [name, setName] = useState('Illustration_01.ads');
  const [bgColor, setBgColor] = useState<'white' | 'transparent'>('white');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 select-none p-3">
      <div className="w-[92vw] max-w-[420px] max-h-[90vh] bg-[#2d2d2d] border border-black shadow-2xl rounded text-[#d1d1d1] text-[11px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-7 bg-[#363636] border-b border-black flex items-center justify-between px-3 font-bold text-white text-[11px]">
          <span>New Canvas (Art Draw Studio)</span>
          <button onClick={onClose} className="hover:text-red-400">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {/* File Name */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 font-medium">File Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#1e1e1e] border border-gray-700 px-2 py-1 rounded text-white outline-none focus:border-[#4a90e2]"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 font-medium">Presets</label>
            <div className="grid grid-cols-1 gap-1 max-h-28 overflow-y-auto pr-1">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setWidth(p.width);
                    setHeight(p.height);
                  }}
                  className={`px-2 py-1 text-left rounded border transition-colors ${
                    width === p.width && height === p.height
                      ? 'bg-[#4a90e2] text-white border-[#4a90e2]'
                      : 'bg-[#222] border-gray-800 text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-300">Width (px)</label>
              <input
                type="number"
                min={200}
                max={4000}
                value={width}
                onChange={(e) => setWidth(Math.max(100, Number(e.target.value)))}
                className="bg-[#1e1e1e] border border-gray-700 px-2 py-1 rounded text-white outline-none focus:border-[#4a90e2]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-300">Height (px)</label>
              <input
                type="number"
                min={200}
                max={4000}
                value={height}
                onChange={(e) => setHeight(Math.max(100, Number(e.target.value)))}
                className="bg-[#1e1e1e] border border-gray-700 px-2 py-1 rounded text-white outline-none focus:border-[#4a90e2]"
              />
            </div>
          </div>

          {/* Background */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300">Canvas Paper Color</label>
            <div className="flex gap-2">
              <button
                onClick={() => setBgColor('white')}
                className={`flex-1 py-1.5 rounded border flex items-center justify-center gap-1.5 ${
                  bgColor === 'white'
                    ? 'bg-[#383838] border-[#4a90e2] text-white font-medium'
                    : 'bg-[#222] border-gray-800 text-gray-400'
                }`}
              >
                <div className="w-3 h-3 bg-white rounded-xs border border-gray-500" />
                White Paper
              </button>
              <button
                onClick={() => setBgColor('transparent')}
                className={`flex-1 py-1.5 rounded border flex items-center justify-center gap-1.5 ${
                  bgColor === 'transparent'
                    ? 'bg-[#383838] border-[#4a90e2] text-white font-medium'
                    : 'bg-[#222] border-gray-800 text-gray-400'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-xs border border-gray-500"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
                    backgroundSize: '4px 4px',
                    backgroundColor: '#eee',
                  }}
                />
                Transparent
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-9 bg-[#242424] border-t border-black flex items-center justify-end px-3 gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#3a3a3a] hover:bg-[#444] text-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCreate(width, height, bgColor === 'white' ? '#ffffff' : 'transparent', name);
              onClose();
            }}
            className="px-4 py-1 bg-[#4a90e2] hover:bg-blue-500 text-white rounded font-medium shadow-sm flex items-center gap-1"
          >
            <Check size={12} /> Create
          </button>
        </div>
      </div>
    </div>
  );
};
