import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layer,
  LayerType,
  VectorStroke,
  VectorPath,
  VectorNode,
  ToolType,
  BrushSettings,
  CanvasTransform,
  SelectionRect,
  TouchCalibrationSettings,
  WacomStylusState,
  CanvasDocument,
  HistoryStep,
  VectorText,
} from './types';
import { DEFAULT_BRUSH_PRESETS } from './utils/brushPresets';
import {
  cleanUpVectorLayer,
  adjustVectorStrokeWidths,
  scaleVectorLayer,
  reRenderVectorLayer,
  renderVectorText,
} from './utils/vectorEngine';
import { preloadProjectFonts, loadGoogleFont } from './utils/googleFonts';
import { VectorCadBar, VectorCadMode } from './components/VectorCadBar';
import { TextQuickBar } from './components/TextQuickBar';
import { GoogleFontLibraryModal } from './components/GoogleFontLibraryModal';
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
import { SavePromptModal } from './components/SavePromptModal';
import { TextToolDialog } from './components/TextToolDialog';
import {
  isFileSystemAccessSupported,
  openProjectWithPicker,
  saveProjectWithPicker,
} from './utils/fileSystemAccess';

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
    vectorTexts: type === 'vector' ? [] : undefined,
    vectorPaths: type === 'vector' ? [] : undefined,
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'source-over',
    canvas,
    ctx,
  };
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  if (ctx && source.width > 0 && source.height > 0) {
    ctx.drawImage(source, 0, 0);
  }
  return c;
}

function cloneLayers(sourceLayers: Layer[]): Layer[] {
  return sourceLayers.map((l) => {
    const clonedCanvas = cloneCanvas(l.canvas);
    const ctx = clonedCanvas.getContext('2d', { willReadFrequently: true })!;
    return {
      ...l,
      canvas: clonedCanvas,
      ctx,
      vectorStrokes: l.vectorStrokes ? JSON.parse(JSON.stringify(l.vectorStrokes)) : undefined,
      vectorTexts: l.vectorTexts ? JSON.parse(JSON.stringify(l.vectorTexts)) : undefined,
      vectorPaths: l.vectorPaths ? JSON.parse(JSON.stringify(l.vectorPaths)) : undefined,
    };
  });
}

function createInitialDocument(): CanvasDocument {
  const bgLayer = createLayerObject('layer-bg', 'Paper Background', 1200, 900, '#ffffff');
  const drawLayer = createLayerObject('layer-1', 'Layer 1', 1200, 900);

  return {
    id: 'doc-1',
    name: 'Canvas_01.ads',
    width: 1200,
    height: 900,
    bgColor: '#ffffff',
    isModified: false,
    layers: [bgLayer, drawLayer],
    activeLayerId: drawLayer.id,
    transform: {
      x: 0,
      y: 0,
      zoom: 0.85,
      rotation: 0,
      flipH: false,
    },
    historyStack: [],
    historyIndex: -1,
  };
}

function createBlankDocument(name = 'Canvas_01.ads', width = 1200, height = 900, bgColor = '#ffffff'): CanvasDocument {
  const bgLayer = createLayerObject(`layer-bg-${Date.now()}`, 'Paper Background', width, height, bgColor);
  const drawLayer = createLayerObject(`layer-1-${Date.now()}`, 'Layer 1', width, height);
  return {
    id: `doc-${Date.now()}`,
    name,
    width,
    height,
    bgColor,
    isModified: false,
    layers: [bgLayer, drawLayer],
    activeLayerId: drawLayer.id,
    transform: {
      x: 0,
      y: 0,
      zoom: 0.85,
      rotation: 0,
      flipH: false,
    },
    historyStack: [],
    historyIndex: -1,
  };
}

export default function App() {
  const studioRoot = typeof document !== 'undefined' ? document.getElementById('root') : null;
  const studioApiBase = studioRoot?.dataset.apiBase || '';
  const studioPermission = studioRoot?.dataset.projectPermission || 'owner';
  const isTsgStudio = studioApiBase !== '';
  const [studioProjectId, setStudioProjectId] = useState(studioRoot?.dataset.projectId || '');
  const [studioVersion, setStudioVersion] = useState(0);
  const [studioNotice, setStudioNotice] = useState('');
  const [studioBusy, setStudioBusy] = useState(Boolean(studioRoot?.dataset.projectId));
  const [studioShareOpen, setStudioShareOpen] = useState(false);
  const [studioShares, setStudioShares] = useState<Array<{ id: number; email: string; username: string; permission: string }>>([]);
  const [studioRecipient, setStudioRecipient] = useState('');
  const [studioSharePermission, setStudioSharePermission] = useState<'viewer' | 'editor'>('viewer');
  const [studioDesignUrl, setStudioDesignUrl] = useState('');

  // Documents (Multi-Canvas Tabs)
  const [initialDoc] = useState<CanvasDocument>(() => createInitialDocument());
  const [documents, setDocuments] = useState<CanvasDocument[]>([initialDoc]);
  const [activeDocId, setActiveDocId] = useState<string>(initialDoc.id);

  // Active Canvas specifications
  const [canvasWidth, setCanvasWidth] = useState(initialDoc.width);
  const [canvasHeight, setCanvasHeight] = useState(initialDoc.height);
  const [canvasBgColor, setCanvasBgColor] = useState(initialDoc.bgColor);
  const [canvasName, setCanvasName] = useState(initialDoc.name);
  const [isModified, setIsModified] = useState(initialDoc.isModified);
  const [activeFileHandle, setActiveFileHandle] = useState<FileSystemFileHandle | undefined>(
    initialDoc.fileHandle
  );

  // Transform (pan, zoom, rotation, flip)
  const [transform, setTransform] = useState<CanvasTransform>(initialDoc.transform);

  // Multi-layer state for active canvas
  const [layers, setLayers] = useState<Layer[]>(initialDoc.layers);
  const [activeLayerId, setActiveLayerId] = useState<string>(initialDoc.activeLayerId);

  // Tools & Brushes
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [textPlacement, setTextPlacement] = useState<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState<BrushSettings>(() =>
    DEFAULT_BRUSH_PRESETS.find((preset) => preset.id === 'g-pen') || DEFAULT_BRUSH_PRESETS[0]
  );
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
  const [closePromptTarget, setClosePromptTarget] = useState<{
    docId: string;
    fileName: string;
  } | null>(null);

  // Vector CAD & Typography State
  const [vectorCadMode, setVectorCadMode] = useState<VectorCadMode>('draw');
  const [vectorStrokeColor, setVectorStrokeColor] = useState<string>('#3b82f6');
  const [vectorStrokeWidth, setVectorStrokeWidth] = useState<number>(3);
  const [vectorStrokeDash, setVectorStrokeDash] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [vectorFillColor, setVectorFillColor] = useState<string>('none');
  const [vectorIsClosed, setVectorIsClosed] = useState<boolean>(false);
  const [isGridSnap, setIsGridSnap] = useState<boolean>(false);
  const [isOrtho, setIsOrtho] = useState<boolean>(false);
  const [inProgressNodes, setInProgressNodes] = useState<VectorNode[]>([]);
  const [selectedVectorPathId, setSelectedVectorPathId] = useState<string | null>(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);

  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<VectorText | null>(null);
  const [defaultFontFamily, setDefaultFontFamily] = useState<string>('Inter');
  const [isGoogleFontLibraryOpen, setIsGoogleFontLibraryOpen] = useState<boolean>(false);

  useEffect(() => {
    preloadProjectFonts();
  }, []);

  // Warn user before closing or reloading tab if any document has unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const anyModified = isModified || documents.some((d) => d.isModified);
      if (anyModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isModified, documents]);

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

  const historyStackRef = useRef<HistoryStep[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Capture snapshot of current layers
  const recordHistory = useCallback((markModified = true) => {
    if (markModified) setIsModified(true);
    const snapshot: HistoryStep = {
      activeLayerId,
      layersSnapshot: layers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        vectorStrokes: l.vectorStrokes ? JSON.parse(JSON.stringify(l.vectorStrokes)) : undefined,
        vectorTexts: l.vectorTexts ? JSON.parse(JSON.stringify(l.vectorTexts)) : undefined,
        vectorPaths: l.vectorPaths ? JSON.parse(JSON.stringify(l.vectorPaths)) : undefined,
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
      recordHistory(false);
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
        layer.vectorTexts = snap.vectorTexts ? JSON.parse(JSON.stringify(snap.vectorTexts)) : undefined;
        layer.vectorPaths = snap.vectorPaths ? JSON.parse(JSON.stringify(snap.vectorPaths)) : undefined;
        layer.visible = snap.visible;
        layer.locked = snap.locked;
        layer.opacity = snap.opacity;
        layer.blendMode = snap.blendMode;
        layer.ctx.putImageData(snap.imageData, 0, 0);
        if (layer.type === 'vector') {
          reRenderVectorLayer(layer);
        }
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

  const handleSelectTool = (tool: ToolType) => {
    if (tool === 'vector' || tool === 'text') {
      const activeLayer = layers.find((layer) => layer.id === activeLayerId);
      if (!activeLayer || activeLayer.type !== 'vector') handleAddVectorLayer();
    }
    setActiveTool(tool);
    if (tool !== 'text') setTextPlacement(null);
  };

  const ensureVectorLayer = (): Layer => {
    let layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.type !== 'vector') {
      const newId = `layer-vector-${Date.now()}`;
      const count = layers.filter((l) => l.type === 'vector').length + 1;
      const newLayer = createLayerObject(newId, `Vector Layer ${count}`, canvasWidth, canvasHeight, undefined, 'vector');
      layer = newLayer;
      setLayers((prev) => [...prev, newLayer]);
      setActiveLayerId(newId);
    }
    return layer;
  };

  const handleCommitVectorPath = (path: VectorPath) => {
    const vLayer = ensureVectorLayer();
    vLayer.vectorPaths = [...(vLayer.vectorPaths || []), path];
    reRenderVectorLayer(vLayer);
    updateLayerThumbnail(vLayer.id);
    setLayers([...layers]);
    setInProgressNodes([]);
    setSelectedVectorPathId(path.id);
    setSelectedNodeIndex(null);
    setTimeout(() => recordHistory(), 50);
  };

  const handleUpdateVectorPath = (pathId: string, updates: Partial<VectorPath>) => {
    for (const l of layers) {
      if (l.vectorPaths?.some((p) => p.id === pathId)) {
        l.vectorPaths = l.vectorPaths.map((p) => (p.id === pathId ? { ...p, ...updates } : p));
        reRenderVectorLayer(l);
        updateLayerThumbnail(l.id);
        setLayers([...layers]);
        recordHistory();
        break;
      }
    }
  };

  const handleDeleteVectorPath = (pathId: string) => {
    for (const l of layers) {
      if (l.vectorPaths?.some((p) => p.id === pathId)) {
        l.vectorPaths = l.vectorPaths.filter((p) => p.id !== pathId);
        reRenderVectorLayer(l);
        updateLayerThumbnail(l.id);
        setLayers([...layers]);
        if (selectedVectorPathId === pathId) {
          setSelectedVectorPathId(null);
          setSelectedNodeIndex(null);
        }
        recordHistory();
        break;
      }
    }
  };

  const handleFinishInProgressPath = () => {
    if (inProgressNodes.length < 2) return;
    const newPath: VectorPath = {
      id: `vpath_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nodes: inProgressNodes,
      closed: vectorIsClosed,
      strokeColor: vectorStrokeColor,
      strokeWidth: vectorStrokeWidth,
      strokeDash: vectorStrokeDash,
      fillColor: vectorFillColor,
    };
    handleCommitVectorPath(newPath);
  };

  const handleCancelInProgressPath = () => {
    setInProgressNodes([]);
  };

  const handleToggleNodeType = (targetType?: 'corner' | 'smooth') => {
    if (!selectedVectorPathId || selectedNodeIndex === null) return;
    for (const l of layers) {
      const path = l.vectorPaths?.find((p) => p.id === selectedVectorPathId);
      if (path && path.nodes[selectedNodeIndex]) {
        const node = path.nodes[selectedNodeIndex];
        const newType = targetType || (node.type === 'smooth' ? 'corner' : 'smooth');
        if (newType === 'corner') {
          node.type = 'corner';
          delete node.handleIn;
          delete node.handleOut;
        } else {
          node.type = 'smooth';
          if (!node.handleIn && !node.handleOut) {
            node.handleIn = { x: node.x - 25, y: node.y };
            node.handleOut = { x: node.x + 25, y: node.y };
          }
        }
        reRenderVectorLayer(l);
        updateLayerThumbnail(l.id);
        setLayers([...layers]);
        recordHistory();
        break;
      }
    }
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedVectorPathId || selectedNodeIndex === null) return;
    for (const l of layers) {
      const path = l.vectorPaths?.find((p) => p.id === selectedVectorPathId);
      if (path) {
        if (path.nodes.length <= 2) {
          handleDeleteVectorPath(selectedVectorPathId);
        } else {
          path.nodes.splice(selectedNodeIndex, 1);
          reRenderVectorLayer(l);
          updateLayerThumbnail(l.id);
          setLayers([...layers]);
          setSelectedNodeIndex(null);
          recordHistory();
        }
        break;
      }
    }
  };

  const handleSaveVectorText = (textSettings: Omit<VectorText, 'id' | 'x' | 'y'>, existingId?: string) => {
    const targetId = existingId || editingText?.id;
    if (targetId) {
      for (const l of layers) {
        const txt = l.vectorTexts?.find((t) => t.id === targetId);
        if (txt) {
          Object.assign(txt, textSettings);
          reRenderVectorLayer(l);
          updateLayerThumbnail(l.id);
          setLayers([...layers]);
          setEditingText(null);
          setTextPlacement(null);
          recordHistory();
          return;
        }
      }
    }

    const vLayer = ensureVectorLayer();
    const pos = textPlacement || { x: canvasWidth / 2, y: canvasHeight / 2 };
    const newText: VectorText = {
      ...textSettings,
      id: `vtext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x: pos.x,
      y: pos.y,
    };
    vLayer.vectorTexts = [...(vLayer.vectorTexts || []), newText];
    reRenderVectorLayer(vLayer);
    updateLayerThumbnail(vLayer.id);
    setLayers([...layers]);
    setTextPlacement(null);
    setEditingText(null);
    setSelectedTextId(newText.id);
    setActiveTool('text');
    setTimeout(() => recordHistory(), 50);
  };

  const handleDeleteVectorText = (textId?: string) => {
    const idToDelete = textId || selectedTextId || editingText?.id;
    if (!idToDelete) return;
    for (const l of layers) {
      if (l.vectorTexts?.some((t) => t.id === idToDelete)) {
        l.vectorTexts = l.vectorTexts.filter((t) => t.id !== idToDelete);
        reRenderVectorLayer(l);
        updateLayerThumbnail(l.id);
        setLayers([...layers]);
        if (selectedTextId === idToDelete) setSelectedTextId(null);
        if (editingText?.id === idToDelete) setEditingText(null);
        recordHistory();
        break;
      }
    }
  };

  const handleUpdateVectorText = (textId: string, updates: Partial<VectorText>) => {
    for (const l of layers) {
      if (l.vectorTexts?.some((t) => t.id === textId)) {
        l.vectorTexts = l.vectorTexts.map((t) => (t.id === textId ? { ...t, ...updates } : t));
        reRenderVectorLayer(l);
        updateLayerThumbnail(l.id);
        setLayers([...layers]);
        recordHistory();
        break;
      }
    }
  };

  const handleUpdateSelectedText = (updates: Partial<VectorText>) => {
    if (selectedTextId) {
      handleUpdateVectorText(selectedTextId, updates);
    }
  };

  const selectedPathObj = (() => {
    if (!selectedVectorPathId) return null;
    for (const l of layers) {
      const found = l.vectorPaths?.find((p) => p.id === selectedVectorPathId);
      if (found) return found;
    }
    return null;
  })();

  const selectedTextObj = (() => {
    if (!selectedTextId) return null;
    for (const l of layers) {
      const found = l.vectorTexts?.find((t) => t.id === selectedTextId);
      if (found) return found;
    }
    return null;
  })();

  const handleInsertVectorText = (textSettings: Omit<VectorText, 'id' | 'x' | 'y'>) => {
    handleSaveVectorText(textSettings);
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
    if (!layer || layer.type !== 'vector' || (!layer.vectorStrokes?.length && !layer.vectorTexts?.length && !layer.vectorPaths?.length)) return;

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

  // Helper to snapshot active document
  const getCurrentDocSnapshot = (): CanvasDocument => {
    return {
      id: activeDocId,
      name: canvasName,
      width: canvasWidth,
      height: canvasHeight,
      bgColor: canvasBgColor,
      isModified,
      layers: cloneLayers(layers),
      activeLayerId,
      transform,
      historyStack: historyStackRef.current,
      historyIndex: historyIndexRef.current,
      fileHandle: activeFileHandle,
    };
  };

  const handleSelectDocument = (targetDocId: string) => {
    if (targetDocId === activeDocId) return;

    // Snapshot currently active document
    const currentSnapshot = getCurrentDocSnapshot();

    const targetDoc = documents.find((d) => d.id === targetDocId);
    if (!targetDoc) return;

    // Update documents list with current snapshot
    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDocId ? currentSnapshot : d))
    );

    // Switch to target document
    setActiveDocId(targetDoc.id);
    setCanvasWidth(targetDoc.width);
    setCanvasHeight(targetDoc.height);
    setCanvasBgColor(targetDoc.bgColor);
    setCanvasName(targetDoc.name);
    setIsModified(targetDoc.isModified);
    setActiveFileHandle(targetDoc.fileHandle);
    const activatedLayers = cloneLayers(targetDoc.layers);
    setLayers(activatedLayers);
    setActiveLayerId(targetDoc.activeLayerId);
    setTransform(targetDoc.transform);
    historyStackRef.current = targetDoc.historyStack;
    historyIndexRef.current = targetDoc.historyIndex;
    setCanUndo(targetDoc.historyIndex > 0);
    setCanRedo(
      targetDoc.historyIndex >= 0 &&
      targetDoc.historyIndex < targetDoc.historyStack.length - 1
    );

    setTimeout(() => {
      updateLayerThumbnail(targetDoc.activeLayerId);
    }, 50);
  };

  const serializeDocToJson = (
    docName: string,
    width: number,
    height: number,
    bgColor: string,
    docLayers: Layer[]
  ): string => {
    const projectData = {
      name: docName,
      width,
      height,
      bgColor,
      layers: docLayers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        vectorStrokes: l.vectorStrokes,
        vectorTexts: l.vectorTexts,
        vectorPaths: l.vectorPaths,
        dataUrl: l.canvas.toDataURL(),
      })),
    };
    return JSON.stringify(projectData, null, 2);
  };

  const handleSaveToTsg = async (): Promise<string | null> => {
    if (!isTsgStudio || studioPermission === 'viewer' || studioBusy) return null;
    setStudioBusy(true);
    setStudioNotice('Saving drawing…');
    try {
      const payload = {
        name: canvasName.replace(/\.[^/.]+$/, '').slice(0, 150) || 'Untitled drawing',
        document: JSON.parse(serializeDocToJson(canvasName, canvasWidth, canvasHeight, canvasBgColor, layers)),
        version: studioVersion,
      };
      const endpoint = studioProjectId
        ? `${studioApiBase}/projects/${studioProjectId}`
        : `${studioApiBase}/projects`;
      const response = await fetch(endpoint, {
        method: studioProjectId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': studioRoot?.dataset.csrfToken || '',
        },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The drawing could not be saved.');
      setStudioProjectId(String(result.id));
      setStudioVersion(Number(result.version));
      setIsModified(false);
      setStudioNotice('Saved to your TSG account.');
      if (!studioProjectId) window.history.replaceState({}, '', `/art-draw-studio/editor/${result.id}`);
      return String(result.id);
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : 'The drawing could not be saved.');
      return null;
    } finally {
      setStudioBusy(false);
    }
  };

  const handleShareFromTsg = async () => {
    if (studioPermission !== 'owner') return;
    let projectId = studioProjectId;
    if (!projectId) {
      projectId = await handleSaveToTsg() || '';
    }
    if (!projectId) return;
    setStudioBusy(true);
    try {
      const response = await fetch(`${studioApiBase}/projects/${projectId}/shares`, { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sharing details could not be loaded.');
      setStudioShares(result.shares || []);
      setStudioShareOpen(true);
      setStudioNotice('');
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : 'Sharing details could not be loaded.');
    } finally {
      setStudioBusy(false);
    }
  };

  const handleSubmitStudioShare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studioProjectId || !studioRecipient.trim() || studioBusy) return;
    setStudioBusy(true);
    setStudioNotice('Sharing drawing…');
    try {
      const response = await fetch(`${studioApiBase}/projects/${studioProjectId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': studioRoot?.dataset.csrfToken || '' },
        body: JSON.stringify({ recipient: studioRecipient.trim(), permission: studioSharePermission }),
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sharing could not be saved.');
      setStudioShares((previous) => [...previous.filter((share) => share.id !== result.share.id), result.share]);
      setStudioRecipient('');
      setStudioNotice(`Shared with ${result.share.username || result.share.email}.`);
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : 'Sharing could not be saved.');
    } finally {
      setStudioBusy(false);
    }
  };

  const handleRemoveStudioShare = async (shareId: number) => {
    if (!studioProjectId || studioBusy || !window.confirm('Remove this person’s access to the drawing?')) return;
    setStudioBusy(true);
    try {
      const response = await fetch(`${studioApiBase}/projects/${studioProjectId}/shares/${shareId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': studioRoot?.dataset.csrfToken || '' },
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Access could not be removed.');
      setStudioShares((previous) => previous.filter((share) => share.id !== shareId));
      setStudioNotice('Access removed.');
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : 'Access could not be removed.');
    } finally {
      setStudioBusy(false);
    }
  };

  const handleExportArtwork = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    layers.forEach((layer) => {
      if (layer.visible && layer.canvas && layer.name.toLowerCase() !== 'paper background') {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });
    const link = document.createElement('a');
    link.download = `${canvasName.replace(/\.[^/.]+$/, '')}-artwork.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleSendArtworkToDesigns = async () => {
    if (studioPermission === 'viewer' || studioBusy) return;
    let projectId = studioProjectId;
    if (!projectId) projectId = await handleSaveToTsg() || '';
    if (!projectId) return;
    const designName = window.prompt('Name this saved artwork:', canvasName.replace(/\.[^/.]+$/, ''));
    if (!designName?.trim()) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    layers.forEach((layer) => {
      if (layer.visible && layer.canvas && layer.name.toLowerCase() !== 'paper background') {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });
    const image = await new Promise<Blob | null>((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
    if (!image) {
      setStudioNotice('The artwork PNG could not be created.');
      return;
    }
    if (image.size > 20 * 1024 * 1024) {
      setStudioNotice('This artwork is larger than the 20 MB design upload limit.');
      return;
    }
    setStudioBusy(true);
    setStudioNotice('Saving artwork to Art Draw Studio…');
    try {
      const form = new FormData();
      form.append('project_id', projectId);
      form.append('name', designName.trim());
      form.append('canvas_file', image, `${designName.trim().replace(/[^a-z0-9_-]+/gi, '_')}.png`);
      const response = await fetch(`${studioApiBase}/drawings`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': studioRoot?.dataset.csrfToken || '' },
        body: form,
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The artwork could not be saved to Art Draw Studio.');
      setStudioDesignUrl(result.url || '/art-draw-studio/drawings');
      setStudioNotice(`Artwork saved to Art Draw Studio as “${result.name}”.`);
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : 'The artwork could not be saved to Art Draw Studio.');
    } finally {
      setStudioBusy(false);
    }
  };

  const handleSaveProject = async (forceSaveAs = false) => {
    const jsonString = serializeDocToJson(canvasName, canvasWidth, canvasHeight, canvasBgColor, layers);
    const result = await saveProjectWithPicker(jsonString, {
      handle: activeFileHandle,
      suggestedName: canvasName,
      forceSaveAs,
    });

    if (result.success) {
      setIsModified(false);
      if (result.handle) {
        setActiveFileHandle(result.handle);
      }
      const newName = result.fileName || canvasName;
      if (result.fileName) {
        setCanvasName(result.fileName);
      }
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === activeDocId
            ? {
                ...d,
                isModified: false,
                name: newName,
                fileHandle: result.handle || activeFileHandle,
              }
            : d
        )
      );
    }
  };

  const handleSaveProjectAs = () => {
    return handleSaveProject(true);
  };

  const handleOpenProject = async () => {
    if (isFileSystemAccessSupported()) {
      const result = await openProjectWithPicker();
      if (result) {
        handleLoadProject(result.file, result.handle);
      }
    }
  };

  const executeCloseDocument = (docIdToClose: string) => {
    if (docIdToClose === activeDocId) {
      const remaining = documents.filter((d) => d.id !== docIdToClose);
      if (remaining.length === 0) {
        // Closed the last document: create a fresh blank canvas
        const newDoc = createBlankDocument();
        setDocuments([newDoc]);
        setActiveDocId(newDoc.id);
        setCanvasWidth(newDoc.width);
        setCanvasHeight(newDoc.height);
        setCanvasBgColor(newDoc.bgColor);
        setCanvasName(newDoc.name);
        setIsModified(false);
        setActiveFileHandle(undefined);
        setLayers(newDoc.layers);
        setActiveLayerId(newDoc.activeLayerId);
        setTransform(newDoc.transform);
        historyStackRef.current = [];
        historyIndexRef.current = -1;
        setCanUndo(false);
        setCanRedo(false);
      } else {
        const currentIndex = documents.findIndex((d) => d.id === docIdToClose);
        const nextDoc = remaining[Math.max(0, currentIndex - 1)];
        setDocuments(remaining);
        setActiveDocId(nextDoc.id);
        setCanvasWidth(nextDoc.width);
        setCanvasHeight(nextDoc.height);
        setCanvasBgColor(nextDoc.bgColor);
        setCanvasName(nextDoc.name);
        setIsModified(nextDoc.isModified);
        setActiveFileHandle(nextDoc.fileHandle);
        const activatedLayers = cloneLayers(nextDoc.layers);
        setLayers(activatedLayers);
        setActiveLayerId(nextDoc.activeLayerId);
        setTransform(nextDoc.transform);
        historyStackRef.current = nextDoc.historyStack;
        historyIndexRef.current = nextDoc.historyIndex;
        setCanUndo(nextDoc.historyIndex > 0);
        setCanRedo(
          nextDoc.historyIndex >= 0 &&
          nextDoc.historyIndex < nextDoc.historyStack.length - 1
        );
      }
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== docIdToClose));
    }
  };

  const handleCloseDocument = (docIdToClose: string) => {
    const isTargetActive = docIdToClose === activeDocId;
    const targetDoc = isTargetActive ? null : documents.find((d) => d.id === docIdToClose);
    const targetName = isTargetActive ? canvasName : (targetDoc?.name || 'Untitled');
    const isTargetModified = isTargetActive ? isModified : (targetDoc?.isModified ?? false);

    if (isTargetModified) {
      setClosePromptTarget({
        docId: docIdToClose,
        fileName: targetName,
      });
      return;
    }

    executeCloseDocument(docIdToClose);
  };

  const handleSaveAndClose = async () => {
    if (!closePromptTarget) return;
    const { docId } = closePromptTarget;

    if (docId === activeDocId) {
      const jsonString = serializeDocToJson(canvasName, canvasWidth, canvasHeight, canvasBgColor, layers);
      const result = await saveProjectWithPicker(jsonString, {
        handle: activeFileHandle,
        suggestedName: canvasName,
        forceSaveAs: false,
      });
      if (result.cancelled) {
        return;
      }
      setIsModified(false);
    } else {
      const targetDoc = documents.find((d) => d.id === docId);
      if (targetDoc) {
        const jsonString = serializeDocToJson(
          targetDoc.name,
          targetDoc.width,
          targetDoc.height,
          targetDoc.bgColor,
          targetDoc.layers
        );
        const result = await saveProjectWithPicker(jsonString, {
          handle: targetDoc.fileHandle,
          suggestedName: targetDoc.name,
          forceSaveAs: false,
        });
        if (result.cancelled) {
          return;
        }
      }
    }

    setClosePromptTarget(null);
    executeCloseDocument(docId);
  };

  const handleDiscardAndClose = () => {
    if (!closePromptTarget) return;
    const docId = closePromptTarget.docId;
    setClosePromptTarget(null);
    executeCloseDocument(docId);
  };

  const handleCancelClosePrompt = () => {
    setClosePromptTarget(null);
  };

  const handleLoadProject = (file: File, handle?: FileSystemFileHandle, studioLoad = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.width && data.height && Array.isArray(data.layers)) {
          const currentSnapshot = getCurrentDocSnapshot();
          const newDocId = `doc-${Date.now()}`;

          const loadedLayers: Layer[] = data.layers.map((l: any, idx: number) => {
            const layerObj = createLayerObject(
              l.id || `layer-${newDocId}-${idx}`,
              l.name || `Layer ${idx + 1}`,
              data.width,
              data.height,
              undefined,
              l.type
            );
            layerObj.visible = l.visible !== undefined ? l.visible : true;
            layerObj.locked = l.locked !== undefined ? l.locked : false;
            layerObj.opacity = l.opacity !== undefined ? l.opacity : 1.0;
            layerObj.blendMode = l.blendMode || 'source-over';
            layerObj.vectorStrokes = l.vectorStrokes || (l.type === 'vector' ? [] : undefined);
            layerObj.vectorTexts = l.vectorTexts || (l.type === 'vector' ? [] : undefined);
            layerObj.vectorPaths = l.vectorPaths || (l.type === 'vector' ? [] : undefined);

            if (l.dataUrl) {
              const img = new Image();
              img.onload = () => {
                layerObj.ctx.drawImage(img, 0, 0);
                if (idx === data.layers.length - 1) {
                  updateLayerThumbnail(layerObj.id);
                }
              };
              img.src = l.dataUrl;
            }

            if (l.type === 'vector' && (l.vectorStrokes || l.vectorTexts || l.vectorPaths)) {
              reRenderVectorLayer(layerObj);
            }
            return layerObj;
          });

          const newDoc: CanvasDocument = {
            id: newDocId,
            name: data.name || file.name,
            width: data.width,
            height: data.height,
            bgColor: data.bgColor || '#ffffff',
            isModified: false,
            layers: cloneLayers(loadedLayers),
            activeLayerId: loadedLayers[loadedLayers.length - 1]?.id || '',
            transform: {
              x: 0,
              y: 0,
              zoom: 0.85,
              rotation: 0,
              flipH: false,
            },
            historyStack: [],
            historyIndex: -1,
            fileHandle: handle,
          };

          setDocuments((prev) => {
            const updated = prev.map((d) => (d.id === activeDocId ? currentSnapshot : d));
            return [...updated, newDoc];
          });

          setActiveDocId(newDocId);
          setCanvasWidth(data.width);
          setCanvasHeight(data.height);
          setCanvasBgColor(data.bgColor || '#ffffff');
          setCanvasName(data.name || file.name);
          setIsModified(false);
          setActiveFileHandle(handle);
          setLayers(loadedLayers);
          setActiveLayerId(loadedLayers[loadedLayers.length - 1]?.id || '');
          historyStackRef.current = [];
          historyIndexRef.current = -1;
          setCanUndo(false);
          setCanRedo(false);
          handleFitScreen();
          if (studioLoad) setStudioBusy(false);

        }
      } catch (err) {
        console.error('Failed to load project file', err);
        if (studioLoad) {
          setStudioNotice('This drawing file could not be read.');
          setStudioBusy(false);
        }
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!isTsgStudio || !studioProjectId) return;
    let cancelled = false;
    fetch(`${studioApiBase}/projects/${studioProjectId}`, { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'This drawing could not be loaded.');
        if (cancelled) return;
        setStudioVersion(Number(result.version));
        handleLoadProject(new File([result.document], `${result.name || 'Drawing'}.json`, { type: 'application/json' }), undefined, true);
      })
      .catch((error) => {
        if (!cancelled) {
          setStudioNotice(error instanceof Error ? error.message : 'This drawing could not be loaded.');
          setStudioBusy(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

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
    // 1. Snapshot the current document so its state & drawings are preserved in its tab
    const currentSnapshot = getCurrentDocSnapshot();

    // 2. Create the new document
    const newDocId = `doc-${Date.now()}`;
    const bgLayer = createLayerObject(`layer-bg-${newDocId}`, 'Paper Background', width, height, bgColor);
    const drawLayer = createLayerObject(`layer-1-${newDocId}`, 'Layer 1', width, height);
    const newLayers = [bgLayer, drawLayer];
    const newTransform: CanvasTransform = {
      x: 0,
      y: 0,
      zoom: 0.85,
      rotation: 0,
      flipH: false,
    };

    const newDoc: CanvasDocument = {
      id: newDocId,
      name,
      width,
      height,
      bgColor,
      isModified: false,
      layers: cloneLayers(newLayers),
      activeLayerId: drawLayer.id,
      transform: newTransform,
      historyStack: [],
      historyIndex: -1,
    };

    // 3. Update documents list: keep previous document and add new document
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === activeDocId ? currentSnapshot : d));
      return [...updated, newDoc];
    });

    // 4. Activate new document
    setActiveDocId(newDocId);
    setCanvasWidth(width);
    setCanvasHeight(height);
    setCanvasBgColor(bgColor);
    setCanvasName(name);
    setIsModified(false);
    setActiveFileHandle(undefined);
    setLayers(newLayers);
    setActiveLayerId(drawLayer.id);
    setTransform(newTransform);
    historyStackRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
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
        if (e.shiftKey) {
          handleSaveProjectAs();
        } else {
          handleSaveProject(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenProject();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewCanvasModalOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseDocument(activeDocId);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Shift') {
        setIsOrtho(true);
      }

      if (e.key === 'Enter' && activeTool === 'vector' && inProgressNodes.length >= 2) {
        e.preventDefault();
        handleFinishInProgressPath();
        return;
      }

      if (e.key === 'Escape') {
        if (inProgressNodes.length > 0) {
          handleCancelInProgressPath();
          return;
        }
        if (selectedVectorPathId) {
          setSelectedVectorPathId(null);
          setSelectedNodeIndex(null);
          return;
        }
        if (selectedTextId) {
          setSelectedTextId(null);
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextId) {
          e.preventDefault();
          handleDeleteVectorText(selectedTextId);
          return;
        }
        if (selectedVectorPathId) {
          e.preventDefault();
          if (selectedNodeIndex !== null) {
            handleDeleteSelectedNode();
          } else {
            handleDeleteVectorPath(selectedVectorPathId);
          }
          return;
        }
        handleClearActiveLayer();
        return;
      }

      // Tool hotkeys
      switch (e.key.toLowerCase()) {
        case 'b':
          if (activeTool === 'brush') {
            setIsDesktopBrushMenuOpen((prev) => !prev);
          } else {
            handleSelectTool('brush');
          }
          break;
        case 'p':
          handleSelectTool('brush');
          break;
        case 'v':
          handleSelectTool('vector');
          break;
        case 't':
          handleSelectTool('text');
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
      if (e.key === 'Shift') {
        setIsOrtho(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    layers,
    activeLayerId,
    activeDocId,
    documents,
    canvasName,
    canvasWidth,
    canvasHeight,
    canvasBgColor,
    isModified,
    transform,
    activeTool,
    handleSelectTool,
    inProgressNodes,
    selectedVectorPathId,
    selectedNodeIndex,
    selectedTextId,
    vectorIsClosed,
    vectorStrokeColor,
    vectorStrokeWidth,
    vectorStrokeDash,
    vectorFillColor,
  ]);

  // Dynamic Tabs List
  const tabs = documents.map((doc) => {
    if (doc.id === activeDocId) {
      return {
        id: doc.id,
        name: canvasName,
        isModified: isModified,
        zoom: transform.zoom,
      };
    }
    return {
      id: doc.id,
      name: doc.name,
      isModified: doc.isModified,
      zoom: doc.transform.zoom,
    };
  });

  return (
    <div
      id="art-draw-studio-app"
      className="h-screen w-screen flex flex-col bg-[#121212] text-[#d1d1d1] font-sans overflow-hidden select-none"
    >
      {isTsgStudio && (
        <div className="fixed top-2 right-2 z-[100] max-w-[calc(100vw-1rem)] flex flex-wrap items-center justify-end gap-2 rounded-lg border border-white/10 bg-[#202020]/95 p-2 shadow-xl backdrop-blur">
          <a href="/art-draw-studio" className="rounded border border-white/20 px-2 py-1 text-xs text-white no-underline hover:bg-white/10">My drawings</a>
          {studioPermission !== 'viewer' && (
            <button type="button" onClick={handleSaveToTsg} disabled={studioBusy} className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
              {studioBusy ? 'Saving…' : studioProjectId ? 'Save to TSG' : 'Save drawing'}
            </button>
          )}
          {studioPermission === 'owner' && (
            <button type="button" onClick={handleShareFromTsg} disabled={studioBusy} className="rounded border border-white/30 px-2 py-1 text-xs text-white disabled:opacity-50">Share</button>
          )}
          <button type="button" onClick={handleExportArtwork} className="rounded border border-emerald-400/50 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-400/10">Export artwork PNG</button>
          {studioPermission !== 'viewer' && (
            <button type="button" onClick={handleSendArtworkToDesigns} disabled={studioBusy} className="rounded border border-purple-400/50 px-2 py-1 text-xs text-purple-200 disabled:opacity-50">Save artwork</button>
          )}
          {studioPermission === 'viewer' && <span className="text-xs text-amber-200">View only</span>}
          {studioNotice && <span role="status" aria-live="polite" className="w-full text-right text-xs text-white/80">{studioNotice}</span>}
          {studioDesignUrl && <a href={studioDesignUrl} className="w-full text-right text-xs text-emerald-200 underline">View saved artwork</a>}
          {studioShareOpen && (
            <section className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-white/15 bg-[#202020] p-3 text-white shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-sm">Share drawing</strong>
                <button type="button" onClick={() => setStudioShareOpen(false)} className="px-2 text-white/70 hover:text-white" aria-label="Close sharing panel">×</button>
              </div>
              <form onSubmit={handleSubmitStudioShare} className="flex flex-col gap-2">
                <input value={studioRecipient} onChange={(event) => setStudioRecipient(event.target.value)} placeholder="Account email or username" className="rounded border border-white/20 bg-[#121212] px-2 py-1.5 text-xs text-white" />
                <div className="flex gap-2">
                  <select value={studioSharePermission} onChange={(event) => setStudioSharePermission(event.target.value as 'viewer' | 'editor')} className="min-w-0 flex-1 rounded border border-white/20 bg-[#121212] px-2 py-1.5 text-xs text-white">
                    <option value="viewer">Can view</option>
                    <option value="editor">Can edit</option>
                  </select>
                  <button type="submit" disabled={studioBusy || !studioRecipient.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Share</button>
                </div>
              </form>
              <div className="mt-3 border-t border-white/10 pt-2">
                <div className="mb-1 text-xs font-semibold text-white/70">People with access</div>
                {studioShares.length === 0 ? <p className="text-xs text-white/50">No one else has access yet.</p> : studioShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-2 py-1 text-xs">
                    <span className="min-w-0 truncate">{share.username || share.email} · {share.permission}</span>
                    <button type="button" onClick={() => handleRemoveStudioShare(share.id)} disabled={studioBusy} className="shrink-0 text-red-300 hover:text-red-200">Remove</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
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
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#1a1a1a]">
            {activeTool === 'vector' && (
              <VectorCadBar
                mode={vectorCadMode}
                onSetMode={setVectorCadMode}
                strokeColor={vectorStrokeColor}
                onChangeStrokeColor={setVectorStrokeColor}
                strokeWidth={vectorStrokeWidth}
                onChangeStrokeWidth={setVectorStrokeWidth}
                strokeDash={vectorStrokeDash}
                onChangeStrokeDash={setVectorStrokeDash}
                fillColor={vectorFillColor}
                onChangeFillColor={setVectorFillColor}
                isClosed={vectorIsClosed}
                onToggleClosed={() => setVectorIsClosed((prev) => !prev)}
                inProgressNodeCount={inProgressNodes.length}
                onFinishPath={handleFinishInProgressPath}
                onCancelPath={handleCancelInProgressPath}
                selectedPath={selectedPathObj}
                selectedNodeIndex={selectedNodeIndex}
                onDeleteSelectedPath={() => selectedVectorPathId && handleDeleteVectorPath(selectedVectorPathId)}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onToggleNodeType={handleToggleNodeType}
                isGridSnap={isGridSnap}
                onToggleGridSnap={() => setIsGridSnap((prev) => !prev)}
                isOrtho={isOrtho}
                onToggleOrtho={() => setIsOrtho((prev) => !prev)}
              />
            )}

            {(activeTool === 'text' || selectedTextId !== null) && (
              <TextQuickBar
                selectedText={selectedTextObj}
                onUpdateSelectedText={handleUpdateSelectedText}
                onDeleteSelectedText={() => handleDeleteVectorText()}
                onOpenGoogleFontLibrary={() => setIsGoogleFontLibraryOpen(true)}
                onOpenTextDialogForNew={() => setTextPlacement({ x: canvasWidth / 2, y: canvasHeight / 2 })}
                defaultFontFamily={defaultFontFamily}
                onSetDefaultFontFamily={setDefaultFontFamily}
                primaryColor={primaryColor}
              />
            )}

            <div className="flex-1 relative overflow-hidden">
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
                onTextPlace={setTextPlacement}
                onStrokeEnd={recordHistory}
                onCursorMove={(pos, pressure) => {
                  setCursorPos(pos);
                  setCurrentPressure(pressure);
                }}
                onStylusUpdate={setStylusState}
                isSpacePressed={isSpacePressed}
                touchSettings={touchSettings}
                // Vector CAD Props
                vectorCadMode={vectorCadMode}
                vectorStrokeColor={vectorStrokeColor}
                vectorStrokeWidth={vectorStrokeWidth}
                vectorStrokeDash={vectorStrokeDash}
                vectorFillColor={vectorFillColor}
                vectorIsClosed={vectorIsClosed}
                isGridSnap={isGridSnap}
                isOrtho={isOrtho}
                inProgressNodes={inProgressNodes}
                onInProgressNodesChange={setInProgressNodes}
                onCommitVectorPath={handleCommitVectorPath}
                onUpdateVectorPath={handleUpdateVectorPath}
                onDeleteVectorPath={handleDeleteVectorPath}
                selectedVectorPathId={selectedVectorPathId}
                onSelectVectorPath={setSelectedVectorPathId}
                selectedNodeIndex={selectedNodeIndex}
                onSelectNodeIndex={setSelectedNodeIndex}
                // Typography Props
                selectedTextId={selectedTextId}
                onSelectVectorText={setSelectedTextId}
                onEditVectorText={(text) => setEditingText(text)}
                onDeleteVectorText={handleDeleteVectorText}
                onUpdateVectorText={(textId, updates) => handleUpdateVectorText(textId, updates)}
              />
            </div>
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
            onSelectTool={handleSelectTool}
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
            onSaveProjectAs={handleSaveProjectAs}
            onLoadProject={handleLoadProject}
            onOpenProjectPicker={handleOpenProject}
            onImportImage={handleImportImage}
            onExportPng={handleExportPng}
            onExportJpg={handleExportJpg}
            onFitScreen={handleFitScreen}
            onSwitchToDesktop={() => setLayoutMode('desktop')}
            canvasName={canvasName}
            tabs={tabs}
            activeTabId={activeDocId}
            onSelectTab={handleSelectDocument}
            onCloseTab={handleCloseDocument}
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
            onCloseCanvas={() => handleCloseDocument(activeDocId)}
            onExportPng={handleExportPng}
            onExportJpg={handleExportJpg}
            onSaveProject={handleSaveProject}
            onSaveProjectAs={handleSaveProjectAs}
            onLoadProject={handleLoadProject}
            onOpenProjectPicker={handleOpenProject}
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
              onSelectTool={handleSelectTool}
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
                tabs={tabs}
                activeTabId={activeDocId}
                onSelectTab={handleSelectDocument}
                onCloseTab={handleCloseDocument}
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

              {activeTool === 'vector' && (
                <VectorCadBar
                  mode={vectorCadMode}
                  onSetMode={setVectorCadMode}
                  strokeColor={vectorStrokeColor}
                  onChangeStrokeColor={setVectorStrokeColor}
                  strokeWidth={vectorStrokeWidth}
                  onChangeStrokeWidth={setVectorStrokeWidth}
                  strokeDash={vectorStrokeDash}
                  onChangeStrokeDash={setVectorStrokeDash}
                  fillColor={vectorFillColor}
                  onChangeFillColor={setVectorFillColor}
                  isClosed={vectorIsClosed}
                  onToggleClosed={() => setVectorIsClosed((prev) => !prev)}
                  inProgressNodeCount={inProgressNodes.length}
                  onFinishPath={handleFinishInProgressPath}
                  onCancelPath={handleCancelInProgressPath}
                  selectedPath={selectedPathObj}
                  selectedNodeIndex={selectedNodeIndex}
                  onDeleteSelectedPath={() => selectedVectorPathId && handleDeleteVectorPath(selectedVectorPathId)}
                  onDeleteSelectedNode={handleDeleteSelectedNode}
                  onToggleNodeType={handleToggleNodeType}
                  isGridSnap={isGridSnap}
                  onToggleGridSnap={() => setIsGridSnap((prev) => !prev)}
                  isOrtho={isOrtho}
                  onToggleOrtho={() => setIsOrtho((prev) => !prev)}
                />
              )}

              {(activeTool === 'text' || selectedTextId !== null) && (
                <TextQuickBar
                  selectedText={selectedTextObj}
                  onUpdateSelectedText={handleUpdateSelectedText}
                  onDeleteSelectedText={() => handleDeleteVectorText()}
                  onOpenGoogleFontLibrary={() => setIsGoogleFontLibraryOpen(true)}
                  onOpenTextDialogForNew={() => setTextPlacement({ x: canvasWidth / 2, y: canvasHeight / 2 })}
                  defaultFontFamily={defaultFontFamily}
                  onSetDefaultFontFamily={setDefaultFontFamily}
                  primaryColor={primaryColor}
                />
              )}

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
                onTextPlace={setTextPlacement}
                onStrokeEnd={recordHistory}
                onCursorMove={(pos, pressure) => {
                  setCursorPos(pos);
                  setCurrentPressure(pressure);
                }}
                onStylusUpdate={setStylusState}
                isSpacePressed={isSpacePressed}
                touchSettings={touchSettings}
                // Vector CAD Props
                vectorCadMode={vectorCadMode}
                vectorStrokeColor={vectorStrokeColor}
                vectorStrokeWidth={vectorStrokeWidth}
                vectorStrokeDash={vectorStrokeDash}
                vectorFillColor={vectorFillColor}
                vectorIsClosed={vectorIsClosed}
                isGridSnap={isGridSnap}
                isOrtho={isOrtho}
                inProgressNodes={inProgressNodes}
                onInProgressNodesChange={setInProgressNodes}
                onCommitVectorPath={handleCommitVectorPath}
                onUpdateVectorPath={handleUpdateVectorPath}
                onDeleteVectorPath={handleDeleteVectorPath}
                selectedVectorPathId={selectedVectorPathId}
                onSelectVectorPath={setSelectedVectorPathId}
                selectedNodeIndex={selectedNodeIndex}
                onSelectNodeIndex={setSelectedNodeIndex}
                // Typography Props
                selectedTextId={selectedTextId}
                onSelectVectorText={setSelectedTextId}
                onEditVectorText={(text) => setEditingText(text)}
                onDeleteVectorText={handleDeleteVectorText}
                onUpdateVectorText={(textId, updates) => handleUpdateVectorText(textId, updates)}
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
            onOpenStylusSettings={() => setIsTouchCalibModalOpen(true)}
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

      {/* 8. Save Prompt Modal on Document Close */}
      <SavePromptModal
        isOpen={closePromptTarget !== null}
        fileName={closePromptTarget?.fileName || ''}
        onSaveAndClose={handleSaveAndClose}
        onDiscardAndClose={handleDiscardAndClose}
        onCancel={handleCancelClosePrompt}
      />

      {/* 9. Text Tool Dialog for Add / Edit */}
      {(textPlacement || editingText) && (
        <TextToolDialog
          initialText={editingText}
          onSave={handleSaveVectorText}
          onDelete={handleDeleteVectorText}
          onClose={() => {
            setTextPlacement(null);
            setEditingText(null);
          }}
          onOpenGoogleFontLibrary={() => setIsGoogleFontLibraryOpen(true)}
        />
      )}

      {/* 10. Google Font Library Modal */}
      <GoogleFontLibraryModal
        isOpen={isGoogleFontLibraryOpen}
        onClose={() => setIsGoogleFontLibraryOpen(false)}
        onSelectFont={(font) => {
          setDefaultFontFamily(font);
          if (selectedTextId) {
            handleUpdateSelectedText({ fontFamily: font });
          }
        }}
        activeFont={selectedTextObj?.fontFamily || defaultFontFamily}
      />
    </div>
  );
}
