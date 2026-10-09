import React from 'react';
import {
  PenTool,
  Move,
  Check,
  X,
  Trash2,
  Spline,
  Square,
  CircleDot,
  Minus,
  Grid,
  CornerUpRight,
  Maximize2,
  Compass,
} from 'lucide-react';
import { VectorPath } from '../types';

export type VectorCadMode = 'draw' | 'edit';

interface VectorCadBarProps {
  mode: VectorCadMode;
  onSetMode: (mode: VectorCadMode) => void;
  strokeColor: string;
  onChangeStrokeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  strokeDash: 'solid' | 'dashed' | 'dotted';
  onChangeStrokeDash: (dash: 'solid' | 'dashed' | 'dotted') => void;
  fillColor: string;
  onChangeFillColor: (color: string) => void;
  isClosed: boolean;
  onToggleClosed: () => void;
  inProgressNodeCount: number;
  onFinishPath: () => void;
  onCancelPath: () => void;
  selectedPath: VectorPath | null;
  selectedNodeIndex: number | null;
  onDeleteSelectedPath?: () => void;
  onDeleteSelectedNode?: () => void;
  onToggleNodeType?: (type: 'corner' | 'smooth') => void;
  isGridSnap: boolean;
  onToggleGridSnap: () => void;
  isOrtho: boolean;
  onToggleOrtho?: () => void;
}

export const VectorCadBar: React.FC<VectorCadBarProps> = ({
  mode,
  onSetMode,
  strokeColor,
  onChangeStrokeColor,
  strokeWidth,
  onChangeStrokeWidth,
  strokeDash,
  onChangeStrokeDash,
  fillColor,
  onChangeFillColor,
  isClosed,
  onToggleClosed,
  inProgressNodeCount,
  onFinishPath,
  onCancelPath,
  selectedPath,
  selectedNodeIndex,
  onDeleteSelectedPath,
  onDeleteSelectedNode,
  onToggleNodeType,
  isGridSnap,
  onToggleGridSnap,
  isOrtho,
  onToggleOrtho,
}) => {
  const isNoFill = !fillColor || fillColor === 'none' || fillColor === 'transparent';

  return (
    <div
      id="vector-cad-bar"
      className="absolute top-12 left-16 z-30 bg-[#252525]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl px-3 py-2 flex flex-wrap items-center gap-3 text-white text-xs select-none animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* CAD Mode Tabs */}
      <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-white/5">
        <button
          type="button"
          onClick={() => onSetMode('draw')}
          title="Point-by-Point CAD Pen (Click to place vertices, drag for Bezier curve)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'draw'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <PenTool size={13} />
          <span>Draw Path</span>
        </button>
        <button
          type="button"
          onClick={() => onSetMode('edit')}
          title="Node Edit Tool (Select shape, drag vertices, adjust Bezier tangents)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'edit'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Move size={13} />
          <span>Edit Nodes</span>
        </button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Stroke Color & Width */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-[11px] font-medium">Stroke</span>
        <input
          type="color"
          value={strokeColor.startsWith('#') ? strokeColor : '#ffffff'}
          onChange={(e) => onChangeStrokeColor(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer p-0"
          title="Stroke color"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max="64"
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(Math.max(1, Number(e.target.value) || 2))}
            className="w-10 bg-[#161616] border border-white/10 rounded px-1 py-0.5 text-center text-xs"
            title="Stroke width (px)"
          />
          <span className="text-gray-400 text-[10px]">px</span>
        </div>
      </div>

      {/* Stroke Dash Style */}
      <div className="flex items-center bg-[#181818] p-0.5 rounded-md border border-white/5">
        <button
          type="button"
          onClick={() => onChangeStrokeDash('solid')}
          title="Solid Line"
          className={`px-2 py-1 rounded text-[10px] font-medium ${
            strokeDash === 'solid' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Solid
        </button>
        <button
          type="button"
          onClick={() => onChangeStrokeDash('dashed')}
          title="Dashed Line"
          className={`px-2 py-1 rounded text-[10px] font-medium ${
            strokeDash === 'dashed' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Dash
        </button>
        <button
          type="button"
          onClick={() => onChangeStrokeDash('dotted')}
          title="Dotted Line"
          className={`px-2 py-1 rounded text-[10px] font-medium ${
            strokeDash === 'dotted' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Dot
        </button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Fill Color & Transparent Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-[11px] font-medium">Fill</span>
        <button
          type="button"
          onClick={() => onChangeFillColor(isNoFill ? '#3b82f6' : 'none')}
          className={`px-2 py-0.5 rounded text-[10px] border transition ${
            isNoFill
              ? 'border-gray-600 text-gray-400 bg-white/5'
              : 'border-blue-500 text-blue-300 bg-blue-500/20'
          }`}
          title="Toggle fill on/off"
        >
          {isNoFill ? 'No Fill' : 'Filled'}
        </button>
        {!isNoFill && (
          <input
            type="color"
            value={fillColor.startsWith('#') ? fillColor : '#3b82f6'}
            onChange={(e) => onChangeFillColor(e.target.value)}
            className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer p-0"
            title="Fill color"
          />
        )}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Polygon Closed / Open Toggle */}
      <button
        type="button"
        onClick={onToggleClosed}
        title="Toggle Closed Polygon vs Open Polyline"
        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1.5 ${
          isClosed
            ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
        }`}
      >
        <CircleDot size={12} />
        {isClosed ? 'Closed Polygon' : 'Open Polyline'}
      </button>

      {/* Grid Snap & Ortho Mode */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleGridSnap}
          title="Snap to 20px CAD Grid"
          className={`p-1.5 rounded-md border transition ${
            isGridSnap
              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
              : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Grid size={14} />
        </button>
        <div
          title="Hold Shift while drawing for Ortho 45°/90° angle snapping"
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            isOrtho
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'border-white/5 text-gray-500'
          }`}
        >
          ORTHO {isOrtho ? 'ON' : 'SHIFT'}
        </div>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* In-Progress Path Action Buttons (Draw Mode) */}
      {mode === 'draw' && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 font-mono">
            {inProgressNodeCount} {inProgressNodeCount === 1 ? 'pt' : 'pts'}
          </span>
          <button
            type="button"
            onClick={onFinishPath}
            disabled={inProgressNodeCount < 2}
            title="Finish & Commit Path (Enter or Double-Click)"
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold rounded-md text-xs flex items-center gap-1 shadow-sm transition"
          >
            <Check size={13} />
            Finish
          </button>
          {inProgressNodeCount > 0 && (
            <button
              type="button"
              onClick={onCancelPath}
              title="Cancel In-Progress Path (Esc)"
              className="p-1 text-gray-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Edit Mode Selected Node & Path Actions */}
      {mode === 'edit' && (
        <div className="flex items-center gap-2">
          {selectedNodeIndex !== null && onToggleNodeType && (
            <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded border border-white/10">
              <button
                type="button"
                onClick={() => onToggleNodeType('corner')}
                title="Convert node to Sharp / Corner"
                className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-300 hover:text-white hover:bg-white/10"
              >
                Sharp Node
              </button>
              <button
                type="button"
                onClick={() => onToggleNodeType('smooth')}
                title="Convert node to Smooth Bezier Curve"
                className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-300 hover:text-white hover:bg-white/10"
              >
                Smooth Bezier
              </button>
              {onDeleteSelectedNode && (
                <button
                  type="button"
                  onClick={onDeleteSelectedNode}
                  title="Delete Selected Node (Del)"
                  className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}

          {selectedPath && onDeleteSelectedPath && (
            <button
              type="button"
              onClick={onDeleteSelectedPath}
              title="Delete Entire Path (Del)"
              className="px-2 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded text-xs font-medium flex items-center gap-1 transition"
            >
              <Trash2 size={12} /> Delete Path
            </button>
          )}
        </div>
      )}
    </div>
  );
};
