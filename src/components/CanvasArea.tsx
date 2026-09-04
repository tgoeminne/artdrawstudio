import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Layer,
  ToolType,
  BrushSettings,
  CanvasTransform,
  Point,
  SelectionRect,
  TouchCalibrationSettings,
  VectorStroke,
  WacomStylusState,
} from '../types';
import {
  StrokeStabilizer,
  parseColor,
  drawSegment,
  drawBrushStamp,
  StrokeColorState,
  smartCorrectStroke,
  applyStrokeTapering,
  applyPressureCurve,
} from '../utils/brushEngine';
import { reRenderVectorLayer, vectorEraseAt } from '../utils/vectorEngine';
import { floodFill } from '../utils/floodFill';

interface CanvasAreaProps {
  layers: Layer[];
  activeLayerId: string;
  activeTool: ToolType;
  brush: BrushSettings;
  primaryColor: string;
  secondaryColor: string;
  isTransparentMode: boolean;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  transform: CanvasTransform;
  selection: SelectionRect;
  onTransformChange: (t: CanvasTransform | ((prev: CanvasTransform) => CanvasTransform)) => void;
  onSelectionChange: (s: SelectionRect) => void;
  onColorSampled: (hex: string) => void;
  onStrokeEnd: () => void;
  onCursorMove: (pos: { x: number; y: number } | null, pressure: number) => void;
  onStylusUpdate?: (state: WacomStylusState) => void;
  isSpacePressed: boolean;
  touchSettings?: TouchCalibrationSettings;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  layers,
  activeLayerId,
  activeTool,
  brush,
  primaryColor,
  isTransparentMode,
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  transform,
  selection,
  onTransformChange,
  onSelectionChange,
  onColorSampled,
  onStrokeEnd,
  onCursorMove,
  onStylusUpdate,
  isSpacePressed,
  touchSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPressure, setCurrentPressure] = useState(1.0);
  const [currentStylusState, setCurrentStylusState] = useState<WacomStylusState | null>(null);

  const stabilizerRef = useRef<StrokeStabilizer>(new StrokeStabilizer(brush.stabilization));
  const lastPointRef = useRef<Point | null>(null);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);

  // Wacom Stylus Telemetry Extractor (Pressure, Tilt, Rotation / Barrel Twist, Inverted Eraser)
  const extractStylusTelemetry = useCallback(
    (e: React.PointerEvent) => {
      const isPen = e.pointerType === 'pen';
      const tiltX = typeof e.tiltX === 'number' ? e.tiltX : 0;
      const tiltY = typeof e.tiltY === 'number' ? e.tiltY : 0;
      const twist = typeof e.twist === 'number' ? e.twist : 0;
      const tiltDist = Math.hypot(tiltX, tiltY);
      const altitude = Math.max(0, 90 - Math.min(90, tiltDist));
      const azimuth = ((Math.atan2(tiltY, tiltX) * 180) / Math.PI + 360) % 360;

      // Detect Wacom eraser tip:
      // In Wacom drivers & Pointer Events spec:
      // - button === 5 is pen eraser tip
      // - bit 5 (32) in buttons bitmask indicates eraser tip contact
      const isWacomEraser =
        e.button === 5 ||
        (e.buttons & 32) === 32 ||
        (e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32));

      const rawPressure = isPen ? (typeof e.pressure === 'number' ? e.pressure : 0.5) : (e.pointerType === 'mouse' ? 0.85 : (e.pressure || 0.85));
      const curve = touchSettings?.pressureCurve || brush.pressureCurve || 'linear';
      const mappedPressure = applyPressureCurve(
        rawPressure * (touchSettings?.pressureMultiplier ?? 1.0),
        curve
      );

      const state: WacomStylusState = {
        isPen,
        deviceName: isPen ? 'Wacom Digitizer Stylus' : e.pointerType === 'touch' ? 'Touchscreen' : 'Mouse Pointer',
        pressure: mappedPressure,
        rawPressure,
        tiltX,
        tiltY,
        tiltAngle: Math.round(tiltDist),
        twist,
        azimuth: Math.round(azimuth),
        altitude: Math.round(altitude),
        isEraserTip: Boolean(isWacomEraser),
        pointerType: e.pointerType,
      };

      return {
        state,
        mappedPressure,
        tiltX,
        tiltY,
        twist,
        altitude,
        azimuth,
        isWacomEraser: Boolean(isWacomEraser),
      };
    },
    [brush.pressureCurve, touchSettings]
  );

  // Multi-touch gestures tracking for mobile pinch-to-zoom & two-finger pan/rotate
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const pinchStartMidpointRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartTransformRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartAngleRef = useRef<number>(0);
  const preStrokeSnapshotRef = useRef<ImageData | null>(null);
  const strokePointCountRef = useRef<number>(0);

  // Vector strokes and physical paint color mixing state
  const currentStrokePointsRef = useRef<Point[]>([]);
  const strokeColorStateRef = useRef<StrokeColorState | null>(null);

  // Sync stabilizer setting
  useEffect(() => {
    stabilizerRef.current.setStabilization(brush.stabilization);
  }, [brush.stabilization]);

  // Convert client viewport coordinates to Canvas coordinates with touch calibration
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number, pointerType: string = 'mouse'): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2 + transform.x;
      const centerY = rect.top + rect.height / 2 + transform.y;

      // Apply touch calibration offset if input is touch
      let adjClientX = clientX;
      let adjClientY = clientY;
      if (pointerType === 'touch' && touchSettings) {
        adjClientX += touchSettings.offsetX;
        adjClientY += touchSettings.offsetY;
      }

      let dx = (adjClientX - centerX) / transform.zoom;
      let dy = (adjClientY - centerY) / transform.zoom;

      // Un-rotate if rotated
      if (transform.rotation !== 0) {
        const rad = (-transform.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        dx = rx;
        dy = ry;
      }

      // Un-flip if horizontally flipped
      if (transform.flipH) {
        dx = -dx;
      }

      const x = dx + canvasWidth / 2;
      const y = dy + canvasHeight / 2;
      return { x, y };
    },
    [transform, canvasWidth, canvasHeight, touchSettings]
  );

  // Sample composite color from all visible layers at (x, y)
  const sampleColorAt = (x: number, y: number): string | null => {
    const off = document.createElement('canvas');
    off.width = 1;
    off.height = 1;
    const ctx = off.getContext('2d');
    if (!ctx) return null;

    if (canvasBgColor !== 'transparent') {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, 1, 1);
    }

    layers.forEach((l) => {
      if (l.visible && l.canvas) {
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode;
        ctx.drawImage(l.canvas, -Math.floor(x), -Math.floor(y));
      }
    });

    const d = ctx.getImageData(0, 0, 1, 1).data;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(d[0])}${toHex(d[1])}${toHex(d[2])}`;
  };

  // Wheel to zoom or pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      onTransformChange((prev) => ({
        ...prev,
        zoom: Math.min(8.0, Math.max(0.1, prev.zoom * zoomFactor)),
      }));
    } else {
      // Pan with trackpad or mouse wheel
      onTransformChange((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent synthetic mouse events or browser gestures
    e.preventDefault();

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Detect two-finger multi-touch for mobile pinch & pan
    if (activePointersRef.current.size >= 2) {
      // If a stroke just started right before finger 2 touched (accidental multi-touch tap mark)
      if (isDrawing && preStrokeSnapshotRef.current && strokePointCountRef.current <= 2) {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.ctx) {
          activeLayer.ctx.putImageData(preStrokeSnapshotRef.current, 0, 0);
        }
      }

      setIsDrawing(false);
      setIsPanning(false);
      lastPointRef.current = null;
      dragStartPointRef.current = null;

      const pts: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = transform.zoom;
      pinchStartMidpointRef.current = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      pinchStartTransformRef.current = { x: transform.x, y: transform.y };
      pinchStartAngleRef.current = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
      return;
    }

    // Palm Rejection: If in 'stylus_only' mode and touch input occurs, pan instead of drawing
    if (touchSettings?.inputMode === 'stylus_only' && e.pointerType === 'touch') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Check if middle click or space is held or pan tool is active
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing

    const coords = clientToCanvasCoords(e.clientX, e.clientY, e.pointerType);
    if (!coords) return;

    // Zoom tool click
    if (activeTool === 'zoom') {
      const factor = e.altKey ? 0.75 : 1.33;
      onTransformChange((prev) => ({
        ...prev,
        zoom: Math.min(8.0, Math.max(0.1, prev.zoom * factor)),
      }));
      return;
    }

    // Eyedropper tool
    if (activeTool === 'eyedropper' || e.altKey) {
      const color = sampleColorAt(coords.x, coords.y);
      if (color) {
        onColorSampled(color);
      }
      return;
    }

    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      return;
    }

    // Paint bucket / Flood fill
    if (activeTool === 'bucket') {
      const colorRgb = parseColor(primaryColor);
      floodFill(activeLayer.ctx, coords.x, coords.y, colorRgb, brush.opacity);
      onStrokeEnd();
      return;
    }

    // Selection marquee start
    if (activeTool === 'select') {
      dragStartPointRef.current = coords;
      setIsDrawing(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Shape drawing start (line, rect, ellipse)
    if (activeTool === 'line') {
      dragStartPointRef.current = coords;
      setIsDrawing(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Freehand drawing (Brush, Pencil, Airbrush, Eraser)
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    // Extract Wacom stylus telemetry
    const {
      state: stylusState,
      mappedPressure,
      tiltX,
      tiltY,
      twist,
      altitude,
      azimuth,
      isWacomEraser,
    } = extractStylusTelemetry(e);
    setCurrentStylusState(stylusState);
    onStylusUpdate?.(stylusState);

    // Save snapshot of layer for clean undo if a 2nd finger lands immediately
    try {
      preStrokeSnapshotRef.current = activeLayer.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    } catch {
      preStrokeSnapshotRef.current = null;
    }
    strokePointCountRef.current = 1;

    const pressure = mappedPressure;
    setCurrentPressure(pressure);

    stabilizerRef.current.reset();
    const rawPoint: Point = {
      x: coords.x,
      y: coords.y,
      pressure,
      tiltX,
      tiltY,
      twist,
      altitudeAngle: (altitude * Math.PI) / 180,
      azimuthAngle: (azimuth * Math.PI) / 180,
      pointerType: e.pointerType,
      isEraser: isWacomEraser,
      time: Date.now(),
    };

    const smoothed = stabilizerRef.current.addPoint(rawPoint);
    lastPointRef.current = smoothed;
    currentStrokePointsRef.current = [smoothed];

    const isEraser = isWacomEraser || activeTool === 'eraser' || isTransparentMode;
    const colorRgb = parseColor(primaryColor);

    // Initialize physical paint smear and pigment state
    strokeColorStateRef.current = {
      r: colorRgb.r,
      g: colorRgb.g,
      b: colorRgb.b,
      carriedR: colorRgb.r,
      carriedG: colorRgb.g,
      carriedB: colorRgb.b,
      carriedStrength: 0,
    };

    if (isEraser && activeLayer.type === 'vector') {
      vectorEraseAt(activeLayer, coords.x, coords.y, brush.size / 2);
    }

    const baseRadius = brush.size / 2;
    const effectiveRadius = brush.pressureSize
      ? baseRadius * Math.max(0.15, smoothed.pressure)
      : baseRadius;

    drawBrushStamp(
      activeLayer.ctx,
      smoothed.x,
      smoothed.y,
      effectiveRadius,
      brush,
      colorRgb,
      smoothed.pressure,
      isEraser,
      strokeColorStateRef.current ?? undefined,
      smoothed.tiltX,
      smoothed.tiltY,
      smoothed.twist
    );
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    // Keep pointer coordinates updated
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Active two-finger pinch-to-zoom / two-finger pan & optional rotation
    if (
      activePointersRef.current.size >= 2 &&
      pinchStartDistRef.current &&
      pinchStartMidpointRef.current &&
      containerRef.current
    ) {
      const pts: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = pinchStartDistRef.current > 0 ? newDist / pinchStartDistRef.current : 1;
      const newMid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      const rect = containerRef.current.getBoundingClientRect();
      const containerCenterX = rect.left + rect.width / 2;
      const containerCenterY = rect.top + rect.height / 2;

      // Distance of initial midpoint from container center
      const v0x = pinchStartMidpointRef.current.x - containerCenterX;
      const v0y = pinchStartMidpointRef.current.y - containerCenterY;

      // Distance of current midpoint from container center
      const vx = newMid.x - containerCenterX;
      const vy = newMid.y - containerCenterY;

      const targetZoom = Math.min(8.0, Math.max(0.1, pinchStartZoomRef.current * scale));
      const zoomRatio = targetZoom / pinchStartZoomRef.current;

      // Exact zoom pinned around touch midpoint
      const newTransformX = vx - (v0x - pinchStartTransformRef.current.x) * zoomRatio;
      const newTransformY = vy - (v0y - pinchStartTransformRef.current.y) * zoomRatio;

      let newRotation = transform.rotation;
      if (touchSettings?.twoFingerRotate) {
        const currentAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
        const deltaAngle = currentAngle - pinchStartAngleRef.current;
        newRotation = Math.round((transform.rotation + deltaAngle) % 360);
        pinchStartAngleRef.current = currentAngle;
      }

      onTransformChange((prev) => ({
        ...prev,
        zoom: targetZoom,
        x: newTransformX,
        y: newTransformY,
        rotation: newRotation,
      }));
      return;
    }

    // Panning canvas
    if (isPanning) {
      onTransformChange((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
      return;
    }

    const coords = clientToCanvasCoords(e.clientX, e.clientY, e.pointerType);
    if (!coords) return;

    // Extract Wacom stylus telemetry
    const {
      state: stylusState,
      mappedPressure,
      tiltX,
      tiltY,
      twist,
      altitude,
      azimuth,
      isWacomEraser,
    } = extractStylusTelemetry(e);
    setCurrentStylusState(stylusState);
    onStylusUpdate?.(stylusState);

    const pressure = mappedPressure;
    setCursorPos(coords);
    setCurrentPressure(pressure);
    onCursorMove(coords, pressure);

    if (!isDrawing) return;
    strokePointCountRef.current += 1;

    // Selection marquee drag
    if (activeTool === 'select' && dragStartPointRef.current) {
      const start = dragStartPointRef.current;
      const x = Math.min(start.x, coords.x);
      const y = Math.min(start.y, coords.y);
      const width = Math.abs(coords.x - start.x);
      const height = Math.abs(coords.y - start.y);
      onSelectionChange({ x, y, width, height, active: true });
      return;
    }

    // Shape / Line preview drag on preview canvas
    if (activeTool === 'line' && dragStartPointRef.current && previewCanvasRef.current) {
      const pCtx = previewCanvasRef.current.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        const start = dragStartPointRef.current;
        pCtx.strokeStyle = primaryColor;
        pCtx.lineWidth = brush.size;
        pCtx.lineCap = 'round';
        pCtx.beginPath();
        pCtx.moveTo(start.x, start.y);
        pCtx.lineTo(coords.x, coords.y);
        pCtx.stroke();
      }
      return;
    }

    // Freehand stroke drawing
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;

    const rawPoint: Point = {
      x: coords.x,
      y: coords.y,
      pressure,
      tiltX,
      tiltY,
      twist,
      altitudeAngle: (altitude * Math.PI) / 180,
      azimuthAngle: (azimuth * Math.PI) / 180,
      pointerType: e.pointerType,
      isEraser: isWacomEraser,
      time: Date.now(),
    };

    const smoothed = stabilizerRef.current.addPoint(rawPoint);
    currentStrokePointsRef.current.push(smoothed);

    if (lastPointRef.current) {
      const isEraser = isWacomEraser || activeTool === 'eraser' || isTransparentMode;
      const colorRgb = parseColor(primaryColor);

      if (isEraser && activeLayer.type === 'vector') {
        vectorEraseAt(activeLayer, coords.x, coords.y, brush.size / 2);
      }

      drawSegment(
        activeLayer.ctx,
        lastPointRef.current,
        smoothed,
        brush,
        colorRgb,
        isEraser,
        strokeColorStateRef.current ?? undefined
      );
    }
    lastPointRef.current = smoothed;
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
      pinchStartMidpointRef.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    preStrokeSnapshotRef.current = null;
    strokePointCountRef.current = 0;

    const activeLayer = layers.find((l) => l.id === activeLayerId);

    // Finalize Vector Layer Stroke & Smart Correction
    if (activeLayer && activeLayer.type === 'vector' && currentStrokePointsRef.current.length > 0) {
      let finalPoints = [...currentStrokePointsRef.current];

      // Smart Stroke Smoothing & Hand-Tremor Filter
      if (brush.smartCorrection || brush.stabilization >= 12) {
        finalPoints = smartCorrectStroke(finalPoints, true);
      }

      // Line-end Inking Tapering
      if (brush.taperFactor && brush.taperFactor > 0) {
        finalPoints = applyStrokeTapering(finalPoints, brush.taperFactor);
      }

      const isEraser = activeTool === 'eraser' || isTransparentMode;
      const newStroke: VectorStroke = {
        id: `vstroke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        points: finalPoints,
        brush: { ...brush },
        color: primaryColor,
        isEraser,
        timestamp: Date.now(),
      };

      activeLayer.vectorStrokes = [...(activeLayer.vectorStrokes || []), newStroke];

      // If smart correction or tapering modified points, re-render the vector layer cleanly
      if (brush.smartCorrection || (brush.taperFactor && brush.taperFactor > 0)) {
        reRenderVectorLayer(activeLayer);
      }
    }

    currentStrokePointsRef.current = [];
    strokeColorStateRef.current = null;

    // Commit Line if active
    if (activeTool === 'line' && dragStartPointRef.current) {
      const coords = clientToCanvasCoords(e.clientX, e.clientY, e.pointerType);
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (coords && activeLayer && !activeLayer.locked) {
        activeLayer.ctx.save();
        activeLayer.ctx.strokeStyle = primaryColor;
        activeLayer.ctx.lineWidth = brush.size;
        activeLayer.ctx.lineCap = 'round';
        activeLayer.ctx.globalAlpha = brush.opacity;
        activeLayer.ctx.beginPath();
        activeLayer.ctx.moveTo(dragStartPointRef.current.x, dragStartPointRef.current.y);
        activeLayer.ctx.lineTo(coords.x, coords.y);
        activeLayer.ctx.stroke();
        activeLayer.ctx.restore();

        // Clear preview canvas
        if (previewCanvasRef.current) {
          const pCtx = previewCanvasRef.current.getContext('2d');
          pCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
        }
      }
    }

    dragStartPointRef.current = null;
    lastPointRef.current = null;
    stabilizerRef.current.reset();
    onStrokeEnd();
  };

  // Render brush size indicator ring on cursor overlay with Wacom tilt & rotation dynamics
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cursorPos && !isPanning) {
      ctx.save();
      const tiltDist = currentStylusState?.tiltAngle ?? 0;
      const twist = currentStylusState?.twist ?? 0;
      const azimuth = currentStylusState?.azimuth ?? 0;

      // Center at cursorPos
      ctx.translate(cursorPos.x, cursorPos.y);

      // Rotate with barrel twist or tilt azimuth
      const effectiveAngle = twist > 0 ? twist : (tiltDist > 10 ? azimuth : (brush.angle || 0));
      ctx.rotate((effectiveAngle * Math.PI) / 180);

      const r = Math.max(2, brush.size / 2);
      // If tilted, elongate cursor ellipse along azimuth
      const tiltFactor = tiltDist > 10 ? Math.min(1.0, (tiltDist - 10) / 60) : 0;
      const rx = r * (1 + tiltFactor * 1.2);
      const ry = r * Math.max(0.35, 1 - tiltFactor * 0.55);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, rx - 1), Math.max(1, ry - 1), 0, 0, Math.PI * 2);
      ctx.stroke();

      // If stylus has significant tilt, draw subtle direction orientation tick
      if (tiltDist > 12) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rx + 6, 0);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [cursorPos, brush.size, brush.angle, transform.zoom, isPanning, currentStylusState]);

  return (
    <main
      id="canvas-workspace"
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onPointerLeave={() => {
        setCursorPos(null);
        onCursorMove(null, 0);
      }}
      className="w-full h-full bg-[#1a1a1a] relative overflow-hidden select-none touch-none cursor-crosshair"
      style={{
        cursor:
          isPanning || isSpacePressed || activeTool === 'pan'
            ? 'grab'
            : activeTool === 'zoom'
            ? 'zoom-in'
            : activeTool === 'eyedropper'
            ? 'crosshair'
            : 'crosshair',
      }}
    >
      {/* Visual Canvas Paper Wrapper with Transformation (Pan, Zoom, Rotate, Flip) */}
      <div
        id="canvas-paper-viewport"
        className="absolute shadow-2xl shrink-0 flex-none select-none"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          left: '50%',
          top: '50%',
          marginLeft: `${-canvasWidth / 2}px`,
          marginTop: `${-canvasHeight / 2}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom}) rotate(${
            transform.rotation
          }deg) scaleX(${transform.flipH ? -1 : 1})`,
          transformOrigin: 'center center',
          touchAction: 'none',
          backgroundColor: canvasBgColor === 'transparent' ? 'transparent' : canvasBgColor,
          backgroundImage:
            canvasBgColor === 'transparent'
              ? 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)'
              : undefined,
          backgroundSize: '16px 16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Render Layer Canvases in Stack Order */}
        {layers.map((layer) => {
          return (
            <canvas
              key={layer.id}
              ref={(el) => {
                if (el && layer.canvas !== el) {
                  const prevCanvas = layer.canvas;
                  layer.canvas = el;
                  const ctx = el.getContext('2d', { willReadFrequently: true });
                  if (ctx) {
                    layer.ctx = ctx;
                    if (prevCanvas && prevCanvas.width > 0 && prevCanvas.height > 0) {
                      ctx.drawImage(prevCanvas, 0, 0);
                    }
                  }
                }
              }}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 pointer-events-none"
              style={{
                display: layer.visible ? 'block' : 'none',
                opacity: layer.opacity,
                mixBlendMode: (layer.blendMode === 'source-over'
                  ? 'normal'
                  : layer.blendMode) as any,
              }}
            />
          );
        })}

        {/* Temporary Preview Canvas for interactive shapes (lines, etc.) */}
        <canvas
          ref={previewCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Cursor / Brush Outline Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Selection Marquee Overlay (Dashed border) */}
        {selection.active && selection.width > 2 && selection.height > 2 && (
          <div
            className="absolute border border-dashed border-cyan-400 bg-cyan-400/10 pointer-events-none animate-pulse"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              width: `${selection.width}px`,
              height: `${selection.height}px`,
              boxShadow: '0 0 4px rgba(0,255,255,0.5)',
            }}
          />
        )}
      </div>

      {/* Floating Canvas Telemetry Badge in Bottom-Left (As requested in High Density Theme) */}
      <div
        id="canvas-telemetry-badge"
        className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-md px-2.5 py-1.5 text-[10px] flex items-center gap-3 text-gray-300 font-mono select-none pointer-events-none shadow-lg z-10"
      >
        <span>
          X: {cursorPos ? Math.round(cursorPos.x) : 0} Y: {cursorPos ? Math.round(cursorPos.y) : 0}
        </span>
        <span className="text-blue-400 font-semibold">{Math.round(transform.zoom * 100)}%</span>
        {currentStylusState?.isPen ? (
          <>
            <span className="text-green-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Wacom Stylus
            </span>
            <span className="text-cyan-300">P: {Math.round(currentPressure * 100)}%</span>
            <span className="text-indigo-300">Tilt: {currentStylusState.tiltAngle}°</span>
            {currentStylusState.twist > 0 && (
              <span className="text-purple-300">Twist: {currentStylusState.twist}°</span>
            )}
            {currentStylusState.isEraserTip && (
              <span className="text-amber-400 font-bold bg-amber-500/20 px-1 rounded">ERASER TIP</span>
            )}
          </>
        ) : (
          <span className="text-green-400 hidden sm:inline">
            Pressure: {Math.round(currentPressure * 100)}%
          </span>
        )}
      </div>
    </main>
  );
};
