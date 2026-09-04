import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layer,
  LayerType,
  VectorStroke,
  ToolType,
  BrushSettings,
  CanvasTransform,
  SelectionRect,
  TouchCalibrationSettings,
  WacomStylusState,
} from './types';
import { DEFAULT_BRUSH_PRESETS } from './utils/brushPresets';
import {
  cleanUpVectorLayer,
  adjustVectorStrokeWidths,
  scaleVectorLayer,
  reRenderVectorLayer,
} from './utils/vectorEngine';
import { TopMenuBar } from './components/TopMenuBar';
import { Toolbar } from './components/Toolbar';
import { CanvasTabBar } from './components/CanvasTabBar';
import { CanvasArea } from './components/CanvasArea';
import { NavigatorAndColor } from './components/Panels/NavigatorAndColor';
import { BrushSettingsPanel } from './components/Panels/BrushSettingsPanel';
import { LayersPanel } from './components/Panels/LayersPanel';
import { BottomStatusBar } from './components/BottomStatusBar';
import { NewCanvasModal } from './components/NewCanvasModal';
import { MobileTopBar } from './components/Mobile/MobileTopBar';
import { MobileBottomDock } from './components/Mobile/MobileBottomDock';
import { MobileCanvasHUD } from './components/Mobile/MobileCanvasHUD';
import { MobileToolsSheet } from './components/Mobile/MobileToolsSheet';
import { MobileColorSheet } from './components/Mobile/MobileColorSheet';
import { MobileBrushSheet } from './components/Mobile/MobileBrushSheet';
import { MobileLayersSheet } from './components/Mobile/MobileLayersSheet';
import { MobileActionsSheet } from './components/Mobile/MobileActionsSheet';
import { MobileMenuDrawer } from './components/Mobile/MobileMenuDrawer';
import { TouchCalibrationModal } from './components/Mobile/TouchCalibrationModal';
import { DesktopBrushSelectionMenu } from './components/DesktopBrushSelectionMenu';

// Helper to create a new raster or vector layer object
function createLayerObject(
  id: string,
  name: string,
  width: number,
  height: number,
  initialFill?: string,
  type: LayerType = 'raster'
): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  if (initialFill) {
    ctx.fillStyle = initialFill;
    ctx.fillRect(0, 0, width, height);
  }

  return {
    id,
    name,
    type,
    vectorStrokes: type === 'vector' ? [] : undefined,
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'source-over',
    canvas,
    ctx,
  };
}

export default function App() {
  // Canvas specifications
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(900);
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff');
  const [canvasName, setCanvasName] = useState('Canvas_01.ads');
  const [isModified, setIsModified] = useState(false);

  // Transform (pan, zoom, rotation, flip)
  const [transform, setTransform] = useState<CanvasTransform>({
    x: 0,
    y: 0,
    zoom: 0.85,
    rotation: 0,
    flipH: false,
  });

  // Tools & Brushes
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brush, setBrush] = useState<BrushSettings>(DEFAULT_BRUSH_PRESETS[0]);
  const [primaryColor, setPrimaryColor] = useState('#1e293b');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [isTransparentMode, setIsTransparentMode] = useState(false);

  // Selection
  const [selection, setSelection] = useState<SelectionRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    active: false,
  });

  // Telemetry & UI
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPressure, setCurrentPressure] = useState(1.0);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isNewCanvasModalOpen, setIsNewCanvasModalOpen] = useState(false);
  const [compositeThumbnail, setCompositeThumbnail] = useState<string>('');

  // Mobile layout detection & toggle
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [layoutMode, setLayoutMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const effectiveIsMobile = layoutMode === 'auto' ? isMobile : layoutMode === 'mobile';

  // Mobile drawer & sheet panels
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeMobileSheet, setActiveMobileSheet] = useState<
    'tools' | 'color' | 'brush' | 'layers' | 'actions' | null
  >(null);

  // Touch & Stylus Calibration Settings (Persisted in localStorage)
  const [touchSettings, setTouchSettings] = useState<TouchCalibrationSettings>(() => {
    try {
      const saved = localStorage.getItem('ads_touch_calibration');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      inputMode: 'all',
      offsetX: 0,
      offsetY: 0,
      twoFingerRotate: true,
      pressureMultiplier: 1.0,
    };
  });
  const [isTouchCalibModalOpen, setIsTouchCalibModalOpen] = useState(false);
  const [stylusState, setStylusState] = useState<WacomStylusState | null>(null);
  const [isDesktopBrushMenuOpen, setIsDesktopBrushMenuOpen] = useState(false);

  const handleUpdateTouchSettings = (updates: Partial<TouchCalibrationSettings>) => {
    setTouchSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('ads_touch_calibration', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Multi-layer state
  const [layers, setLayers] = useState<Layer[]>(() => {
    const bgLayer = createLayerObject('layer-bg', 'Paper Background', 1200, 900, '#ffffff');
    const sketchLayer = createLayerObject('layer-sketch', 'Sketch Reference', 1200, 900);
    const vectorLayer = createLayerObject('layer-vector', 'Vector Lineart (Scalable)', 1200, 900, undefined, 'vector');
    const colorLayer = createLayerObject('layer-color', 'Highlights & Color', 1200, 900);

    // Draw initial sample art on the sketch layer
    const sCtx = sketchLayer.ctx;
    sCtx.save();
    sCtx.strokeStyle = 'rgba(74, 144, 226, 0.45)';
    sCtx.lineWidth = 3;
    sCtx.lineCap = 'round';
    // Gentle manga sketch curve
    sCtx.beginPath();
    sCtx.arc(600, 420, 160, 0, Math.PI * 2);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(600, 240);
    sCtx.lineTo(600, 600);
    sCtx.moveTo(430, 430);
    sCtx.lineTo(770, 430);
    sCtx.stroke();
    sCtx.restore();

    // Populate vectorLayer with initial crisp vector strokes
    const sampleVectorStroke1: VectorStroke = {
      id: 'v-stroke-eye-1',
      points: [
        { x: 520, y: 420, pressure: 0.5 },
        { x: 540, y: 395, pressure: 0.9 },
        { x: 570, y: 395, pressure: 0.9 },
        { x: 590, y: 420, pressure: 0.4 },
      ],
      color: '#1e293b',
      isEraser: false,
      timestamp: 0,
      brush: {
        id: 'g-pen',
        name: 'G-Pen',
        category: 'ink',
        size: 6,
        opacity: 1,
        flow: 1,
        hardness: 1,
        spacing: 0.05,
        stabilization: 15,
        tipShape: 'round',
        angle: 0,
        pressureSize: true,
        pressureOpacity: false,
        mixGroundColor: false,
        colorMixRatio: 0,
        jitter: 0,
      },
    };

    const sampleVectorStroke2: VectorStroke = {
      id: 'v-stroke-eye-2',
      points: [
        { x: 610, y: 420, pressure: 0.4 },
        { x: 630, y: 395, pressure: 0.9 },
        { x: 660, y: 395, pressure: 0.9 },
        { x: 680, y: 420, pressure: 0.5 },
      ],
      color: '#1e293b',
      isEraser: false,
      timestamp: 0,
      brush: {
        id: 'g-pen',
        name: 'G-Pen',
        category: 'ink',
        size: 6,
        opacity: 1,
        flow: 1,
        hardness: 1,
        spacing: 0.05,
        stabilization: 15,
        tipShape: 'round',
        angle: 0,
        pressureSize: true,
        pressureOpacity: false,
        mixGroundColor: false,
        colorMixRatio: 0,
        jitter: 0,
      },
    };

    vectorLayer.vectorStrokes = [sampleVectorStroke1, sampleVectorStroke2];
    reRenderVectorLayer(vectorLayer);

    const vCtx = vectorLayer.ctx;
    vCtx.save();
    // Smile
    vCtx.lineWidth = 5;
    vCtx.strokeStyle = '#1e293b';
    vCtx.lineCap = 'round';
    vCtx.beginPath();
    vCtx.arc(600, 470, 28, 0.2, Math.PI - 0.2);
    vCtx.stroke();

    // Art Draw Studio logo watermark in corner
    vCtx.fillStyle = '#4a90e2';
    vCtx.font = 'bold 24px sans-serif';
    vCtx.fillText('ART DRAW STUDIO', 470, 560);
    vCtx.fillStyle = '#888888';
    vCtx.font = '14px sans-serif';
    vCtx.fillText('Customizable Brush Engines & Multi-Layer Workspace', 415, 590);
    vCtx.restore();

    return [bgLayer, sketchLayer, vectorLayer, colorLayer];
  });

  const [activeLayerId, setActiveLayerId] = useState<string>('layer-color');

  // History Stack for Undo/Redo
  interface HistoryStep {
    layersSnapshot: {
      id: string;
      name: string;
      type?: LayerType;
      vectorStrokes?: VectorStroke[];
      visible: boolean;
      locked: boolean;
      opacity: number;
      blendMode: any;
      imageData: ImageData;
    }[];
    activeLayerId: string;
  }

  const historyStackRef = useRef<HistoryStep[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Capture snapshot of current layers
  const recordHistory = useCallback(() => {
    setIsModified(true);
    const snapshot: HistoryStep = {
      activeLayerId,
      layersSnapshot: layers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        vectorStrokes: l.vectorStrokes ? JSON.parse(JSON.stringify(l.vectorStrokes)) : undefined,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        imageData: l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height),
      })),
    };

    // Slice any redo branches
    const nextHistory = historyStackRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 25) {
      nextHistory.shift();
    }
    historyStackRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    // Update thumbnail of active layer and composite
    updateLayerThumbnail(activeLayerId);
  }, [layers, activeLayerId]);

  // Initial history snapshot on load
  useEffect(() => {
    if (historyStackRef.current.length === 0 && layers.length > 0) {
      recordHistory();
    }
  }, [layers, recordHistory]);

  // Generate thumbnail for a layer
  const updateLayerThumbnail = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || !layer.canvas) return;

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 40;
    thumbCanvas.height = 30;
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(layer.canvas, 0, 0, 40, 30);
      layer.thumbnail = thumbCanvas.toDataURL();
    }

    // Also update composite thumbnail for Navigator
    const compCanvas = document.createElement('canvas');
    compCanvas.width = 80;
    compCanvas.height = 60;
    const cCtx = compCanvas.getContext('2d');
    if (cCtx) {
      if (canvasBgColor !== 'transparent') {
        cCtx.fillStyle = canvasBgColor;
        cCtx.fillRect(0, 0, 80, 60);
      }
      layers.forEach((l) => {
        if (l.visible && l.canvas) {
          cCtx.globalAlpha = l.opacity;
          cCtx.globalCompositeOperation = l.blendMode;
          cCtx.drawImage(l.canvas, 0, 0, 80, 60);
        }
      });
      setCompositeThumbnail(compCanvas.toDataURL());
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const step = historyStackRef.current[historyIndexRef.current];
      restoreHistoryStep(step);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const step = historyStackRef.current[historyIndexRef.current];
      restoreHistoryStep(step);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyStackRef.current.length - 1);
    }
  };

  const restoreHistoryStep = (step: HistoryStep) => {
    step.layersSnapshot.forEach((snap) => {
      const layer = layers.find((l) => l.id === snap.id);
      if (layer && layer.ctx) {
        layer.name = snap.name;
        layer.type = snap.type || 'raster';
        layer.vectorStrokes = snap.vectorStrokes ? JSON.parse(JSON.stringify(snap.vectorStrokes)) : undefined;
        layer.visible = snap.visible;
        layer.locked = snap.locked;
        layer.opacity = snap.opacity;
        layer.blendMode = snap.blendMode;
        layer.ctx.putImageData(snap.imageData, 0, 0);
        updateLayerThumbnail(layer.id);
      }
    });
    setActiveLayerId(step.activeLayerId);
    setLayers([...layers]);
  };

  // Layer Operations
  const handleAddLayer = () => {
    const newId = `layer-${Date.now()}`;
    const newLayer = createLayerObject(newId, `Layer ${layers.length + 1}`, canvasWidth, canvasHeight);
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      recordHistory();
    }, 50);
  };

  const handleAddVectorLayer = () => {
    const newId = `layer-vector-${Date.now()}`;
    const count = layers.filter((l) => l.type === 'vector').length + 1;
    const newLayer = createLayerObject(newId, `Vector Layer ${count}`, canvasWidth, canvasHeight, undefined, 'vector');
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      recordHistory();
    }, 50);
  };

  const handleCleanUpVectorLayer = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.type !== 'vector' || !layer.vectorStrokes?.length) return;

    cleanUpVectorLayer(layer);
    updateLayerThumbnail(layer.id);
    setLayers([...layers]);
    recordHistory();
  };

  const handleAdjustVectorWidth = (layerId: string, factor: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.type !== 'vector' || !layer.vectorStrokes?.length) return;

    adjustVectorStrokeWidths(layer, factor);
    updateLayerThumbnail(layer.id);
    setLayers([...layers]);
    recordHistory();
  };

  const handleScaleVectorLayer = (layerId: string, factor: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.type !== 'vector' || !layer.vectorStrokes?.length) return;

    scaleVectorLayer(layer, factor);
    updateLayerThumbnail(layer.id);
    setLayers([...layers]);
    recordHistory();
  };

  const handleDuplicateLayer = (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    const newId = `layer-${Date.now()}`;
    const newLayer = createLayerObject(newId, `${source.name} Copy`, canvasWidth, canvasHeight);
    newLayer.ctx.drawImage(source.canvas, 0, 0);
    newLayer.opacity = source.opacity;
    newLayer.blendMode = source.blendMode;

    const index = layers.findIndex((l) => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    setLayers(newLayers);
    setActiveLayerId(newId);
    recordHistory();
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter((l) => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[newLayers.length - 1].id);
    }
    recordHistory();
  };

  const handleMergeDown = (id: string) => {
    const index = layers.findIndex((l) => l.id === id);
    if (index <= 0) return; // cannot merge bottom layer

    const upperLayer = layers[index];
    const lowerLayer = layers[index - 1];

    lowerLayer.ctx.save();
    lowerLayer.ctx.globalAlpha = upperLayer.opacity;
    lowerLayer.ctx.globalCompositeOperation = upperLayer.blendMode;
    lowerLayer.ctx.drawImage(upperLayer.canvas, 0, 0);
    lowerLayer.ctx.restore();

    const newLayers = layers.filter((l) => l.id !== upperLayer.id);
    setLayers(newLayers);
    setActiveLayerId(lowerLayer.id);
    recordHistory();
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;

    const newLayers = [...layers];
    const [moved] = newLayers.splice(index, 1);
    newLayers.splice(targetIndex, 0, moved);
    setLayers(newLayers);
    recordHistory();
  };

  const handleToggleVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLock = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleClearActiveLayer = () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    if (selection.active && selection.width > 0 && selection.height > 0) {
      // Clear inside selection
      activeLayer.ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
    } else {
      activeLayer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    recordHistory();
  };

  // View transformations
  const handleResetView = () => {
    setTransform({
      x: 0,
      y: 0,
      zoom: 1.0,
      rotation: 0,
      flipH: false,
    });
  };

  const handleFitScreen = () => {
    const container = document.getElementById('canvas-workspace');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = (rect.width - 60) / canvasWidth;
    const scaleY = (rect.height - 60) / canvasHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1.2);
    setTransform({
      x: 0,
      y: 0,
      zoom: Math.max(0.2, fitZoom),
      rotation: 0,
      flipH: false,
    });
  };

  const handleFlipCanvasH = () => {
    setTransform((prev) => ({ ...prev, flipH: !prev.flipH }));
  };

  const handleRotateCanvas90 = () => {
    setTransform((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  // Color Swapping & Modes
  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
  };

  const handleToggleTransparentMode = () => {
    setIsTransparentMode((prev) => !prev);
  };

  // Image & Project Export / Import
  const handleExportPng = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d')!;

    if (canvasBgColor !== 'transparent') {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    layers.forEach((l) => {
      if (l.visible && l.canvas) {
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode;
        ctx.drawImage(l.canvas, 0, 0);
      }
    });

    const link = document.createElement('a');
    link.download = `${canvasName.replace(/\.[^/.]+$/, '')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleExportJpg = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d')!;

    // Flatten to white paper background
    ctx.fillStyle = canvasBgColor === 'transparent' ? '#ffffff' : canvasBgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    layers.forEach((l) => {
      if (l.visible && l.canvas) {
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode;
        ctx.drawImage(l.canvas, 0, 0);
      }
    });

    const link = document.createElement('a');
    link.download = `${canvasName.replace(/\.[^/.]+$/, '')}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  const handleSaveProject = () => {
    const projectData = {
      name: canvasName,
      width: canvasWidth,
      height: canvasHeight,
      bgColor: canvasBgColor,
      layers: layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        dataUrl: l.canvas.toDataURL(),
      })),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${canvasName.replace(/\.[^/.]+$/, '')}.ads.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setIsModified(false);
  };

  const handleLoadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.width && data.height && Array.isArray(data.layers)) {
          setCanvasWidth(data.width);
          setCanvasHeight(data.height);
          setCanvasBgColor(data.bgColor || '#ffffff');
          setCanvasName(data.name || file.name);

          const loadedLayers: Layer[] = data.layers.map((l: any) => {
            const layerObj = createLayerObject(l.id, l.name, data.width, data.height);
            layerObj.visible = l.visible;
            layerObj.locked = l.locked;
            layerObj.opacity = l.opacity;
            layerObj.blendMode = l.blendMode;

            if (l.dataUrl) {
              const img = new Image();
              img.onload = () => {
                layerObj.ctx.drawImage(img, 0, 0);
                updateLayerThumbnail(layerObj.id);
              };
              img.src = l.dataUrl;
            }
            return layerObj;
          });

          setLayers(loadedLayers);
          setActiveLayerId(loadedLayers[loadedLayers.length - 1].id);
          historyStackRef.current = [];
          historyIndexRef.current = -1;
          handleFitScreen();
        }
      } catch (err) {
        console.error('Failed to load project file', err);
      }
    };
    reader.readAsText(file);
  };

  const handleImportImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const newId = `layer-imported-${Date.now()}`;
        const newLayer = createLayerObject(newId, file.name.slice(0, 15), canvasWidth, canvasHeight);
        // Center image on canvas
        const dx = (canvasWidth - img.width) / 2;
        const dy = (canvasHeight - img.height) / 2;
        newLayer.ctx.drawImage(img, dx, dy);
        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(newId);
        recordHistory();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Create New Canvas from Modal
  const handleCreateNewCanvas = (
    width: number,
    height: number,
    bgColor: string,
    name: string
  ) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
    setCanvasBgColor(bgColor);
    setCanvasName(name);

    const bgLayer = createLayerObject('layer-bg', 'Paper Background', width, height, bgColor);
    const drawLayer = createLayerObject('layer-1', 'Layer 1', width, height);

    setLayers([bgLayer, drawLayer]);
    setActiveLayerId(drawLayer.id);
    historyStackRef.current = [];
    historyIndexRef.current = -1;
    handleFitScreen();
    setTimeout(() => {
      recordHistory();
    }, 100);
  };

  // Image Filters
  const handleApplyFilter = (filterType: 'invert' | 'grayscale' | 'manga_tone' | 'blur') => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    const ctx = activeLayer.ctx;
    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const d = imgData.data;

    if (filterType === 'invert') {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 0) {
          d[i] = 255 - d[i];
          d[i + 1] = 255 - d[i + 1];
          d[i + 2] = 255 - d[i + 2];
        }
      }
    } else if (filterType === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        d[i] = avg;
        d[i + 1] = avg;
        d[i + 2] = avg;
      }
    } else if (filterType === 'manga_tone') {
      // Manga Screentone threshold effect
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 10) {
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          const pixelX = (i / 4) % canvasWidth;
          const pixelY = Math.floor(i / 4 / canvasWidth);
          // Dot screen pattern
          const screenDot = (pixelX % 4 < 2 && pixelY % 4 < 2) ? 40 : 0;
          const val = lum + screenDot < 150 ? 0 : 255;
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }
      }
    } else if (filterType === 'blur') {
      ctx.filter = 'blur(4px)';
      ctx.drawImage(activeLayer.canvas, 0, 0);
      ctx.filter = 'none';
      recordHistory();
      return;
    }

    ctx.putImageData(imgData, 0, 0);
    recordHistory();
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleClearActiveLayer();
        return;
      }

      // Tool hotkeys
      switch (e.key.toLowerCase()) {
        case 'b':
          if (activeTool === 'brush') {
            setIsDesktopBrushMenuOpen((prev) => !prev);
          } else {
            setActiveTool('brush');
          }
          break;
        case 'p':
          setActiveTool('brush');
          break;
        case 'n':
          setActiveTool('pencil');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'g':
          setActiveTool('bucket');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case 'm':
          setActiveTool('select');
          break;
        case 'u':
          setActiveTool('line');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'z':
          setActiveTool('zoom');
          break;
        case 'x':
          handleSwapColors();
          break;
        case 'c':
          handleToggleTransparentMode();
          break;
        case '[':
          setBrush((prev) => ({ ...prev, size: Math.max(1, prev.size - 4) }));
          break;
        case ']':
          setBrush((prev) => ({ ...prev, size: Math.min(200, prev.size + 4) }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [layers, activeLayerId]);

  return (
    <div
      id="art-draw-studio-app"
      className="h-screen w-screen flex flex-col bg-[#121212] text-[#d1d1d1] font-sans overflow-hidden select-none"
    >
      {effectiveIsMobile ? (
        /* MOBILE TOUCH-OPTIMIZED LAYOUT */
        <div className="flex flex-col h-full w-full overflow-hidden relative">
          {/* 1. Mobile Top Bar */}
          <MobileTopBar
            canvasName={canvasName}
            isModified={isModified}
            zoom={transform.zoom}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenMenu={() => setMobileDrawerOpen(true)}
            onFitScreen={handleFitScreen}
            onQuickExport={handleExportPng}
            isForcedMobile={layoutMode === 'mobile'}
            onToggleLayoutMode={() =>
              setLayoutMode(effectiveIsMobile ? 'desktop' : 'mobile')
            }
            onOpenTouchCalibration={() => setIsTouchCalibModalOpen(true)}
          />

          {/* 2. Full-Screen Canvas Workspace with Floating HUD */}
          <div className="flex-1 relative overflow-hidden bg-[#1a1a1a]">
            {/* Mobile Quick Brush Size & Opacity HUD (Left Edge) */}
            <MobileCanvasHUD
              brush={brush}
              onUpdateBrush={(updates) => setBrush((prev) => ({ ...prev, ...updates }))}
              primaryColor={primaryColor}
            />

            {/* Interactive Multi-layer Canvas Area */}
            <CanvasArea
              layers={layers}
              activeLayerId={activeLayerId}
              activeTool={activeTool}
              brush={brush}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              isTransparentMode={isTransparentMode}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              canvasBgColor={canvasBgColor}
              transform={transform}
              selection={selection}
              onTransformChange={setTransform}
              onSelectionChange={setSelection}
              onColorSampled={(sampled) => setPrimaryColor(sampled)}
              onStrokeEnd={recordHistory}
              onCursorMove={(pos, pressure) => {
                setCursorPos(pos);
                setCurrentPressure(pressure);
              }}
              onStylusUpdate={setStylusState}
              isSpacePressed={isSpacePressed}
              touchSettings={touchSettings}
            />
          </div>

          {/* 3. Mobile Thumb-Friendly Bottom Dock */}
          <MobileBottomDock
            activeTool={activeTool}
            brush={brush}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            isTransparentMode={isTransparentMode}
            layerCount={layers.length}
            activeLayerName={layers.find((l) => l.id === activeLayerId)?.name || 'Layer'}
            onSwapColors={handleSwapColors}
            onToggleTransparentMode={handleToggleTransparentMode}
            onOpenToolsSheet={() => setActiveMobileSheet('tools')}
            onOpenColorSheet={() => setActiveMobileSheet('color')}
            onOpenBrushSheet={() => setActiveMobileSheet('brush')}
            onOpenLayersSheet={() => setActiveMobileSheet('layers')}
            onOpenActionsSheet={() => setActiveMobileSheet('actions')}
          />

          {/* 4. Bottom Sheets */}
          <MobileToolsSheet
            isOpen={activeMobileSheet === 'tools'}
            onClose={() => setActiveMobileSheet(null)}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />

          <MobileColorSheet
            isOpen={activeMobileSheet === 'color'}
            onClose={() => setActiveMobileSheet(null)}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onColorChange={setPrimaryColor}
            onSwapColors={handleSwapColors}
          />

          <MobileBrushSheet
            isOpen={activeMobileSheet === 'brush'}
            onClose={() => setActiveMobileSheet(null)}
            brush={brush}
            onUpdateBrush={(updates) => setBrush((prev) => ({ ...prev, ...updates }))}
            onSelectPreset={(preset) => setBrush(preset)}
            primaryColor={primaryColor}
          />

          <MobileLayersSheet
            isOpen={activeMobileSheet === 'layers'}
            onClose={() => setActiveMobileSheet(null)}
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={handleAddLayer}
            onAddVectorLayer={handleAddVectorLayer}
            onCleanUpVectorLayer={handleCleanUpVectorLayer}
            onAdjustVectorWidth={handleAdjustVectorWidth}
            onScaleVectorLayer={handleScaleVectorLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onMergeDown={handleMergeDown}
            onMoveLayer={handleMoveLayer}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onUpdateLayer={handleUpdateLayer}
            onClearLayer={handleClearActiveLayer}
          />

          <MobileActionsSheet
            isOpen={activeMobileSheet === 'actions'}
            onClose={() => setActiveMobileSheet(null)}
            onFlipCanvasH={handleFlipCanvasH}
            onRotateCanvas90={handleRotateCanvas90}
            onResetView={handleResetView}
            onApplyFilter={handleApplyFilter}
            onClearActiveLayer={handleClearActiveLayer}
            onSelectAll={() =>
              setSelection({
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                active: true,
              })
            }
            onDeselect={() =>
              setSelection({ x: 0, y: 0, width: 0, height: 0, active: false })
            }
            onOpenTouchCalibration={() => setIsTouchCalibModalOpen(true)}
          />

          {/* 5. Mobile Slide Drawer */}
          <MobileMenuDrawer
            isOpen={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            onNewCanvas={() => setIsNewCanvasModalOpen(true)}
            onSaveProject={handleSaveProject}
            onLoadProject={handleLoadProject}
            onImportImage={handleImportImage}
            onExportPng={handleExportPng}
            onExportJpg={handleExportJpg}
            onFitScreen={handleFitScreen}
            onSwitchToDesktop={() => setLayoutMode('desktop')}
            canvasName={canvasName}
          />
        </div>
      ) : (
        /* DESKTOP HIGH-DENSITY STUDIO LAYOUT */
        <>
          {/* 1. High Density Top Menu Bar */}
          <TopMenuBar
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onNewCanvas={() => setIsNewCanvasModalOpen(true)}
            onExportPng={handleExportPng}
            onExportJpg={handleExportJpg}
            onSaveProject={handleSaveProject}
            onLoadProject={handleLoadProject}
            onImportImage={handleImportImage}
            onClearActiveLayer={handleClearActiveLayer}
            onFlipCanvasH={handleFlipCanvasH}
            onRotateCanvas90={handleRotateCanvas90}
            onResetView={handleResetView}
            onAddLayer={handleAddLayer}
            onApplyFilter={handleApplyFilter}
            onSelectAll={() =>
              setSelection({
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                active: true,
              })
            }
            onDeselect={() =>
              setSelection({ x: 0, y: 0, width: 0, height: 0, active: false })
            }
            onOpenBrushMenu={() => setIsDesktopBrushMenuOpen((prev) => !prev)}
          />

          {/* Main Workspace Area (Toolbar + Canvas + Panels Dock) */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* 2. Left Tool Sidebar */}
            <Toolbar
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              isTransparentMode={isTransparentMode}
              onSwapColors={handleSwapColors}
              onToggleTransparentMode={handleToggleTransparentMode}
              onPrimaryColorChange={setPrimaryColor}
              activeBrush={brush}
              onOpenBrushMenu={() => setIsDesktopBrushMenuOpen((prev) => !prev)}
              isBrushMenuOpen={isDesktopBrushMenuOpen}
            />

            {/* 3. Center Canvas Workspace */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#1a1a1a]">
              {/* Sub-tool & Document Tab Bar */}
              <CanvasTabBar
                canvasName={canvasName}
                isModified={isModified}
                zoom={transform.zoom}
                onNewCanvas={() => setIsNewCanvasModalOpen(true)}
                onResetView={handleResetView}
                onFitScreen={handleFitScreen}
                onToggleMobileLayout={() => setLayoutMode('mobile')}
                isMobileLayout={false}
                onOpenTouchCalibration={() => setIsTouchCalibModalOpen(true)}
                activeBrush={brush}
                onOpenBrushMenu={() => setIsDesktopBrushMenuOpen((prev) => !prev)}
                isBrushMenuOpen={isDesktopBrushMenuOpen}
              />

              {/* Interactive Multi-layer Canvas Area */}
              <CanvasArea
                layers={layers}
                activeLayerId={activeLayerId}
                activeTool={activeTool}
                brush={brush}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                isTransparentMode={isTransparentMode}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                canvasBgColor={canvasBgColor}
                transform={transform}
                selection={selection}
                onTransformChange={setTransform}
                onSelectionChange={setSelection}
                onColorSampled={(sampled) => setPrimaryColor(sampled)}
                onStrokeEnd={recordHistory}
                onCursorMove={(pos, pressure) => {
                  setCursorPos(pos);
                  setCurrentPressure(pressure);
                }}
                onStylusUpdate={setStylusState}
                isSpacePressed={isSpacePressed}
                touchSettings={touchSettings}
              />
            </div>

            {/* 4. Right Dock Sidebar (Navigator/Color, Brush Engine, Layers) */}
            <aside
              id="right-dock-panels"
              className="w-[280px] bg-[#2d2d2d] border-l border-black flex flex-col shrink-0 z-20"
            >
              {/* Top Panel: Navigator & HSV Color Wheel */}
              <NavigatorAndColor
                primaryColor={primaryColor}
                onColorChange={setPrimaryColor}
                transform={transform}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                onResetView={handleResetView}
                compositeThumbnail={compositeThumbnail}
              />

              {/* Middle Panel: Customizable Brush Engine */}
              <BrushSettingsPanel
                brush={brush}
                onUpdateBrush={(updates) => setBrush((prev) => ({ ...prev, ...updates }))}
                onSelectPreset={(preset) => setBrush(preset)}
                onOpenBrushMenu={() => setIsDesktopBrushMenuOpen((prev) => !prev)}
              />

              {/* Bottom Panel: Multi-layer Workspace */}
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={handleAddLayer}
                onAddVectorLayer={handleAddVectorLayer}
                onCleanUpVectorLayer={handleCleanUpVectorLayer}
                onAdjustVectorWidth={handleAdjustVectorWidth}
                onScaleVectorLayer={handleScaleVectorLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
                onMergeDown={handleMergeDown}
                onMoveLayer={handleMoveLayer}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onUpdateLayer={handleUpdateLayer}
                onClearLayer={handleClearActiveLayer}
              />
            </aside>
          </div>

          {/* 5. Bottom Status Bar */}
          <BottomStatusBar
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={transform.zoom}
            rotation={transform.rotation}
            cursorPos={cursorPos}
            pressure={currentPressure}
            stylusState={stylusState}
            onOpenWacomSettings={() => setIsTouchCalibModalOpen(true)}
            onZoomChange={(newZoom) => setTransform((prev) => ({ ...prev, zoom: newZoom }))}
            onResetView={handleResetView}
          />

          {/* 6. Desktop Brush Selection Sub Tool Floating Window (with live previews per brush) */}
          <DesktopBrushSelectionMenu
            isOpen={isDesktopBrushMenuOpen}
            onClose={() => setIsDesktopBrushMenuOpen(false)}
            activeBrush={brush}
            onSelectBrush={(newBrush) => {
              setBrush(newBrush);
              setActiveTool('brush');
            }}
            primaryColor={primaryColor}
            onUpdateBrushSize={(newSize) => setBrush((prev) => ({ ...prev, size: newSize }))}
          />
        </>
      )}

      {/* 6. New Canvas Modal */}
      <NewCanvasModal
        isOpen={isNewCanvasModalOpen}
        onClose={() => setIsNewCanvasModalOpen(false)}
        onCreate={handleCreateNewCanvas}
      />

      {/* 7. Touch & Stylus Calibration Modal */}
      <TouchCalibrationModal
        isOpen={isTouchCalibModalOpen}
        onClose={() => setIsTouchCalibModalOpen(false)}
        settings={touchSettings}
        onSaveSettings={handleUpdateTouchSettings}
      />
    </div>
  );
}
