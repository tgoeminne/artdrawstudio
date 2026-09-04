import React, { useState, useRef, useEffect } from 'react';
import {
  TouchCalibrationSettings,
  TouchInputMode,
} from '../../types';
import {
  Crosshair,
  Smartphone,
  PenTool,
  Check,
  RotateCcw,
  Sliders,
  Hand,
  X,
  Target,
  Compass,
  RotateCw,
  Activity,
  Trash2,
} from 'lucide-react';
import { applyPressureCurve } from '../../utils/brushEngine';

interface TouchCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TouchCalibrationSettings;
  onUpdateSettings?: (updates: Partial<TouchCalibrationSettings>) => void;
  onSaveSettings?: (updates: Partial<TouchCalibrationSettings>) => void;
}

export const TouchCalibrationModal: React.FC<TouchCalibrationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings: onUpdateSettingsProp,
  onSaveSettings,
}) => {
  const onUpdateSettings = onUpdateSettingsProp || onSaveSettings || (() => {});
  const [activeTab, setActiveTab] = useState<'settings' | 'wacom' | 'interactive'>('wacom');

  // Interactive 3-point calibration state
  const [calibStep, setCalibStep] = useState<number>(0); // 0, 1, 2, 3 (done)
  const [sampleDeltas, setSampleDeltas] = useState<{ dx: number; dy: number }[]>([]);
  const [lastDetectedType, setLastDetectedType] = useState<string>('touch');
  const [lastTestPressure, setLastTestPressure] = useState<number>(1);

  // Live Wacom diagnostic state
  const [liveWacomState, setLiveWacomState] = useState<{
    pressure: number;
    rawPressure: number;
    tiltX: number;
    tiltY: number;
    tiltAngle: number;
    twist: number;
    isEraser: boolean;
    pointerType: string;
  }>({
    pressure: 0,
    rawPressure: 0,
    tiltX: 0,
    tiltY: 0,
    tiltAngle: 0,
    twist: 0,
    isEraser: false,
    pointerType: 'none',
  });

  const scratchpadCanvasRef = useRef<HTMLCanvasElement>(null);
  const isScratchDrawingRef = useRef(false);
  const scratchLastPointRef = useRef<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  // Clear scratchpad canvas
  const handleClearScratchpad = () => {
    const canvas = scratchpadCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Scratchpad drawing handlers with real Wacom hardware telemetry
  const handleScratchPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isScratchDrawingRef.current = true;

    const canvas = scratchpadCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scratchLastPointRef.current = { x, y };

    const isPen = e.pointerType === 'pen';
    const tiltX = typeof e.tiltX === 'number' ? e.tiltX : 0;
    const tiltY = typeof e.tiltY === 'number' ? e.tiltY : 0;
    const twist = typeof e.twist === 'number' ? e.twist : 0;
    const tiltDist = Math.hypot(tiltX, tiltY);
    const isEraser = e.button === 5 || (e.buttons & 32) === 32;

    const rawP = isPen ? (typeof e.pressure === 'number' ? e.pressure : 0.5) : (e.pointerType === 'mouse' ? 0.85 : (e.pressure || 0.85));
    const mappedP = applyPressureCurve(rawP * settings.pressureMultiplier, settings.pressureCurve || 'linear');

    setLiveWacomState({
      pressure: mappedP,
      rawPressure: rawP,
      tiltX,
      tiltY,
      tiltAngle: Math.round(tiltDist),
      twist,
      isEraser,
      pointerType: e.pointerType,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = isEraser ? '#ffffff' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, mappedP * 12), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleScratchPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isPen = e.pointerType === 'pen';
    const tiltX = typeof e.tiltX === 'number' ? e.tiltX : 0;
    const tiltY = typeof e.tiltY === 'number' ? e.tiltY : 0;
    const twist = typeof e.twist === 'number' ? e.twist : 0;
    const tiltDist = Math.hypot(tiltX, tiltY);
    const isEraser = e.button === 5 || (e.buttons & 32) === 32;

    const rawP = isPen ? (typeof e.pressure === 'number' ? e.pressure : 0.5) : (e.pointerType === 'mouse' ? 0.85 : (e.pressure || 0.85));
    const mappedP = applyPressureCurve(rawP * settings.pressureMultiplier, settings.pressureCurve || 'linear');

    setLiveWacomState({
      pressure: mappedP,
      rawPressure: rawP,
      tiltX,
      tiltY,
      tiltAngle: Math.round(tiltDist),
      twist,
      isEraser,
      pointerType: e.pointerType,
    });

    if (!isScratchDrawingRef.current) return;
    const canvas = scratchpadCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx || !scratchLastPointRef.current) return;

    ctx.save();
    ctx.strokeStyle = isEraser ? '#181818' : '#38bdf8';
    // Line width dynamically responds to hardware pressure and tilt shading
    const tiltExpansion = tiltDist > 15 ? 1 + (tiltDist / 45) : 1;
    ctx.lineWidth = Math.max(1.5, mappedP * 16 * tiltExpansion);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(scratchLastPointRef.current.x, scratchLastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    scratchLastPointRef.current = { x, y };
  };

  const handleScratchPointerUp = () => {
    isScratchDrawingRef.current = false;
    scratchLastPointRef.current = null;
  };

  if (!isOpen) return null;

  // Targets for 3-point calibration (in percentages of target area)
  const targets = [
    { label: 'Target 1 of 3: Upper Left', x: 25, y: 25 },
    { label: 'Target 2 of 3: Center', x: 50, y: 50 },
    { label: 'Target 3 of 3: Lower Right', x: 75, y: 75 },
  ];

  const handleTargetTouch = (
    e: React.PointerEvent<HTMLDivElement>,
    targetCenterX: number,
    targetCenterY: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setLastDetectedType(e.pointerType || 'touch');
    setLastTestPressure(e.pressure || 0.85);

    const deltaX = e.clientX - targetCenterX;
    const deltaY = e.clientY - targetCenterY;

    const nextDeltas = [...sampleDeltas, { dx: deltaX, dy: deltaY }];
    setSampleDeltas(nextDeltas);

    if (calibStep < 2) {
      setCalibStep(calibStep + 1);
    } else {
      // Finished all 3 points, calculate average calibration offset to counter user error
      const avgDx = Math.round(nextDeltas.reduce((acc, v) => acc + v.dx, 0) / nextDeltas.length);
      const avgDy = Math.round(nextDeltas.reduce((acc, v) => acc + v.dy, 0) / nextDeltas.length);

      // Invert delta: if finger touched +8px lower than target, offset should be -8px
      const calibratedOffsetX = Math.max(-25, Math.min(25, -avgDx));
      const calibratedOffsetY = Math.max(-25, Math.min(25, -avgDy));

      onUpdateSettings({
        offsetX: calibratedOffsetX,
        offsetY: calibratedOffsetY,
      });
      setCalibStep(3); // Completed
    }
  };

  const handleResetCalibration = () => {
    setCalibStep(0);
    setSampleDeltas([]);
    onUpdateSettings({
      offsetX: 0,
      offsetY: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div
        id="touch-calibration-modal"
        className="w-full max-w-md bg-[#232323] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#d1d1d1]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#2a2a2a] border-b border-black">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Crosshair size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">Touchscreen Calibration</h2>
              <span className="text-[10px] text-gray-400">
                Align touch & stylus inputs for precision drawing
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-black bg-[#1e1e1e]">
          <button
            onClick={() => setActiveTab('wacom')}
            className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'wacom'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-[#262626]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <PenTool size={13} />
            <span>Wacom Stylus</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-[#262626]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders size={13} />
            <span>Input Modes & Offsets</span>
          </button>
          <button
            onClick={() => setActiveTab('interactive')}
            className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'interactive'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-[#262626]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Target size={13} />
            <span>3-Point Calibrate</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-xs">
          {activeTab === 'wacom' ? (
            /* Wacom Stylus & Hardware Diagnostic Tab */
            <div className="flex flex-col gap-3.5">
              {/* Hardware Recognition Banner */}
              <div className="p-3 rounded-xl bg-linear-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <PenTool size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">
                        Wacom Digitizer & Pen API
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <span className="text-[10px] text-gray-300">
                      Native PointerEvent (Pressure, Tilt, Twist, Eraser) Active
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <span className="text-gray-400 block">Status:</span>
                  <span className="text-green-400 font-bold uppercase">
                    {liveWacomState.pointerType === 'pen' ? 'Stylus Detected' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Live Telemetry Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                {/* Pressure */}
                <div className="bg-[#1c1c1c] p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider">Pressure</span>
                  <span className="text-blue-400 font-bold text-sm">
                    {Math.round(liveWacomState.pressure * 100)}%
                  </span>
                  <span className="text-[9px] text-gray-500">
                    Level: {Math.round(liveWacomState.rawPressure * 8192)} / 8192
                  </span>
                </div>

                {/* Tilt */}
                <div className="bg-[#1c1c1c] p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <Compass size={10} /> Tilt
                  </span>
                  <span className="text-indigo-300 font-bold text-sm">
                    {liveWacomState.tiltAngle}°
                  </span>
                  <span className="text-[9px] text-gray-500">
                    X:{liveWacomState.tiltX}° Y:{liveWacomState.tiltY}°
                  </span>
                </div>

                {/* Twist / Barrel Rotation */}
                <div className="bg-[#1c1c1c] p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <RotateCw size={10} /> Barrel Twist
                  </span>
                  <span className="text-purple-300 font-bold text-sm">
                    {liveWacomState.twist > 0 ? `${liveWacomState.twist}°` : '0°'}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {liveWacomState.twist > 0 ? 'Art Pen Active' : 'Pro Pen'}
                  </span>
                </div>

                {/* Tip Status */}
                <div className="bg-[#1c1c1c] p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider">Pen Tip</span>
                  <span
                    className={`font-bold text-sm ${
                      liveWacomState.isEraser ? 'text-amber-400' : 'text-cyan-300'
                    }`}
                  >
                    {liveWacomState.isEraser ? 'ERASER TIP' : 'DRAWING NIB'}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {liveWacomState.isEraser ? 'Button 5 / Erase' : 'Primary Tip'}
                  </span>
                </div>
              </div>

              {/* Interactive Wacom Test Scratchpad */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-200 text-xs">
                    Live Stylus Scratchpad (Test Tilt, Twist & Pressure)
                  </span>
                  <button
                    onClick={handleClearScratchpad}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#333] transition-colors"
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="relative w-full h-36 bg-[#141414] rounded-xl border border-white/10 overflow-hidden touch-none cursor-crosshair">
                  <canvas
                    ref={scratchpadCanvasRef}
                    width={400}
                    height={144}
                    onPointerDown={handleScratchPointerDown}
                    onPointerMove={handleScratchPointerMove}
                    onPointerUp={handleScratchPointerUp}
                    className="w-full h-full"
                  />
                  {!liveWacomState.pointerType || liveWacomState.pointerType === 'none' ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 text-xs font-mono">
                      Draw here with your Wacom pen or finger...
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Hardware Calibration & Curve Controls */}
              <div className="bg-[#1c1c1c] p-3 rounded-xl border border-white/5 flex flex-col gap-3">
                <span className="font-bold text-gray-200 text-xs">Hardware Calibration & Dynamics</span>

                {/* Pressure Curve Selector */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-gray-300 font-medium text-xs">Hardware Pressure Curve</span>
                    <span className="text-[9px] text-gray-400">
                      Response profile across 2048 - 8192 levels
                    </span>
                  </div>
                  <select
                    value={settings.pressureCurve || 'linear'}
                    onChange={(e) => onUpdateSettings({ pressureCurve: e.target.value as any })}
                    className="bg-[#2a2a2a] text-blue-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700 outline-none"
                  >
                    <option value="linear">Linear (Direct 1:1)</option>
                    <option value="soft">Soft (Light Touch & Watercolor)</option>
                    <option value="firm">Firm (Heavy Inking & Manga)</option>
                    <option value="s-curve">S-Curve (Sigmoid Natural)</option>
                  </select>
                </div>

                {/* Pressure Multiplier Slider */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">Stylus Pressure Sensitivity:</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {settings.pressureMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={settings.pressureMultiplier}
                    onChange={(e) =>
                      onUpdateSettings({ pressureMultiplier: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-[#333] rounded-lg accent-[#4a90e2] cursor-pointer"
                  />
                </div>

                {/* Tilt Shading Toggle */}
                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-gray-300 font-medium text-xs">
                      Tilt-Angle Broadening & Shading
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Flattens brush tip into broad graphite when pen is tilted
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.tiltShading !== false}
                    onChange={(e) => onUpdateSettings({ tiltShading: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                  />
                </label>

                {/* Barrel Rotation Toggle */}
                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-gray-300 font-medium text-xs">
                      Barrel Twist / 360° Rotation
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Enables flat calligraphy nib and airbrush rotation on Wacom Art Pens
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.barrelRotation !== false}
                    onChange={(e) => onUpdateSettings({ barrelRotation: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <>
              {/* 1. Input Mode */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">
                  Touchscreen Input Mode
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {/* All */}
                  <button
                    onClick={() => onUpdateSettings({ inputMode: 'all' })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      settings.inputMode === 'all'
                        ? 'border-blue-500 bg-blue-500/10 text-white font-semibold shadow-sm'
                        : 'border-white/5 bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    <Hand size={18} className={settings.inputMode === 'all' ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="text-[11px]">Touch & Stylus</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Draw with finger or pen</span>
                  </button>

                  {/* Stylus Only */}
                  <button
                    onClick={() => onUpdateSettings({ inputMode: 'stylus_only' })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      settings.inputMode === 'stylus_only'
                        ? 'border-blue-500 bg-blue-500/10 text-white font-semibold shadow-sm'
                        : 'border-white/5 bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    <PenTool size={18} className={settings.inputMode === 'stylus_only' ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="text-[11px]">Stylus Only</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Palm rejection on finger</span>
                  </button>

                  {/* Finger Calibrated */}
                  <button
                    onClick={() =>
                      onUpdateSettings({
                        inputMode: 'finger_calibrated',
                        offsetY: -6,
                      })
                    }
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      settings.inputMode === 'finger_calibrated'
                        ? 'border-blue-500 bg-blue-500/10 text-white font-semibold shadow-sm'
                        : 'border-white/5 bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    <Smartphone size={18} className={settings.inputMode === 'finger_calibrated' ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="text-[11px]">Fingertip Mode</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Offset for finger drawing</span>
                  </button>
                </div>
              </div>

              {/* 2. Manual Offset Calibration Sliders */}
              <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-300 text-[11px]">
                    Coordinate Alignment Offsets
                  </span>
                  {(settings.offsetX !== 0 || settings.offsetY !== 0) && (
                    <button
                      onClick={() => onUpdateSettings({ offsetX: 0, offsetY: 0 })}
                      className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Reset (0, 0)
                    </button>
                  )}
                </div>

                {/* Y Offset */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Vertical Offset (Y):</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {settings.offsetY > 0 ? `+${settings.offsetY}` : settings.offsetY} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    value={settings.offsetY}
                    onChange={(e) => onUpdateSettings({ offsetY: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#333] rounded-lg accent-[#4a90e2] cursor-pointer"
                  />
                  <span className="text-[9px] text-gray-500">
                    Negative values raise the stroke above the contact point (useful for fingertip drawing).
                  </span>
                </div>

                {/* X Offset */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Horizontal Offset (X):</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {settings.offsetX > 0 ? `+${settings.offsetX}` : settings.offsetX} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    value={settings.offsetX}
                    onChange={(e) => onUpdateSettings({ offsetX: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#333] rounded-lg accent-[#4a90e2] cursor-pointer"
                  />
                </div>
              </div>

              {/* 3. Multi-touch & Pressure Settings */}
              <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 flex flex-col gap-3">
                <span className="font-bold text-gray-300 text-[11px]">Gesture & Pressure Tuning</span>

                {/* Pressure multiplier */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Stylus Pressure Sensitivity:</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {settings.pressureMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={settings.pressureMultiplier}
                    onChange={(e) =>
                      onUpdateSettings({ pressureMultiplier: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-[#333] rounded-lg accent-[#4a90e2] cursor-pointer"
                  />
                </div>

                {/* Two finger rotate */}
                <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-gray-300 font-medium">Two-Finger Canvas Rotation</span>
                    <span className="text-[9px] text-gray-500">
                      Rotate canvas angle freely while pinching to zoom
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.twoFingerRotate}
                    onChange={(e) => onUpdateSettings({ twoFingerRotate: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                  />
                </label>
              </div>
            </>
          ) : (
            /* Interactive 3-Point Calibration Pad */
            <div className="flex flex-col gap-3">
              <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">
                    {calibStep < 3 ? targets[calibStep].label : 'Calibration Complete!'}
                  </span>
                  <span className="text-[10px] font-mono text-blue-400">
                    Step {Math.min(3, calibStep + 1)} / 3
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {calibStep < 3
                    ? 'Tap the glowing blue crosshair with your finger or stylus exactly as you naturally hold it.'
                    : `Offsets calibrated: X: ${settings.offsetX}px, Y: ${settings.offsetY}px. Test drawing below!`}
                </p>
              </div>

              {/* Interactive Target Stage */}
              <div
                id="interactive-calibration-stage"
                className="relative h-60 w-full bg-[#181818] border border-[#333] rounded-xl overflow-hidden touch-none cursor-crosshair select-none flex items-center justify-center"
              >
                {/* Background grid */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {calibStep < 3 ? (
                  /* Active Target Marker */
                  <div
                    className="absolute"
                    style={{
                      left: `${targets[calibStep].x}%`,
                      top: `${targets[calibStep].y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleTargetTouch(e, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }}
                  >
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-50" />
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                        <Crosshair size={22} className="text-white" />
                      </div>
                      <div className="absolute -bottom-5 whitespace-nowrap text-[9px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                        TAP HERE
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Success & Test Area */
                  <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center mb-1">
                      <Check size={24} />
                    </div>
                    <span className="font-bold text-white text-sm">Touch Sensor Calibrated</span>
                    <span className="text-[10px] text-gray-400 max-w-[220px]">
                      Your personal digitizer offsets have been saved. You can now draw with precise alignment.
                    </span>
                    <button
                      onClick={handleResetCalibration}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#2e2e2e] hover:bg-[#3e3e3e] text-gray-200 text-xs flex items-center gap-1.5 border border-white/10"
                    >
                      <RotateCcw size={12} />
                      <span>Recalibrate</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Telemetry info */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 bg-[#1e1e1e] p-2 rounded-lg font-mono">
                <span>Input: <strong className="text-white">{lastDetectedType}</strong></span>
                <span>Active Offset: <strong className="text-blue-400">{settings.offsetX}px, {settings.offsetY}px</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#2a2a2a] border-t border-black">
          <button
            onClick={handleResetCalibration}
            className="px-3 py-1.5 rounded-lg bg-[#333] hover:bg-[#444] text-gray-300 text-xs flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset All</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
