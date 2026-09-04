import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowDown,
  ArrowUp,
  Eraser,
  Check,
  PenTool,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Layer, BlendMode } from '../../types';
import { BLEND_MODE_OPTIONS } from '../../utils/brushPresets';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileLayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onAddVectorLayer?: () => void;
  onCleanUpVectorLayer?: (layerId: string) => void;
  onAdjustVectorWidth?: (layerId: string, factor: number) => void;
  onScaleVectorLayer?: (layerId: string, factor: number) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMergeDown: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onClearLayer: () => void;
}

export const MobileLayersSheet: React.FC<MobileLayersSheetProps> = ({
  isOpen,
  onClose,
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onAddVectorLayer,
  onCleanUpVectorLayer,
  onAdjustVectorWidth,
  onScaleVectorLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeDown,
  onMoveLayer,
  onToggleVisibility,
  onToggleLock,
  onUpdateLayer,
  onClearLayer,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onUpdateLayer(id, { name: editingName.trim() });
    }
    setEditingId(null);
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Layers Manager"
      headerAction={
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddLayer}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 active:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
          >
            <Plus size={13} /> Layer
          </button>
          {onAddVectorLayer && (
            <button
              onClick={onAddVectorLayer}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#203247] border border-cyan-500/50 active:bg-cyan-700 text-cyan-300 rounded-lg text-xs font-bold shadow"
            >
              <PenTool size={12} /> +Vector
            </button>
          )}
        </div>
      }
      maxHeightClass="max-h-[85vh]"
    >
      <div className="flex flex-col gap-3 pb-6">
        {/* Active Layer Quick Adjustment Bar */}
        {activeLayer && (
          <div className="p-3 bg-[#1e1e1e] rounded-xl border border-white/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 truncate max-w-[160px] flex items-center gap-1.5">
                <span>{activeLayer.name}</span>
                {activeLayer.type === 'vector' && (
                  <span className="px-1.5 py-0.2 bg-blue-900/80 text-cyan-300 border border-cyan-500/50 rounded text-[9px] font-bold">
                    VECTOR
                  </span>
                )}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {Math.round((activeLayer.opacity ?? 1) * 100)}%
              </span>
            </div>

            {/* If Vector Layer: Dedicated Vector Control Bar */}
            {activeLayer.type === 'vector' && (
              <div className="p-2 bg-[#172230] rounded-lg border border-cyan-800/40 flex flex-col gap-2 text-[11px]">
                <div className="flex items-center justify-between text-cyan-300 font-semibold text-[10px]">
                  <span className="flex items-center gap-1">
                    <PenTool size={11} /> Vector Operations
                  </span>
                  <span className="text-gray-400 font-normal">
                    {activeLayer.vectorStrokes?.length || 0} strokes
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onCleanUpVectorLayer?.(activeLayer.id)}
                    className="py-1.5 px-2 bg-[#23354c] active:bg-[#324b6b] text-cyan-200 rounded-lg font-bold flex items-center justify-center gap-1 text-[10px]"
                  >
                    <Sparkles size={11} /> Clean Up
                  </button>
                  <button
                    onClick={() => onAdjustVectorWidth?.(activeLayer.id, 0.8)}
                    className="py-1.5 px-1 bg-[#23354c] active:bg-[#324b6b] text-gray-300 rounded-lg font-mono text-[10px] text-center"
                  >
                    Width -20%
                  </button>
                  <button
                    onClick={() => onAdjustVectorWidth?.(activeLayer.id, 1.25)}
                    className="py-1.5 px-1 bg-[#23354c] active:bg-[#324b6b] text-gray-300 rounded-lg font-mono text-[10px] text-center"
                  >
                    Width +25%
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onScaleVectorLayer?.(activeLayer.id, 1.25)}
                    className="py-1 px-2 bg-[#1c2c3f] active:bg-[#2c4360] text-gray-300 rounded-lg flex items-center justify-center gap-1 text-[10px]"
                  >
                    <Maximize2 size={11} /> Scale +25%
                  </button>
                  <button
                    onClick={() => onScaleVectorLayer?.(activeLayer.id, 0.8)}
                    className="py-1 px-2 bg-[#1c2c3f] active:bg-[#2c4360] text-gray-300 rounded-lg flex items-center justify-center gap-1 text-[10px]"
                  >
                    <Minimize2 size={11} /> Scale -20%
                  </button>
                </div>
              </div>
            )}

            {/* Blend Mode & Opacity */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400">Blending Mode</span>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })
                  }
                  className="bg-[#2a2a2a] border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
                >
                  {BLEND_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400">Layer Opacity</span>
                <div className="flex items-center h-[34px] px-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((activeLayer.opacity ?? 1) * 100)}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { opacity: Number(e.target.value) / 100 })
                    }
                    className="w-full h-2 bg-[#2a2a2a] rounded-full accent-[#4a90e2]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
              <div className="flex gap-1.5">
                <button
                  onClick={() => onDuplicateLayer(activeLayer.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-[#2a2a2a] active:bg-[#383838] text-gray-300 rounded-md"
                  title="Duplicate Layer"
                >
                  <Copy size={12} /> Duplicate
                </button>
                <button
                  onClick={() => onMergeDown(activeLayer.id)}
                  disabled={activeIndex <= 0}
                  className={`flex items-center gap-1 px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded-md ${
                    activeIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:bg-[#383838]'
                  }`}
                  title="Merge Down"
                >
                  <ArrowDown size={12} /> Merge Down
                </button>
                <button
                  onClick={onClearLayer}
                  className="flex items-center gap-1 px-2 py-1 bg-[#2a2a2a] active:bg-[#383838] text-amber-400 rounded-md"
                  title="Clear Layer Content"
                >
                  <Eraser size={12} /> Clear
                </button>
              </div>

              <button
                onClick={() => onDeleteLayer(activeLayer.id)}
                disabled={layers.length <= 1}
                className={`flex items-center gap-1 px-2 py-1 bg-red-950/40 text-red-400 border border-red-900/50 rounded-md ${
                  layers.length <= 1 ? 'opacity-40 cursor-not-allowed' : 'active:bg-red-900/60'
                }`}
                title="Delete Layer"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Layer Stack Items (Reversed so top layer is at top of UI) */}
        <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-0.5">
          {[...layers].reverse().map((layer, revIdx) => {
            const index = layers.length - 1 - revIdx;
            const isSelected = layer.id === activeLayerId;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-[#2a2a2a] border-white/5 hover:bg-[#323232]'
                }`}
              >
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-1.5 rounded-lg active:scale-90 transition-transform ${
                    layer.visible ? 'text-gray-200' : 'text-gray-600 bg-[#222]'
                  }`}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className={`p-1.5 rounded-lg active:scale-90 transition-transform ${
                    layer.locked ? 'text-amber-400 bg-amber-950/30' : 'text-gray-600'
                  }`}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>

                {/* Layer Thumbnail */}
                <div className="w-11 h-9 rounded bg-[#1e1e1e] border border-gray-700 shrink-0 overflow-hidden flex items-center justify-center">
                  {layer.thumbnail ? (
                    <img
                      src={layer.thumbnail}
                      alt={layer.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#181818]" />
                  )}
                </div>

                {/* Layer Name & Info */}
                <div className="flex-1 min-w-0">
                  {editingId === layer.id ? (
                    <input
                      type="text"
                      value={editingName}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleSaveRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(layer.id);
                      }}
                      className="w-full bg-[#151515] border border-blue-400 px-1 py-0.5 rounded text-white text-xs font-bold outline-none"
                    />
                  ) : (
                    <div
                      onDoubleClick={() => handleStartRename(layer)}
                      className="font-bold text-xs text-gray-200 truncate flex items-center gap-1.5"
                    >
                      <span>{layer.name}</span>
                      {layer.type === 'vector' && (
                        <span className="px-1 py-0.2 bg-blue-900/80 text-cyan-300 border border-cyan-500/50 rounded text-[8px] font-bold">
                          VECTOR
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5 capitalize mt-0.5">
                    <span>{layer.blendMode === 'source-over' ? 'Normal' : layer.blendMode}</span>
                    <span>•</span>
                    <span>{Math.round((layer.opacity ?? 1) * 100)}%</span>
                    {layer.type === 'vector' && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">
                          {layer.vectorStrokes?.length || 0} strokes
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onMoveLayer(layer.id, 'up')}
                    disabled={index >= layers.length - 1}
                    className={`p-1 rounded bg-[#222] text-gray-400 ${
                      index >= layers.length - 1 ? 'opacity-30' : 'hover:text-white'
                    }`}
                    title="Move Layer Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => onMoveLayer(layer.id, 'down')}
                    disabled={index <= 0}
                    className={`p-1 rounded bg-[#222] text-gray-400 ${
                      index <= 0 ? 'opacity-30' : 'hover:text-white'
                    }`}
                    title="Move Layer Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileBottomSheet>
  );
};
