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
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Maximize2,
  Minimize2,
  PenTool,
} from 'lucide-react';
import { Layer, BlendMode } from '../../types';
import { BLEND_MODE_OPTIONS } from '../../utils/brushPresets';

interface LayersPanelProps {
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
  onClearLayer: (id: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
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
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);

  const handleStartRename = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishRename = (layerId: string) => {
    if (editingName.trim()) {
      onUpdateLayer(layerId, { name: editingName.trim() });
    }
    setEditingLayerId(null);
  };

  return (
    <div id="panel-layers" className="flex-1 flex flex-col min-h-0 select-none bg-[#232323]">
      {/* Panel Header */}
      <div className="bg-[#363636] px-2 py-1 text-[10px] uppercase font-bold border-b border-black flex justify-between items-center text-gray-300">
        <span className="flex items-center gap-1.5">
          <Layers size={11} /> Layers
        </span>
        <span className="text-gray-400 font-normal text-[9px]">
          {activeLayer?.blendMode === 'source-over' ? 'Normal' : activeLayer?.blendMode}{' '}
          {Math.round((activeLayer?.opacity || 1) * 100)}%
        </span>
      </div>

      {/* Layer Controls Bar (Blend Mode & Opacity for Active Layer) */}
      <div className="bg-[#2a2a2a] p-1.5 border-b border-black flex flex-col gap-1 text-[10px]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-gray-400 text-[9px]">Mode:</span>
          <select
            value={activeLayer?.blendMode || 'source-over'}
            onChange={(e) =>
              activeLayer && onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })
            }
            className="flex-1 bg-[#1a1a1a] border border-gray-700 text-gray-200 text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer"
          >
            {BLEND_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-[9px]">Opacity:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((activeLayer?.opacity ?? 1) * 100)}
            onChange={(e) =>
              activeLayer && onUpdateLayer(activeLayer.id, { opacity: Number(e.target.value) / 100 })
            }
            className="flex-1 h-1 bg-[#151515] rounded-full accent-[#4a90e2] cursor-pointer"
          />
          <span className="text-gray-300 font-mono text-[9px] w-7 text-right">
            {Math.round((activeLayer?.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Layers List (Rendered from top layer to bottom layer) */}
      <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-1 bg-[#202020] no-scrollbar">
        {[...layers].reverse().map((layer, reverseIndex) => {
          const actualIndex = layers.length - 1 - reverseIndex;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center gap-1.5 p-1 rounded transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#383838] border-[#4a90e2]/70 shadow-sm'
                  : 'bg-[#2a2a2a] hover:bg-[#333] border-transparent opacity-90'
              } ${!layer.visible ? 'opacity-40' : ''}`}
            >
              {/* Layer Thumbnail */}
              <div
                className="w-8 h-6 bg-white/90 border border-black rounded-xs overflow-hidden flex items-center justify-center shrink-0 relative shadow-inner"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '4px 4px',
                  backgroundColor: '#f5f5f5',
                }}
              >
                {layer.thumbnail ? (
                  <img
                    src={layer.thumbnail}
                    alt={layer.name}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="text-[8px] text-gray-500 font-mono font-bold">L{actualIndex + 1}</span>
                )}
              </div>

              {/* Layer Name & Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(layer.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(layer.id)}
                    className="bg-[#151515] text-white border border-[#4a90e2] text-[10px] px-1 py-0.5 rounded outline-none w-full"
                  />
                ) : (
                  <div
                    onDoubleClick={() => handleStartRename(layer)}
                    className="font-medium text-[11px] text-gray-200 truncate hover:text-white flex items-center gap-1.5"
                    title="Double-click to rename"
                  >
                    <span>{layer.name}</span>
                    {layer.type === 'vector' && (
                      <span className="px-1 py-0.2 bg-blue-900/70 text-cyan-300 border border-cyan-500/50 rounded text-[7.5px] font-bold tracking-wide">
                        VECTOR
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[9px] text-gray-400 flex items-center gap-1">
                  <span>
                    {layer.blendMode === 'source-over' ? 'Normal' : layer.blendMode}
                  </span>
                  <span>•</span>
                  <span>{Math.round(layer.opacity * 100)}%</span>
                  {layer.type === 'vector' && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-400">
                        {layer.vectorStrokes?.length || 0} strokes
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Icons: Lock & Visibility */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  className={`p-1 rounded hover:bg-[#444] ${
                    layer.locked ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  className={`p-1 rounded hover:bg-[#444] ${
                    layer.visible ? 'text-gray-200 hover:text-white' : 'text-gray-600'
                  }`}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vector Layer Dedicated Action Bar (Vector tools) */}
      {activeLayer?.type === 'vector' && (
        <div className="bg-[#1b2533] border-t border-blue-900/60 p-1.5 flex flex-col gap-1 text-[9px] text-gray-200">
          <div className="flex items-center justify-between font-semibold text-cyan-300">
            <span className="flex items-center gap-1">
              <PenTool size={10} /> Vector Tools
            </span>
            <span className="text-gray-400 font-normal">Non-destructive</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onCleanUpVectorLayer?.(activeLayer.id)}
              title="Smooth out tremors and simplify vector nodes"
              className="flex-1 py-1 px-1 rounded bg-[#27374d] hover:bg-[#344966] text-cyan-200 flex items-center justify-center gap-1 font-medium transition-colors"
            >
              <Sparkles size={10} /> Clean Up / Smooth
            </button>

            <button
              onClick={() => onAdjustVectorWidth?.(activeLayer.id, 0.8)}
              title="Thin vector line weight by 20%"
              className="px-1.5 py-1 rounded bg-[#27374d] hover:bg-[#344966] text-gray-300 font-mono"
            >
              Width -
            </button>
            <button
              onClick={() => onAdjustVectorWidth?.(activeLayer.id, 1.25)}
              title="Thicken vector line weight by 25%"
              className="px-1.5 py-1 rounded bg-[#27374d] hover:bg-[#344966] text-gray-300 font-mono"
            >
              Width +
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onScaleVectorLayer?.(activeLayer.id, 1.25)}
              title="Scale vector lines by 1.25x (crisp zero-pixelation scaling)"
              className="flex-1 py-0.5 px-1 rounded bg-[#202c3d] hover:bg-[#2e4057] text-gray-300 flex items-center justify-center gap-1"
            >
              <Maximize2 size={9} /> Scale +25%
            </button>
            <button
              onClick={() => onScaleVectorLayer?.(activeLayer.id, 0.8)}
              title="Scale vector lines by 0.8x"
              className="flex-1 py-0.5 px-1 rounded bg-[#202c3d] hover:bg-[#2e4057] text-gray-300 flex items-center justify-center gap-1"
            >
              <Minimize2 size={9} /> Scale -20%
            </button>
          </div>
        </div>
      )}

      {/* Layers Panel Footer Toolbar */}
      <div className="h-8 bg-[#363636] border-t border-black flex items-center px-2 gap-2 text-gray-300">
        <button
          id="btn-add-layer"
          onClick={onAddLayer}
          title="New Raster Layer"
          className="p-1 rounded hover:bg-[#4a90e2] hover:text-white"
        >
          <Plus size={14} />
        </button>

        {onAddVectorLayer && (
          <button
            id="btn-add-vector-layer"
            onClick={onAddVectorLayer}
            title="New Vector Layer (Non-destructive line art)"
            className="px-1.5 py-0.5 rounded bg-[#24354a] border border-cyan-500/40 hover:bg-cyan-600 hover:text-white text-cyan-300 font-bold text-[9px] flex items-center gap-0.5 transition-colors"
          >
            <PenTool size={10} /> +Vector
          </button>
        )}

        <button
          id="btn-duplicate-layer"
          disabled={!activeLayer}
          onClick={() => activeLayer && onDuplicateLayer(activeLayer.id)}
          title="Duplicate Current Layer"
          className="p-1 rounded hover:bg-[#4a90e2] hover:text-white disabled:opacity-40"
        >
          <Copy size={12} />
        </button>

        <button
          id="btn-merge-down"
          disabled={activeIndex <= 0}
          onClick={() => activeLayer && onMergeDown(activeLayer.id)}
          title="Merge with Below Layer"
          className="p-1 rounded hover:bg-[#4a90e2] hover:text-white disabled:opacity-30"
        >
          <ArrowDown size={13} />
        </button>

        <button
          id="btn-move-layer-up"
          disabled={activeIndex >= layers.length - 1}
          onClick={() => activeLayer && onMoveLayer(activeLayer.id, 'up')}
          title="Move Layer Up"
          className="p-1 rounded hover:bg-[#4a90e2] hover:text-white disabled:opacity-30"
        >
          <ArrowUp size={13} />
        </button>

        <button
          id="btn-delete-layer"
          disabled={layers.length <= 1}
          onClick={() => activeLayer && onDeleteLayer(activeLayer.id)}
          title="Delete Layer"
          className="p-1 rounded hover:bg-red-600 hover:text-white disabled:opacity-30"
        >
          <Trash2 size={13} />
        </button>

        <div className="flex-1" />

        <span className="text-[9px] text-gray-400">{layers.length} Layers</span>
      </div>
    </div>
  );
};
