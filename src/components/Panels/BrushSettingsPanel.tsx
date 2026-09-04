import React, { useState } from 'react';
import { Sliders, CheckSquare, Square as SquareIcon, Sparkles, ExternalLink, List, Settings } from 'lucide-react';
import { BrushSettings, BrushTipShape } from '../../types';
import { DEFAULT_BRUSH_PRESETS } from '../../utils/brushPresets';
import { BrushStrokePreview } from '../BrushStrokePreview';

interface BrushSettingsPanelProps {
  brush: BrushSettings;
  onUpdateBrush: (newSettings: Partial<BrushSettings>) => void;
  onSelectPreset: (preset: BrushSettings) => void;
  onOpenBrushMenu?: () => void;
}

export const BrushSettingsPanel: React.FC<BrushSettingsPanelProps> = ({
  brush,
  onUpdateBrush,
  onSelectPreset,
  onOpenBrushMenu,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'watercolor' | 'paint' | 'ink' | 'pencil' | 'airbrush'
  >('all');
  const [panelViewMode, setPanelViewMode] = useState<'properties' | 'previews'>('properties');

  const filteredPresets =
    activeCategory === 'all'
      ? DEFAULT_BRUSH_PRESETS
      : DEFAULT_BRUSH_PRESETS.filter((p) => p.category === activeCategory);

  const tipShapes: { id: BrushTipShape; label: string }[] = [
    { id: 'round', label: '●' },
    { id: 'calligraphy', label: '⬬' },
    { id: 'chisel', label: '▮' },
    { id: 'stipple', label: '⁖' },
    { id: 'flat', label: '▬' },
  ];

  return (
    <div id="panel-brush-settings" className="h-[280px] flex flex-col border-b border-black select-none bg-[#282828]">
      {/* Panel Header */}
      <div className="bg-[#363636] px-2 py-1 text-[10px] uppercase font-bold border-b border-black flex justify-between items-center text-gray-300">
        <span className="flex items-center gap-1.5">
          <Sliders size={11} />
          <span>Sub Tool [Brush]</span>
        </span>
        <div className="flex items-center gap-1">
          {/* Toggle between Sliders and Previews inside the panel */}
          <div className="flex bg-[#222] rounded p-0.5 border border-white/5 mr-1">
            <button
              onClick={() => setPanelViewMode('properties')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                panelViewMode === 'properties'
                  ? 'bg-[#4a90e2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Tool Properties (Sliders & Dynamics)"
            >
              Properties
            </button>
            <button
              onClick={() => setPanelViewMode('previews')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                panelViewMode === 'previews'
                  ? 'bg-[#4a90e2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Browse Preset Strokes with Previews"
            >
              Previews
            </button>
          </div>

          {/* Open full detached Brush Selection Window */}
          {onOpenBrushMenu && (
            <button
              onClick={onOpenBrushMenu}
              className="p-1 text-[#4a90e2] hover:text-white hover:bg-[#4a90e2]/30 rounded transition-colors"
              title="Open Floating Brush Selection Menu"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>

      {/* S-Curve Preview Banner for Active Brush */}
      <div className="h-9 bg-[#1e1e1e] border-b border-black flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-bold uppercase">Stroke:</span>
          <div className="rounded bg-[#141414] border border-white/10 overflow-hidden shadow-inner">
            <BrushStrokePreview brush={brush} width={130} height={26} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-blue-400 font-semibold truncate max-w-[80px]">
            {brush.name}
          </span>
          <span className="text-[9px] font-mono text-cyan-400 font-bold">{brush.size}px</span>
        </div>
      </div>

      {/* Preset Sub-tool categories / Quick Switcher */}
      <div className="h-6 bg-[#2d2d2d] border-b border-black flex items-center px-1.5 gap-1 text-[9px] overflow-x-auto no-scrollbar">
        {(['all', 'watercolor', 'paint', 'ink', 'pencil', 'airbrush'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-1.5 py-0.5 rounded capitalize whitespace-nowrap ${
              activeCategory === cat ? 'bg-[#4a90e2] text-white' : 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {panelViewMode === 'previews' ? (
        /* INLINE BRUSH PREVIEWS LIST */
        <div className="flex-1 p-1.5 overflow-y-auto no-scrollbar flex flex-col gap-1 bg-[#1c1c1c]">
          {filteredPresets.map((preset) => {
            const isSelected = brush.name === preset.name || brush.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`flex items-center justify-between p-1 rounded-md border text-left transition-all ${
                  isSelected
                    ? 'bg-[#273d57] border-[#4a90e2] text-white shadow-xs'
                    : 'bg-[#252525] border-transparent text-gray-300 hover:bg-[#2e2e2e] hover:border-gray-600'
                }`}
              >
                <div className="w-24 h-6 rounded bg-[#151515] border border-black/80 overflow-hidden shrink-0 mr-1.5 shadow-inner">
                  <BrushStrokePreview brush={preset} width={96} height={24} strokeColor="#ffffff" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate leading-tight">{preset.name}</div>
                  <div className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                    <span>{preset.size}px</span>
                    <span>•</span>
                    <span className="capitalize">{preset.tipShape}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {/* Preset Pills List */}
          <div className="h-8 bg-[#232323] border-b border-black px-2 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`px-2 py-0.5 rounded text-nowrap whitespace-nowrap transition-colors flex items-center gap-1 border ${
                  brush.id === preset.id
                    ? 'bg-[#383838] border-[#4a90e2] text-white shadow-xs'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-[#2d2d2d]'
                }`}
              >
                <span className="text-[8px] text-[#4a90e2]">●</span>
                {preset.name}
              </button>
            ))}
          </div>

          {/* Customizable Brush Engine Parameters */}
          <div className="flex-1 p-2.5 text-[11px] flex flex-col gap-2 overflow-y-auto no-scrollbar">
        {/* Brush Size */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">Brush Size</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={200}
                value={Math.round(brush.size)}
                onChange={(e) => onUpdateBrush({ size: Number(e.target.value) })}
                className="w-10 bg-[#1a1a1a] border border-gray-700 text-gray-300 text-right px-1 py-0.2 rounded text-[9px] outline-none"
              />
              <span className="text-gray-400 text-[9px]">px</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={150}
              value={brush.size}
              onChange={(e) => onUpdateBrush({ size: Number(e.target.value) })}
              className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full accent-[#4a90e2] cursor-pointer"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">Opacity</span>
            <span className="text-gray-400 font-mono text-[9px]">{Math.round(brush.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(brush.opacity * 100)}
            onChange={(e) => onUpdateBrush({ opacity: Number(e.target.value) / 100 })}
            className="w-full h-1.5 bg-[#1a1a1a] rounded-full accent-[#4a90e2] cursor-pointer"
          />
        </div>

        {/* Stabilization / Line Smoothing (Clip Studio Paint signature) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300 flex items-center gap-1">
              Stabilization
              <span className="text-[8px] px-1 bg-[#1a1a1a] text-blue-400 rounded">CSP</span>
            </span>
            <span className="text-[#4a90e2] font-mono text-[9px] font-bold">{brush.stabilization}</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            value={brush.stabilization}
            onChange={(e) => onUpdateBrush({ stabilization: Number(e.target.value) })}
            className="w-full h-1.5 bg-[#1a1a1a] rounded-full accent-[#4a90e2] cursor-pointer"
          />
        </div>

        {/* Hardness */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">Hardness / Soft Edge</span>
            <span className="text-gray-400 font-mono text-[9px]">{Math.round(brush.hardness * 100)}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(brush.hardness * 100)}
            onChange={(e) => onUpdateBrush({ hardness: Number(e.target.value) / 100 })}
            className="w-full h-1.5 bg-[#1a1a1a] rounded-full accent-[#4a90e2] cursor-pointer"
          />
        </div>

        {/* Tip Shape Selector */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-700">
          <span className="text-gray-400 text-[10px]">Tip Shape</span>
          <div className="flex gap-1">
            {tipShapes.map((ts) => (
              <button
                key={ts.id}
                onClick={() => onUpdateBrush({ tipShape: ts.id })}
                className={`w-5 h-5 flex items-center justify-center rounded text-[11px] border ${
                  brush.tipShape === ts.id
                    ? 'bg-[#4a90e2] border-blue-400 text-white'
                    : 'bg-[#1e1e1e] border-gray-700 text-gray-400 hover:text-white'
                }`}
                title={`Tip: ${ts.id}`}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamics Toggles */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-700 text-[10px] text-gray-300">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={brush.pressureSize}
              onChange={(e) => onUpdateBrush({ pressureSize: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span>Size by Pressure</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={brush.pressureOpacity}
              onChange={(e) => onUpdateBrush({ pressureOpacity: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span>Opacity by Pressure</span>
          </label>

          {/* Smart Correction & Tremor Smoothing */}
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={!!brush.smartCorrection}
              onChange={(e) => onUpdateBrush({ smartCorrection: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              Smart Correction (Tremor Filter)
              <span className="text-[8px] px-1 bg-[#1e293b] text-cyan-400 rounded">NEW</span>
            </span>
          </label>
        </div>

        {/* Line-end Inking Tapering */}
        <div className="flex flex-col gap-0.5 pt-1 border-t border-gray-700">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">Line Tapering (Inking)</span>
            <span className="text-[#4a90e2] font-mono text-[9px]">
              {Math.round((brush.taperFactor ?? 0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((brush.taperFactor ?? 0) * 100)}
            onChange={(e) => onUpdateBrush({ taperFactor: Number(e.target.value) / 100 })}
            className="w-full h-1.5 bg-[#1a1a1a] rounded-full accent-[#4a90e2] cursor-pointer"
          />
        </div>

        {/* Wacom Stylus Dynamics (Hardware Pressure, Tilt, Barrel Twist) */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-700 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-400 flex items-center gap-1">
              Wacom Stylus Dynamics
            </span>
            <span className="text-[8px] bg-blue-900/60 text-blue-200 px-1 rounded">PRO PEN</span>
          </div>

          {/* Pressure Curve Mapping */}
          <div className="flex items-center justify-between text-[9px] text-gray-300">
            <span>Pressure Curve:</span>
            <select
              value={brush.pressureCurve || 'linear'}
              onChange={(e) => onUpdateBrush({ pressureCurve: e.target.value as any })}
              className="bg-[#1e1e1e] text-blue-300 text-[9px] px-1.5 py-0.5 rounded border border-gray-700 outline-none"
            >
              <option value="linear">Linear (1:1 Direct)</option>
              <option value="soft">Soft (Light Touch)</option>
              <option value="firm">Firm (Inking Control)</option>
              <option value="s-curve">S-Curve (Sigmoid)</option>
            </select>
          </div>

          {/* Tilt Shading & Broadening */}
          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-300">
            <input
              type="checkbox"
              checked={brush.tiltShading !== false}
              onChange={(e) => onUpdateBrush({ tiltShading: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span className="flex items-center justify-between w-full">
              <span>Tilt Shading & Ellipse</span>
              <span className="text-gray-400 text-[8px]">Broad graphite</span>
            </span>
          </label>

          {/* Barrel Rotation (Twist) */}
          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-300">
            <input
              type="checkbox"
              checked={brush.rotationTwist !== false}
              onChange={(e) => onUpdateBrush({ rotationTwist: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span className="flex items-center justify-between w-full">
              <span>Barrel Rotation (Twist)</span>
              <span className="text-gray-400 text-[8px]">360° Art Pen</span>
            </span>
          </label>
        </div>

        {/* Realistic Color Mixing & Smear */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[10px] text-gray-200">
            <input
              type="checkbox"
              checked={brush.mixGroundColor}
              onChange={(e) => onUpdateBrush({ mixGroundColor: e.target.checked })}
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span className="font-semibold text-cyan-300 flex items-center gap-1">
              Realistic Physical Color Mixing
            </span>
          </label>

          {brush.mixGroundColor && (
            <div className="pl-4 flex flex-col gap-2 bg-[#202020] p-1.5 rounded border border-gray-700/50">
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-gray-400">Color Mix Amount</span>
                  <span className="text-cyan-400 font-mono">{Math.round(brush.colorMixRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(brush.colorMixRatio * 100)}
                  onChange={(e) => onUpdateBrush({ colorMixRatio: Number(e.target.value) / 100 })}
                  className="w-full h-1 bg-[#141414] rounded-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-gray-400">Pigment Pull / Smear</span>
                  <span className="text-cyan-400 font-mono">
                    {Math.round((brush.colorSmear ?? 0.5) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((brush.colorSmear ?? 0.5) * 100)}
                  onChange={(e) => onUpdateBrush({ colorSmear: Number(e.target.value) / 100 })}
                  className="w-full h-1 bg-[#141414] rounded-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Advanced Dual Brush Engine */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[10px] text-gray-200">
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
              className="accent-[#4a90e2] w-3 h-3 cursor-pointer"
            />
            <span className="font-semibold text-purple-300 flex items-center gap-1">
              Dual Brush Engine (2 Shapes in 1)
            </span>
          </label>

          {brush.dualBrush?.enabled && (
            <div className="pl-4 flex flex-col gap-2 bg-[#221f28] p-1.5 rounded border border-purple-800/40">
              <div className="flex items-center justify-between text-[9px]">
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
                      className={`w-4 h-4 flex items-center justify-center rounded text-[9px] border ${
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

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-gray-400">Texture Intensity</span>
                  <span className="text-purple-300 font-mono">
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
                  className="w-full h-1 bg-[#141414] rounded-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[9px]">
                <span className="text-gray-400">Combine Mode:</span>
                <select
                  value={brush.dualBrush.blendMode}
                  onChange={(e) =>
                    onUpdateBrush({
                      dualBrush: {
                        ...brush.dualBrush!,
                        blendMode: e.target.value as any,
                      },
                    })
                  }
                  className="bg-[#151515] text-purple-300 text-[9px] px-1 py-0.5 rounded border border-purple-700/50 outline-none"
                >
                  <option value="multiply">Multiply (Pencil Tooth)</option>
                  <option value="overlay">Overlay</option>
                  <option value="screen">Screen</option>
                  <option value="darken">Darken</option>
                  <option value="source-over">Composite</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    )}
  </div>
);
};
