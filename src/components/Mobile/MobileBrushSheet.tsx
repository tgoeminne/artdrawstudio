import React, { useState } from 'react';
import { BrushSettings, BrushTipShape } from '../../types';
import { DEFAULT_BRUSH_PRESETS } from '../../utils/brushPresets';
import { MobileBottomSheet } from './MobileBottomSheet';
import { BrushStrokePreview } from '../BrushStrokePreview';
import {
  Check,
  Sliders,
  Sparkles,
  Plus,
  Minus,
  Menu,
  Download,
  Copy,
  Trash2,
  FolderOpen,
  RotateCcw,
  Palette,
} from 'lucide-react';

interface MobileBrushSheetProps {
  isOpen: boolean;
  onClose: () => void;
  brush: BrushSettings;
  onUpdateBrush: (updates: Partial<BrushSettings>) => void;
  onSelectPreset: (preset: BrushSettings) => void;
  primaryColor?: string;
}

type SubToolCategory = 'watercolor' | 'paint' | 'ink' | 'pencil' | 'airbrush' | 'all';

export const MobileBrushSheet: React.FC<MobileBrushSheetProps> = ({
  isOpen,
  onClose,
  brush,
  onUpdateBrush,
  onSelectPreset,
  primaryColor = '#ffffff',
}) => {
  const [activeTab, setActiveTab] = useState<'subtools' | 'settings'>('subtools');
  const [category, setCategory] = useState<SubToolCategory>('watercolor');
  const [previewColorMode, setPreviewColorMode] = useState<'csp-white' | 'current-color'>('csp-white');

  const filteredPresets =
    category === 'all'
      ? DEFAULT_BRUSH_PRESETS
      : DEFAULT_BRUSH_PRESETS.filter((p) => {
          if (category === 'watercolor') return p.category === 'watercolor';
          if (category === 'paint') return p.category === 'paint';
          if (category === 'ink') return p.category === 'ink';
          if (category === 'pencil') return p.category === 'pencil';
          if (category === 'airbrush') return p.category === 'airbrush' || p.category === 'marker';
          return true;
        });

  const tipShapes: { id: BrushTipShape; label: string; name: string }[] = [
    { id: 'round', label: '●', name: 'Round' },
    { id: 'calligraphy', label: '⬬', name: 'Calligraphy' },
    { id: 'chisel', label: '▮', name: 'Chisel' },
    { id: 'stipple', label: '⁖', name: 'Stipple' },
    { id: 'flat', label: '▬', name: 'Flat' },
  ];

  const quickSizes = [2, 4, 8, 14, 24, 36, 50, 80, 120];

  const categories: { id: SubToolCategory; label: string }[] = [
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'paint', label: 'Thick paint' },
    { id: 'ink', label: 'India ink / Pen' },
    { id: 'pencil', label: 'Pencil' },
    { id: 'airbrush', label: 'Airbrush' },
    { id: 'all', label: 'All Sub Tools' },
  ];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Sub Tool [Brush]"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="flex flex-col gap-2.5 pb-6 select-none">
        {/* ================= 1. PROMINENT MOBILE SIZE CONTROLLER ================= */}
        {/* Solves user feedback: "On mobile changing the size is really difficult" */}
        <div className="p-3 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Live circular preview of brush size with active primary color */}
              <div className="w-7 h-7 rounded-lg bg-[#2b2b2b] border border-[#444] flex items-center justify-center overflow-hidden shrink-0">
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: `${Math.min(24, Math.max(3, brush.size * 0.45))}px`,
                    height: `${Math.min(24, Math.max(3, brush.size * 0.45))}px`,
                    backgroundColor: primaryColor,
                    opacity: brush.opacity,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-gray-200">Brush Size</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-black text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-500/40">
                {brush.size} px
              </span>
            </div>
          </div>

          {/* Stepper Buttons + Full-Width Smooth Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateBrush({ size: Math.max(1, brush.size - (brush.size > 20 ? 5 : 1)) })}
              className="w-9 h-9 rounded-xl bg-[#2a2a2a] border border-white/10 text-gray-200 active:bg-blue-600 active:text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
              title="Decrease Size"
            >
              <Minus size={16} />
            </button>

            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min={1}
                max={150}
                value={brush.size}
                onChange={(e) => onUpdateBrush({ size: Number(e.target.value) })}
                className="w-full h-3 bg-[#121212] rounded-full accent-blue-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => onUpdateBrush({ size: Math.min(150, brush.size + (brush.size >= 20 ? 5 : 1)) })}
              className="w-9 h-9 rounded-xl bg-[#2a2a2a] border border-white/10 text-gray-200 active:bg-blue-600 active:text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
              title="Increase Size"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick 1-Tap Size Chips for Mobile Artists */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase shrink-0">Quick:</span>
            {quickSizes.map((sz) => (
              <button
                key={sz}
                onClick={() => onUpdateBrush({ size: sz })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold shrink-0 active:scale-95 transition-all ${
                  brush.size === sz
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[#2b2b2b] text-gray-300 hover:text-white hover:bg-[#333]'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>
        </div>

        {/* ================= 2. TAB SWITCHER (Sub Tools vs Engine Parameters) ================= */}
        <div className="flex bg-[#1c1c1c] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('subtools')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'subtools'
                ? 'bg-[#353535] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Sub Tool [Brush]</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-[#353535] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            <span>Brush Dynamics</span>
          </button>
        </div>

        {activeTab === 'subtools' ? (
          <>
            {/* ================= 3. CSP SUB-TOOL GROUP TABS ================= */}
            {/* Matching [Watercolor] [Realistic] [Thick paint] [India ink] in user's image */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-black/40 pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                    category === cat.id
                      ? 'bg-[#323232] text-white border-blue-400 font-bold shadow-sm'
                      : 'bg-[#222] text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sub-tool list controls bar */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <span>Showing {filteredPresets.length} sub tools</span>
              </span>
              <button
                onClick={() =>
                  setPreviewColorMode(
                    previewColorMode === 'csp-white' ? 'current-color' : 'csp-white'
                  )
                }
                className="flex items-center gap-1 text-gray-400 hover:text-white"
                title="Toggle preview color: CSP default white or active color"
              >
                <Palette size={11} />
                <span>
                  {previewColorMode === 'csp-white' ? 'White Preview' : 'Color Preview'}
                </span>
              </button>
            </div>

            {/* ================= 4. AUTHENTIC CSP SUB-TOOL BRUSH LIST ================= */}
            {/* Exactly replicates the list in the user's reference image */}
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[42vh] pr-0.5 no-scrollbar rounded-xl border border-white/5 bg-[#1a1a1a] p-1">
              {filteredPresets.map((p) => {
                const isSelected = brush.name === p.name;
                const strokeColor =
                  previewColorMode === 'current-color' ? primaryColor : '#ffffff';

                return (
                  <button
                    key={p.id || p.name}
                    onClick={() => {
                      onSelectPreset(p);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-left transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#273d57] border-blue-400 text-white shadow-md'
                        : 'bg-[#242424] border-transparent text-gray-200 hover:bg-[#2c2c2c]'
                    }`}
                  >
                    {/* Left: Authentic S-Curve Brush Stroke Preview Canvas */}
                    <div className="flex items-center shrink-0 w-32 h-8 rounded bg-[#1b1b1b] border border-black/50 overflow-hidden relative mr-3 shadow-inner">
                      <BrushStrokePreview
                        brush={p}
                        width={128}
                        height={32}
                        strokeColor={strokeColor}
                      />
                    </div>

                    {/* Right: Brush Sub Tool Name */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="font-semibold text-xs text-gray-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <span className="capitalize">{p.tipShape}</span>
                        <span>•</span>
                        <span>{p.size}px</span>
                        <span>•</span>
                        <span>{Math.round(p.opacity * 100)}%</span>
                      </div>
                    </div>

                    {/* Selection Indicator Check */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 ml-2 shadow">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Subtool Action Toolbar (as in CSP bottom panel) */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-gray-400">
              <span className="text-[10px] text-gray-400">Clip Studio Paint Sub Tool System</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const found = DEFAULT_BRUSH_PRESETS.find((p) => p.name === brush.name);
                    if (found) onSelectPreset(found);
                  }}
                  className="px-2 py-1 bg-[#282828] hover:bg-[#333] text-gray-300 rounded text-[10px] flex items-center gap-1 active:scale-95"
                  title="Reset active brush to default"
                >
                  <RotateCcw size={11} />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ================= 5. ENGINE PARAMETERS TAB ================= */
          <div className="flex flex-col gap-3 mt-1 overflow-y-auto max-h-[50vh] pr-0.5 no-scrollbar">
            {/* Stroke Stabilizer (Smoothing) */}
            <div className="flex flex-col gap-1 p-2.5 bg-[#252525] rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  Stabilization (CSP Smoothing)
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {brush.stabilization} / 30
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={brush.stabilization}
                onChange={(e) => onUpdateBrush({ stabilization: Number(e.target.value) })}
                className="w-full h-2 bg-[#141414] rounded-full cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] text-gray-400">
                Averages stroke coordinates to produce clean, wobble-free line art.
              </span>
            </div>

            {/* Tip Shape */}
            <div className="flex flex-col gap-1.5 p-2.5 bg-[#252525] rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-200">Brush Nib Shape</span>
              <div className="grid grid-cols-5 gap-1.5">
                {tipShapes.map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => onUpdateBrush({ tipShape: ts.id })}
                    className={`py-2 px-1 flex flex-col items-center rounded-lg border text-center transition-all ${
                      brush.tipShape === ts.id
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-[#1a1a1a] text-gray-300 border-white/5 hover:bg-[#333]'
                    }`}
                  >
                    <span className="text-base">{ts.label}</span>
                    <span className="text-[8px] mt-0.5 truncate w-full">{ts.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hardness & Spacing */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 p-2.5 bg-[#252525] rounded-xl border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Hardness</span>
                  <span className="font-mono text-gray-400">
                    {Math.round(brush.hardness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(brush.hardness * 100)}
                  onChange={(e) => onUpdateBrush({ hardness: Number(e.target.value) / 100 })}
                  className="w-full h-2 bg-[#141414] rounded-full accent-[#4a90e2]"
                />
              </div>

              <div className="flex flex-col gap-1 p-2.5 bg-[#252525] rounded-xl border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Spacing</span>
                  <span className="font-mono text-gray-400">
                    {Math.round(brush.spacing * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={Math.round(brush.spacing * 100)}
                  onChange={(e) => onUpdateBrush({ spacing: Number(e.target.value) / 100 })}
                  className="w-full h-2 bg-[#141414] rounded-full accent-[#4a90e2]"
                />
              </div>
            </div>

            {/* Pressure & Color Dynamics */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#252525] rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-200">Pressure & Color Mixing</span>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs text-gray-300">Stylus Pressure affects Size</span>
                <input
                  type="checkbox"
                  checked={brush.pressureSize}
                  onChange={(e) => onUpdateBrush({ pressureSize: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs text-gray-300">Stylus Pressure affects Opacity</span>
                <input
                  type="checkbox"
                  checked={brush.pressureOpacity}
                  onChange={(e) => onUpdateBrush({ pressureOpacity: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs text-gray-300">Mix Ground Color (Wet Watercolor)</span>
                <input
                  type="checkbox"
                  checked={brush.mixGroundColor}
                  onChange={(e) => onUpdateBrush({ mixGroundColor: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
              </label>

              {brush.mixGroundColor && (
                <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Color Mix Amount</span>
                      <span className="font-mono">{Math.round(brush.colorMixRatio * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(brush.colorMixRatio * 100)}
                      onChange={(e) => onUpdateBrush({ colorMixRatio: Number(e.target.value) / 100 })}
                      className="w-full h-2 bg-[#141414] rounded-full accent-blue-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Pigment Pull / Smear</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round((brush.colorSmear ?? 0.5) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((brush.colorSmear ?? 0.5) * 100)}
                      onChange={(e) => onUpdateBrush({ colorSmear: Number(e.target.value) / 100 })}
                      className="w-full h-2 bg-[#141414] rounded-full accent-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Smart Correction & Tapering */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#252525] rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-200 flex items-center justify-between">
                <span>Smart Correction & Line Tapering</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-cyan-950 text-cyan-400 rounded-md border border-cyan-800">
                  NEW
                </span>
              </span>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs text-gray-300">Tremor Reduction (Ramer-Douglas-Peucker)</span>
                <input
                  type="checkbox"
                  checked={!!brush.smartCorrection}
                  onChange={(e) => onUpdateBrush({ smartCorrection: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>

              <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Line End Tapering</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round((brush.taperFactor ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((brush.taperFactor ?? 0) * 100)}
                  onChange={(e) => onUpdateBrush({ taperFactor: Number(e.target.value) / 100 })}
                  className="w-full h-2 bg-[#141414] rounded-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Dual Brush Engine */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#26202c] rounded-xl border border-purple-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Dual Brush Engine</span>
                <input
                  type="checkbox"
                  checked={!!brush.dualBrush?.enabled}
                  onChange={(e) =>
                    onUpdateBrush({
                      dualBrush: {
                        enabled: e.target.checked,
                        tipShape: brush.dualBrush?.tipShape || 'stipple',
                        blendMode: brush.dualBrush?.blendMode || 'multiply',
                        sizeRatio: brush.dualBrush?.sizeRatio || 0.85,
                        spacing: brush.dualBrush?.spacing || 0.1,
                        hardness: brush.dualBrush?.hardness || 0.6,
                        textureIntensity: brush.dualBrush?.textureIntensity || 0.7,
                        angle: brush.dualBrush?.angle || 0,
                        jitter: brush.dualBrush?.jitter || 0.05,
                      },
                    })
                  }
                  className="w-4 h-4 rounded accent-purple-500"
                />
              </div>

              {brush.dualBrush?.enabled && (
                <div className="flex flex-col gap-2 pt-1 border-t border-purple-900/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">2nd Shape:</span>
                    <div className="flex gap-1">
                      {tipShapes.map((ts) => (
                        <button
                          key={ts.id}
                          onClick={() =>
                            onUpdateBrush({
                              dualBrush: {
                                ...brush.dualBrush!,
                                tipShape: ts.id,
                              },
                            })
                          }
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs border ${
                            brush.dualBrush?.tipShape === ts.id
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-[#151515] border-gray-700 text-gray-400'
                          }`}
                        >
                          {ts.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Texture Intensity</span>
                      <span className="font-mono text-purple-300">
                        {Math.round((brush.dualBrush.textureIntensity ?? 0.7) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round((brush.dualBrush.textureIntensity ?? 0.7) * 100)}
                      onChange={(e) =>
                        onUpdateBrush({
                          dualBrush: {
                            ...brush.dualBrush!,
                            textureIntensity: Number(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full h-2 bg-[#141414] rounded-full accent-purple-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wacom Stylus Dynamics (Pressure, Tilt, Barrel Twist) */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#252525] rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-200 flex items-center gap-1.5">
                  <PenTool size={14} className="text-blue-400" />
                  Wacom Stylus Dynamics
                </span>
                <span className="text-[9px] bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                  PRO PEN
                </span>
              </div>

              {/* Pressure Curve Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Pressure Curve:</span>
                <select
                  value={brush.pressureCurve || 'linear'}
                  onChange={(e) => onUpdateBrush({ pressureCurve: e.target.value as any })}
                  className="bg-[#181818] text-blue-300 text-xs px-2 py-1 rounded border border-gray-700 outline-none"
                >
                  <option value="linear">Linear (Standard 1:1)</option>
                  <option value="soft">Soft (Light Expressive)</option>
                  <option value="firm">Firm (Inking Control)</option>
                  <option value="s-curve">S-Curve (Sigmoid)</option>
                </select>
              </div>

              {/* Tilt Shading */}
              <label className="flex items-center justify-between cursor-pointer text-xs text-gray-300">
                <span>Tilt Shading & Ellipse</span>
                <input
                  type="checkbox"
                  checked={brush.tiltShading !== false}
                  onChange={(e) => onUpdateBrush({ tiltShading: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-500"
                />
              </label>

              {/* Barrel Rotation (Twist) */}
              <label className="flex items-center justify-between cursor-pointer text-xs text-gray-300">
                <span>Barrel Rotation (360° Twist)</span>
                <input
                  type="checkbox"
                  checked={brush.rotationTwist !== false}
                  onChange={(e) => onUpdateBrush({ rotationTwist: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-500"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};
