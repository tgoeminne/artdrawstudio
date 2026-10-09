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
  VectorText,
  VectorPath,
  VectorNode,
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
import {
  reRenderVectorLayer,
  renderVectorPath,
  measureVectorTextBounds,
  vectorEraseAt,
} from '../utils/vectorEngine';
import { floodFill } from '../utils/floodFill';
import { VectorCadMode } from './VectorCadBar';

interface CanvasAreaProps {
  layers: Layer[];
  activeLayerId: string;
  activeTool: ToolType;
  brush: BrushSettings;
  primaryColor: string;
  secondaryColor?: string;
  isTransparentMode: boolean;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  transform: CanvasTransform;
  selection: SelectionRect;
  onTransformChange: (t: CanvasTransform | ((prev: CanvasTransform) => CanvasTransform)) => void;
  onSelectionChange: (s: SelectionRect) => void;
  onColorSampled: (hex: string) => void;
  onTextPlace: (position: { x: number; y: number }) => void;
  onStrokeEnd: () => void;
  onCursorMove: (pos: { x: number; y: number } | null, pressure: number) => void;
  onStylusUpdate?: (state: WacomStylusState) => void;
  isSpacePressed: boolean;
  touchSettings?: TouchCalibrationSettings;

  // Vector CAD Props
  vectorCadMode?: VectorCadMode;
  vectorStrokeColor?: string;
  vectorStrokeWidth?: number;
  vectorStrokeDash?: 'solid' | 'dashed' | 'dotted';
  vectorFillColor?: string;
  vectorIsClosed?: boolean;
  isGridSnap?: boolean;
  isOrtho?: boolean;
  inProgressNodes?: VectorNode[];
  onInProgressNodesChange?: (nodes: VectorNode[]) => void;
  onCommitVectorPath?: (path: VectorPath) => void;
  onUpdateVectorPath?: (pathId: string, updates: Partial<VectorPath>) => void;
  onDeleteVectorPath?: (pathId: string) => void;
  selectedVectorPathId?: string | null;
  onSelectVectorPath?: (pathId: string | null) => void;
  selectedNodeIndex?: number | null;
  onSelectNodeIndex?: (index: number | null) => void;

  // Typography Props
  selectedTextId?: string | null;
  onSelectVectorText?: (textId: string | null) => void;
  onEditVectorText?: (text: VectorText) => void;
  onDeleteVectorText?: (textId: string) => void;
  onUpdateVectorText?: (textId: string, updates: Partial<VectorText>) => void;
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
  onTextPlace,
  onStrokeEnd,
  onCursorMove,
  onStylusUpdate,
  isSpacePressed,
  touchSettings,
  vectorCadMode = 'draw',
  vectorStrokeColor = '#ffffff',
  vectorStrokeWidth = 2,
  vectorStrokeDash = 'solid',
  vectorFillColor = 'none',
  vectorIsClosed = true,
  isGridSnap = false,
  isOrtho = false,
  inProgressNodes = [],
  onInProgressNodesChange,
  onCommitVectorPath,
  onUpdateVectorPath,
  onDeleteVectorPath,
  selectedVectorPathId = null,
  onSelectVectorPath,
  selectedNodeIndex = null,
  onSelectNodeIndex,
  selectedTextId = null,
  onSelectVectorText,
  onEditVectorText,
  onDeleteVectorText,
  onUpdateVectorText,
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

  // Vector CAD interactive drag references
  const isDraggingTangentRef = useRef<boolean>(false);
  const activePlacedNodeIndexRef = useRef<number>(-1);
  const draggedCadTargetRef = useRef<{
    type: 'node' | 'handleIn' | 'handleOut';
    index: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Text interactive drag & click references
  const isDraggingTextRef = useRef<boolean>(false);
  const textDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTextClickTimeRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  // Wacom Stylus Telemetry Extractor
  const extractStylusTelemetry = useCallback(
    (e: React.PointerEvent) => {
      const isPen = e.pointerType === 'pen';
      const tiltX = typeof e.tiltX === 'number' ? e.tiltX : 0;
      const tiltY = typeof e.tiltY === 'number' ? e.tiltY : 0;
      const twist = typeof e.twist === 'number' ? e.twist : 0;
      const tiltDist = Math.hypot(tiltX, tiltY);
      const altitude = Math.max(0, 90 - Math.min(90, tiltDist));
      const azimuth = ((Math.atan2(tiltY, tiltX) * 180) / Math.PI + 360) % 360;

      const isWacomEraser =
        e.button === 5 ||
        (e.buttons & 32) === 32 ||
        (e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32));

      const rawPressure = isPen
        ? typeof e.pressure === 'number'
          ? e.pressure
          : 0.5
        : e.pointerType === 'mouse'
        ? 0.85
        : e.pressure || 0.85;
      const curve = touchSettings?.pressureCurve || brush.pressureCurve || 'linear';
      const mappedPressure = applyPressureCurve(
        rawPressure * (touchSettings?.pressureMultiplier ?? 1.0),
        curve
      );

      const state: WacomStylusState = {
        isPen,
        deviceName: isPen
          ? 'Wacom Digitizer Stylus'
          : e.pointerType === 'touch'
          ? 'Touchscreen'
          : 'Mouse Pointer',
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

  useEffect(() => {
    stabilizerRef.current.setStabilization(brush.stabilization);
  }, [brush.stabilization]);

  // Convert Client Window Coords -> Local Canvas Layer Space (0 to canvasWidth, 0 to canvasHeight)
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number, pointerType: string = 'mouse') => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const containerCenterX = rect.left + rect.width / 2;
      const containerCenterY = rect.top + rect.height / 2;

      let screenX = clientX;
      let screenY = clientY;

      if (pointerType === 'touch' && touchSettings?.inputMode === 'finger_calibrated') {
        screenX += touchSettings.offsetX || 0;
        screenY += touchSettings.offsetY || 0;
      }

      let relX = screenX - (containerCenterX + transform.x);
      let relY = screenY - (containerCenterY + transform.y);

      if (transform.flipH) {
        relX = -relX;
      }

      const rad = (-transform.rotation * Math.PI) / 180;
      const unrotX = relX * Math.cos(rad) - relY * Math.sin(rad);
      const unrotY = relX * Math.sin(rad) + relY * Math.cos(rad);

      const canvasX = unrotX / transform.zoom + canvasWidth / 2;
      const canvasY = unrotY / transform.zoom + canvasHeight / 2;

      return { x: canvasX, y: canvasY };
    },
    [
      transform.x,
      transform.y,
      transform.zoom,
      transform.rotation,
      transform.flipH,
      canvasWidth,
      canvasHeight,
      touchSettings,
    ]
  );

  // Sample RGBA color directly from composited canvas stack
  const sampleColorAt = useCallback(
    (x: number, y: number) => {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 1;
      sampleCanvas.height = 1;
      const sCtx = sampleCanvas.getContext('2d');
      if (!sCtx) return null;

      if (canvasBgColor !== 'transparent') {
        sCtx.fillStyle = canvasBgColor;
        sCtx.fillRect(0, 0, 1, 1);
      }

      for (const layer of layers) {
        if (!layer.visible || !layer.canvas) continue;
        sCtx.save();
        sCtx.globalAlpha = layer.opacity;
        sCtx.globalCompositeOperation = layer.blendMode;
        sCtx.drawImage(layer.canvas, x, y, 1, 1, 0, 0, 1, 1);
        sCtx.restore();
      }

      const pixel = sCtx.getImageData(0, 0, 1, 1).data;
      if (pixel[3] === 0) return null;
      const hex =
        '#' +
        ('000000' + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
      return hex;
    },
    [layers, canvasBgColor]
  );

  // Ortho / Angle Snapping Helper for CAD: snaps angle between p1 and p2 to multiples of 45 deg
  const applyOrthoSnap = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return p2;

    const angle = Math.atan2(dy, dx);
    const snapStep = Math.PI / 4; // 45 degrees
    const snappedAngle = Math.round(angle / snapStep) * snapStep;
    return {
      x: p1.x + Math.cos(snappedAngle) * dist,
      y: p1.y + Math.sin(snappedAngle) * dist,
    };
  };

  // Grid Snapping Helper
  const applyGridSnap = (p: { x: number; y: number }, gridSize = 20) => {
    return {
      x: Math.round(p.x / gridSize) * gridSize,
      y: Math.round(p.y / gridSize) * gridSize,
    };
  };

  // Hit-test active layer's vector paths & nodes for CAD Edit mode
  const findHitCadNodeOrPath = (coords: { x: number; y: number }) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.vectorPaths) return null;

    const hitRadius = 8 / transform.zoom;

    // First check selected path's handles and nodes
    if (selectedVectorPathId) {
      const selectedPath = activeLayer.vectorPaths.find((p) => p.id === selectedVectorPathId);
      if (selectedPath) {
        // Check handles of selected node first
        if (selectedNodeIndex !== null && selectedPath.nodes[selectedNodeIndex]) {
          const node = selectedPath.nodes[selectedNodeIndex];
          if (node.handleOut && Math.hypot(coords.x - node.handleOut.x, coords.y - node.handleOut.y) <= hitRadius) {
            return { path: selectedPath, nodeIndex: selectedNodeIndex, handle: 'handleOut' as const };
          }
          if (node.handleIn && Math.hypot(coords.x - node.handleIn.x, coords.y - node.handleIn.y) <= hitRadius) {
            return { path: selectedPath, nodeIndex: selectedNodeIndex, handle: 'handleIn' as const };
          }
        }

        // Check anchor nodes
        for (let i = 0; i < selectedPath.nodes.length; i++) {
          const node = selectedPath.nodes[i];
          if (Math.hypot(coords.x - node.x, coords.y - node.y) <= hitRadius) {
            return { path: selectedPath, nodeIndex: i, handle: 'node' as const };
          }
        }
      }
    }

    // Check all paths on layer for path selection
    for (const path of activeLayer.vectorPaths) {
      for (let i = 0; i < path.nodes.length; i++) {
        const node = path.nodes[i];
        if (Math.hypot(coords.x - node.x, coords.y - node.y) <= hitRadius + (path.strokeWidth || 2)) {
          return { path, nodeIndex: i, handle: 'node' as const };
        }
      }
    }

    return null;
  };

  // Find vector text hit at coords
  const findHitVectorText = (coords: { x: number; y: number }) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.vectorTexts) return null;

    const pCtx = previewCanvasRef.current?.getContext('2d');
    if (!pCtx) return null;

    for (let i = activeLayer.vectorTexts.length - 1; i >= 0; i--) {
      const t = activeLayer.vectorTexts[i];
      const bounds = measureVectorTextBounds(pCtx, t);
      if (
        coords.x >= bounds.x &&
        coords.x <= bounds.x + bounds.width &&
        coords.y >= bounds.y &&
        coords.y <= bounds.y + bounds.height
      ) {
        return t;
      }
    }
    return null;
  };

  // ----------------------------------------------------
  // Pointer Event Handlers
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch gestures tracking (Pinch-to-zoom / Pan)
    if (activePointersRef.current.size === 2) {
      setIsDrawing(false);
      dragStartPointRef.current = null;

      const pts: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = transform.zoom;
      pinchStartMidpointRef.current = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      pinchStartTransformRef.current = { x: transform.x, y: transform.y };
      pinchStartAngleRef.current =
        Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
      return;
    }

    // Palm Rejection in 'stylus_only' mode
    if (touchSettings?.inputMode === 'stylus_only' && e.pointerType === 'touch') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Space held or Middle Mouse or Pan tool
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    if (e.button !== 0) return; // Only primary button

    let coords = clientToCanvasCoords(e.clientX, e.clientY, e.pointerType);
    if (!coords) return;

    // Zoom tool
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

    // ==========================================
    // 1. TEXT TOOL INTERACTION
    // ==========================================
    if (activeTool === 'text') {
      const hitText = findHitVectorText(coords);
      if (hitText) {
        onSelectVectorText?.(hitText.id);

        const now = Date.now();
        if (
          lastTextClickTimeRef.current.id === hitText.id &&
          now - lastTextClickTimeRef.current.time < 350
        ) {
          // Double-click -> Edit Text Modal
          onEditVectorText?.(hitText);
          return;
        }
        lastTextClickTimeRef.current = { id: hitText.id, time: now };

        // Begin dragging text
        isDraggingTextRef.current = true;
        textDragOffsetRef.current = {
          x: coords.x - hitText.x,
          y: coords.y - hitText.y,
        };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }

      // Clicked on empty canvas -> Create new text at coords
      onSelectVectorText?.(null);
      onTextPlace(coords);
      return;
    }

    // ==========================================
    // 2. 2D CAD VECTOR TOOL INTERACTION
    // ==========================================
    if (activeTool === 'vector') {
      if (isGridSnap) {
        coords = applyGridSnap(coords, 20);
      }

      if (vectorCadMode === 'edit') {
        const hit = findHitCadNodeOrPath(coords);
        if (hit) {
          onSelectVectorPath?.(hit.path.id);
          onSelectNodeIndex?.(hit.nodeIndex);

          draggedCadTargetRef.current = {
            type: hit.handle === 'node' ? 'node' : hit.handle === 'handleOut' ? 'handleOut' : 'handleIn',
            index: hit.nodeIndex,
            origX: coords.x,
            origY: coords.y,
          };
          setIsDrawing(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          return;
        }

        // Clicked outside any path in edit mode
        onSelectVectorPath?.(null);
        onSelectNodeIndex?.(null);
        return;
      }

      // --- Draw Mode (Point-by-point polygon & Bezier) ---
      // Check if clicking near start node to close polygon
      if (inProgressNodes.length >= 2) {
        const startNode = inProgressNodes[0];
        const distToStart = Math.hypot(coords.x - startNode.x, coords.y - startNode.y);
        if (distToStart <= 14 / transform.zoom) {
          // Close and commit path!
          const newPath: VectorPath = {
            id: `vpath_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            nodes: inProgressNodes,
            closed: true,
            strokeColor: vectorStrokeColor,
            strokeWidth: vectorStrokeWidth,
            strokeDash: vectorStrokeDash as 'solid' | 'dashed' | 'dotted',
            strokeCap: 'round',
            strokeJoin: 'round',
            fillColor: vectorFillColor,
            opacity: 1,
            timestamp: Date.now(),
          };
          onCommitVectorPath?.(newPath);
          onInProgressNodesChange?.([]);
          // Clear preview
          const pCtx = previewCanvasRef.current?.getContext('2d');
          if (pCtx) pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          return;
        }
      }

      // Check ortho snapping if shift held or isOrtho
      if ((e.shiftKey || isOrtho) && inProgressNodes.length > 0) {
        const prevNode = inProgressNodes[inProgressNodes.length - 1];
        coords = applyOrthoSnap(prevNode, coords);
      }

      const newNode: VectorNode = {
        x: coords.x,
        y: coords.y,
        type: 'corner',
      };

      const updated = [...inProgressNodes, newNode];
      onInProgressNodesChange?.(updated);

      isDraggingTangentRef.current = true;
      activePlacedNodeIndexRef.current = updated.length - 1;
      dragStartPointRef.current = coords;
      setIsDrawing(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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

    // Shape / Line drawing start
    if (activeTool === 'line') {
      dragStartPointRef.current = coords;
      setIsDrawing(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // Freehand drawing (Brush, Pencil, Airbrush, Eraser)
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

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

    strokeColorStateRef.current = {
      r: colorRgb.r,
      g: colorRgb.g,
      b: colorRgb.b,
      carriedR: colorRgb.r,
      carriedG: colorRgb.g,
      carriedB: colorRgb.b,
      hasCarriedColor: false,
    };

    if (isEraser && activeLayer.type === 'vector') {
      vectorEraseAt(activeLayer, coords.x, coords.y, brush.size / 2);
    } else {
      drawBrushStamp(
        activeLayer.ctx,
        smoothed.x,
        smoothed.y,
        brush.size / 2,
        brush,
        colorRgb,
        pressure,
        isEraser,
        strokeColorStateRef.current || undefined,
        tiltX,
        tiltY,
        twist
      );
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    let coords = clientToCanvasCoords(e.clientX, e.clientY, e.pointerType);
    if (!coords) return;

    setCursorPos(coords);
    onCursorMove(coords, currentPressure);

    // Multi-touch gestures (Pinch-to-zoom & two-finger Pan)
    if (activePointersRef.current.size === 2) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts: { x: number; y: number }[] = Array.from(activePointersRef.current.values());

      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistRef.current && dist > 0) {
        const factor = dist / pinchStartDistRef.current;
        const newZoom = Math.min(8.0, Math.max(0.1, pinchStartZoomRef.current * factor));

        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const deltaX = midX - (pinchStartMidpointRef.current?.x || midX);
        const deltaY = midY - (pinchStartMidpointRef.current?.y || midY);

        let newRotation = transform.rotation;
        if (touchSettings?.twoFingerRotate) {
          const currentAngle =
            Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
          const angleDelta = currentAngle - pinchStartAngleRef.current;
          newRotation = (newRotation + angleDelta) % 360;
          pinchStartAngleRef.current = currentAngle;
        }

        onTransformChange((prev) => ({
          ...prev,
          zoom: newZoom,
          x: pinchStartTransformRef.current.x + deltaX,
          y: pinchStartTransformRef.current.y + deltaY,
          rotation: newRotation,
        }));
      }
      return;
    }

    // Panning canvas
    if (isPanning) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      onTransformChange((prev) => ({ ...prev, x: newX, y: newY }));
      return;
    }

    // ==========================================
    // 1. TEXT DRAGGING
    // ==========================================
    if (activeTool === 'text') {
      if (isDraggingTextRef.current && selectedTextId) {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.vectorTexts) {
          const textItem = activeLayer.vectorTexts.find((t) => t.id === selectedTextId);
          if (textItem) {
            textItem.x = coords.x - textDragOffsetRef.current.x;
            textItem.y = coords.y - textDragOffsetRef.current.y;
            reRenderVectorLayer(activeLayer);
          }
        }
      }
      renderCadAndTextOverlay();
      return;
    }

    // ==========================================
    // 2. VECTOR CAD TOOL INTERACTIONS
    // ==========================================
    if (activeTool === 'vector') {
      const activeLayer = layers.find((l) => l.id === activeLayerId);

      if (isGridSnap) {
        coords = applyGridSnap(coords, 20);
      }

      if (vectorCadMode === 'edit') {
        if (isDrawing && draggedCadTargetRef.current && selectedVectorPathId && activeLayer?.vectorPaths) {
          const path = activeLayer.vectorPaths.find((p) => p.id === selectedVectorPathId);
          if (path && path.nodes[draggedCadTargetRef.current.index]) {
            const target = draggedCadTargetRef.current;
            const node = path.nodes[target.index];

            if (target.type === 'node') {
              const dx = coords.x - node.x;
              const dy = coords.y - node.y;
              node.x = coords.x;
              node.y = coords.y;
              if (node.handleIn) {
                node.handleIn.x += dx;
                node.handleIn.y += dy;
              }
              if (node.handleOut) {
                node.handleOut.x += dx;
                node.handleOut.y += dy;
              }
            } else if (target.type === 'handleOut') {
              node.handleOut = { x: coords.x, y: coords.y };
              if (node.type === 'smooth') {
                // Mirror handleIn symmetrically
                const dx = coords.x - node.x;
                const dy = coords.y - node.y;
                node.handleIn = { x: node.x - dx, y: node.y - dy };
              }
            } else if (target.type === 'handleIn') {
              node.handleIn = { x: coords.x, y: coords.y };
              if (node.type === 'smooth') {
                const dx = coords.x - node.x;
                const dy = coords.y - node.y;
                node.handleOut = { x: node.x - dx, y: node.y - dy };
              }
            }

            reRenderVectorLayer(activeLayer);
          }
        }
        renderCadAndTextOverlay(coords);
        return;
      }

      // Draw mode: pulling tangent handles during point placement
      if (isDrawing && isDraggingTangentRef.current && activePlacedNodeIndexRef.current >= 0) {
        const nodeIndex = activePlacedNodeIndexRef.current;
        if (inProgressNodes[nodeIndex]) {
          const anchor = inProgressNodes[nodeIndex];
          const dist = Math.hypot(coords.x - anchor.x, coords.y - anchor.y);
          if (dist > 3) {
            const updated = [...inProgressNodes];
            updated[nodeIndex] = {
              ...anchor,
              type: 'smooth',
              handleOut: { x: coords.x, y: coords.y },
              handleIn: { x: anchor.x - (coords.x - anchor.x), y: anchor.y - (coords.y - anchor.y) },
            };
            onInProgressNodesChange?.(updated);
          }
        }
      }

      renderCadAndTextOverlay(coords);
      return;
    }

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

    const { state: stylusState, mappedPressure, tiltX, tiltY, twist, altitude, azimuth, isWacomEraser } =
      extractStylusTelemetry(e);
    setCurrentStylusState(stylusState);
    onStylusUpdate?.(stylusState);

    const pressure = mappedPressure;
    setCurrentPressure(pressure);

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

    const isEraser = isWacomEraser || activeTool === 'eraser' || isTransparentMode;
    const colorRgb = parseColor(primaryColor);

    if (isEraser && activeLayer.type === 'vector') {
      vectorEraseAt(activeLayer, coords.x, coords.y, brush.size / 2);
    } else if (lastPointRef.current) {
      drawSegment(
        activeLayer.ctx,
        lastPointRef.current,
        smoothed,
        brush,
        colorRgb,
        isEraser,
        strokeColorStateRef.current || undefined
      );
    }
    lastPointRef.current = smoothed;
  };

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

    // Text tool end drag
    if (activeTool === 'text') {
      if (isDraggingTextRef.current) {
        isDraggingTextRef.current = false;
        onStrokeEnd();
      }
      setIsDrawing(false);
      return;
    }

    // Vector CAD end drag
    if (activeTool === 'vector') {
      if (isDraggingTangentRef.current) {
        isDraggingTangentRef.current = false;
      }
      if (draggedCadTargetRef.current) {
        draggedCadTargetRef.current = null;
        onStrokeEnd();
      }
      setIsDrawing(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

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

        const pCtx = previewCanvasRef.current?.getContext('2d');
        if (pCtx) pCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
      dragStartPointRef.current = null;
      onStrokeEnd();
      return;
    }

    if (activeTool === 'select') {
      dragStartPointRef.current = null;
      return;
    }

    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    if (activeLayer.type === 'vector' && currentStrokePointsRef.current.length > 0) {
      const isEraser = activeTool === 'eraser' || isTransparentMode;
      const newStroke: VectorStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points: currentStrokePointsRef.current,
        brush: { ...brush },
        color: primaryColor,
        isEraser,
        timestamp: Date.now(),
      };

      activeLayer.vectorStrokes = [...(activeLayer.vectorStrokes || []), newStroke];
      if (brush.smartCorrection || (brush.taperFactor && brush.taperFactor > 0)) {
        reRenderVectorLayer(activeLayer);
      }
    }

    currentStrokePointsRef.current = [];
    strokeColorStateRef.current = null;
    lastPointRef.current = null;
    dragStartPointRef.current = null;
    onStrokeEnd();
  };

  // ----------------------------------------------------
  // Live Overlay Rendering (CAD Vertices & Text Bounding Box)
  // ----------------------------------------------------
  const renderCadAndTextOverlay = useCallback(
    (curPos = cursorPos) => {
      const pCanvas = previewCanvasRef.current;
      if (!pCanvas) return;
      const ctx = pCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const activeLayer = layers.find((l) => l.id === activeLayerId);

      // 1. Text Selection Bounding Box Overlay
      if (activeTool === 'text' && activeLayer?.vectorTexts) {
        for (const t of activeLayer.vectorTexts) {
          const isSelected = t.id === selectedTextId;
          const bounds = measureVectorTextBounds(ctx, t);

          ctx.save();
          if (isSelected) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);

            // Corner grip knobs
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(bounds.x - 7, bounds.y - 7, 6, 6);
            ctx.fillRect(bounds.x + bounds.width + 1, bounds.y - 7, 6, 6);
            ctx.fillRect(bounds.x - 7, bounds.y + bounds.height + 1, 6, 6);
            ctx.fillRect(bounds.x + bounds.width + 1, bounds.y + bounds.height + 1, 6, 6);
          }
          ctx.restore();
        }
      }

      // 2. Vector CAD Overlay
      if (activeTool === 'vector') {
        ctx.save();

        // In Draw Mode: render in-progress polygon & Bezier curves
        if (vectorCadMode === 'draw') {
          if (inProgressNodes.length > 0) {
            // Draw in-progress path
            const tempPath: VectorPath = {
              id: 'temp_cad_draw',
              nodes: inProgressNodes,
              closed: false,
              strokeColor: vectorStrokeColor,
              strokeWidth: vectorStrokeWidth,
              strokeDash: vectorStrokeDash as 'solid' | 'dashed' | 'dotted',
              fillColor: 'none',
              opacity: 0.9,
            };
            renderVectorPath(ctx, tempPath);

            // Draw rubberband line to cursor
            if (curPos) {
              const lastNode = inProgressNodes[inProgressNodes.length - 1];
              ctx.beginPath();
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = '#60a5fa';
              ctx.lineWidth = 1.5;
              ctx.moveTo(lastNode.x, lastNode.y);
              ctx.lineTo(curPos.x, curPos.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Draw vertex nodes
            inProgressNodes.forEach((node, idx) => {
              const isFirst = idx === 0;
              const isStartSnapped =
                isFirst &&
                curPos &&
                inProgressNodes.length >= 2 &&
                Math.hypot(curPos.x - node.x, curPos.y - node.y) <= 14;

              ctx.save();
              if (isStartSnapped) {
                // Pulsing green snap target for closing path
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('Close Polygon', node.x + 14, node.y + 4);
              }

              ctx.fillStyle = isFirst ? '#22c55e' : node.type === 'smooth' ? '#38bdf8' : '#ffffff';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.5;

              if (node.type === 'smooth') {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              } else {
                ctx.fillRect(node.x - 3.5, node.y - 3.5, 7, 7);
                ctx.strokeRect(node.x - 3.5, node.y - 3.5, 7, 7);
              }

              // Draw Bezier handles if present
              if (node.handleOut) {
                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.handleOut.x, node.handleOut.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(node.handleOut.x, node.handleOut.y, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              if (node.handleIn) {
                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.handleIn.x, node.handleIn.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(node.handleIn.x, node.handleIn.y, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            });
          }
        } else if (vectorCadMode === 'edit' && activeLayer?.vectorPaths) {
          // In Edit Mode: highlight selected path & nodes
          const selPath = activeLayer.vectorPaths.find((p) => p.id === selectedVectorPathId);
          if (selPath) {
            // Draw path outline highlight
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(1, (selPath.strokeWidth || 2) + 2);
            ctx.globalAlpha = 0.4;
            renderVectorPath(ctx, selPath);
            ctx.restore();

            // Draw nodes
            selPath.nodes.forEach((node, idx) => {
              const isNodeSelected = idx === selectedNodeIndex;

              ctx.save();
              ctx.fillStyle = isNodeSelected ? '#fbbf24' : '#38bdf8';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.5;

              if (node.type === 'smooth') {
                ctx.beginPath();
                ctx.arc(node.x, node.y, isNodeSelected ? 5.5 : 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              } else {
                const s = isNodeSelected ? 5 : 3.5;
                ctx.fillRect(node.x - s, node.y - s, s * 2, s * 2);
                ctx.strokeRect(node.x - s, node.y - s, s * 2, s * 2);
              }

              // Selected node shows Bezier handles
              if (isNodeSelected) {
                if (node.handleOut) {
                  ctx.strokeStyle = '#fbbf24';
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(node.x, node.y);
                  ctx.lineTo(node.handleOut.x, node.handleOut.y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.arc(node.handleOut.x, node.handleOut.y, 4, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                }
                if (node.handleIn) {
                  ctx.strokeStyle = '#fbbf24';
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(node.x, node.y);
                  ctx.lineTo(node.handleIn.x, node.handleIn.y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.arc(node.handleIn.x, node.handleIn.y, 4, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                }
              }
              ctx.restore();
            });
          }
        }
        ctx.restore();
      }
    },
    [
      canvasWidth,
      canvasHeight,
      cursorPos,
      activeTool,
      activeLayerId,
      layers,
      selectedTextId,
      vectorCadMode,
      inProgressNodes,
      vectorStrokeColor,
      vectorStrokeWidth,
      vectorStrokeDash,
      selectedVectorPathId,
      selectedNodeIndex,
    ]
  );

  useEffect(() => {
    renderCadAndTextOverlay();
  }, [renderCadAndTextOverlay]);

  // Wheel zoom/scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      onTransformChange((prev) => ({
        ...prev,
        zoom: Math.min(8.0, Math.max(0.1, prev.zoom * zoomFactor)),
      }));
    } else {
      onTransformChange((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Cursor brush preview ring
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (cursorPos && !isPanning && activeTool !== 'vector' && activeTool !== 'text') {
      ctx.save();
      const radius = Math.max(2, brush.size / 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, radius + 1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }, [cursorPos, brush.size, activeTool, isPanning, canvasWidth, canvasHeight]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const selectedText = activeLayer?.vectorTexts?.find((t) => t.id === selectedTextId);
  const selectedTextBounds =
    selectedText && previewCanvasRef.current
      ? measureVectorTextBounds(previewCanvasRef.current.getContext('2d')!, selectedText)
      : null;

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
      className="w-full h-full bg-[#1a1a1a] relative overflow-hidden select-none touch-none"
      style={{
        cursor:
          isPanning || isSpacePressed || activeTool === 'pan'
            ? 'grab'
            : activeTool === 'zoom'
            ? 'zoom-in'
            : activeTool === 'eyedropper'
            ? 'crosshair'
            : activeTool === 'vector'
            ? 'crosshair'
            : activeTool === 'text'
            ? 'text'
            : 'crosshair',
      }}
    >
      {/* Visual Canvas Paper Wrapper with Transformation */}
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

        {/* Temporary Preview Canvas for CAD shapes, Bezier tangents, and Line tools */}
        <canvas
          ref={previewCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Cursor Outline Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Selection Marquee Overlay */}
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

        {/* Interactive Text Selection Box & Floating Mini Controls */}
        {activeTool === 'text' && selectedText && selectedTextBounds && (
          <div
            className="absolute border border-blue-400 bg-blue-500/10 pointer-events-auto cursor-move select-none"
            style={{
              left: `${selectedTextBounds.x - 4}px`,
              top: `${selectedTextBounds.y - 4}px`,
              width: `${selectedTextBounds.width + 8}px`,
              height: `${selectedTextBounds.height + 8}px`,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditVectorText?.(selectedText);
            }}
          >
            {/* Floating Action Pill */}
            <div
              className="absolute -top-7 left-0 flex items-center gap-1.5 bg-[#1e1e1e] border border-white/20 rounded-md px-2 py-0.5 text-[10px] text-white shadow-xl z-20 whitespace-nowrap"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="font-semibold text-blue-300 truncate max-w-[90px]">
                {selectedText.fontFamily}
              </span>
              <span className="text-gray-500">•</span>
              <button
                type="button"
                onClick={() => onEditVectorText?.(selectedText)}
                className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteVectorText?.(selectedText.id)}
                className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Telemetry Badge in Bottom-Left */}
      <div
        id="canvas-telemetry-badge"
        className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-md px-2.5 py-1.5 text-[10px] flex items-center gap-3 text-gray-300 font-mono select-none pointer-events-none shadow-lg z-10"
      >
        <span>
          X: {cursorPos ? Math.round(cursorPos.x) : 0} Y: {cursorPos ? Math.round(cursorPos.y) : 0}
        </span>
        <span className="text-blue-400 font-semibold">{Math.round(transform.zoom * 100)}%</span>
        {activeTool === 'vector' && (
          <span className="text-cyan-400 font-bold">
            CAD: {vectorCadMode === 'draw' ? 'PEN DRAW' : 'NODE EDIT'}
          </span>
        )}
        {activeTool === 'text' && (
          <span className="text-indigo-400 font-bold">TYPOGRAPHY</span>
        )}
      </div>
    </main>
  );
};
