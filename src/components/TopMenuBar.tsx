import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FlipHorizontal,
  RotateCw,
  Download,
  Upload,
  FolderOpen,
  FilePlus,
  Trash2,
  Layers,
  Sparkles,
  PenTool,
  X,
  Save,
} from 'lucide-react';

interface TopMenuBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNewCanvas: () => void;
  onExportPng: () => void;
  onExportJpg: () => void;
  onSaveProject: () => void;
  onSaveProjectAs?: () => void;
  onLoadProject: (file: File) => void;
  onOpenProjectPicker?: () => void;
  onImportImage: (file: File) => void;
  onClearActiveLayer: () => void;
  onFlipCanvasH: () => void;
  onRotateCanvas90: () => void;
  onResetView: () => void;
  onAddLayer: () => void;
  onApplyFilter: (filterType: 'invert' | 'grayscale' | 'manga_tone' | 'blur') => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onOpenBrushMenu?: () => void;
  onCloseCanvas?: () => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNewCanvas,
  onExportPng,
  onExportJpg,
  onSaveProject,
  onSaveProjectAs,
  onLoadProject,
  onOpenProjectPicker,
  onImportImage,
  onClearActiveLayer,
  onFlipCanvasH,
  onRotateCanvas90,
  onResetView,
  onAddLayer,
  onApplyFilter,
  onSelectAll,
  onDeselect,
  onOpenBrushMenu,
  onCloseCanvas,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
      e.target.value = '';
    }
    setActiveMenu(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportImage(file);
      e.target.value = '';
    }
    setActiveMenu(null);
  };

  return (
    <header
      id="top-menu-bar"
      ref={menuContainerRef}
      className="h-8 bg-[#2d2d2d] border-b border-black flex items-center px-3 gap-5 text-[11px] font-medium select-none z-30 relative"
    >
      {/* Hidden file inputs */}
      <input
        ref={projectInputRef}
        type="file"
        accept=".ads.json,.json,application/json"
        className="hidden"
        onChange={handleProjectFileChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <div className="flex gap-4 items-center">
        <span className="text-white font-bold tracking-wider flex items-center gap-1.5 cursor-pointer">
          <span className="w-3.5 h-3.5 bg-[#4a90e2] rounded flex items-center justify-center text-[9px] text-white font-extrabold">
            A
          </span>
          ART DRAW STUDIO
        </span>

        {/* Menu Dropdowns */}
        {/* FILE */}
        <div className="relative">
          <button
            id="menu-file-btn"
            onClick={() => handleFileClick('file')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'file' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-7 left-0 w-52 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                onClick={() => { onNewCanvas(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><FilePlus size={13} /> New Canvas...</span>
                <span className="text-[9px] text-gray-400">Ctrl+N</span>
              </button>
              <button
                onClick={() => { imageInputRef.current?.click(); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><FolderOpen size={13} /> Import Image to Layer...</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button
                onClick={() => { onSaveProject(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Save size={13} /> Save Project (.ads)...</span>
                <span className="text-[9px] text-gray-400">Ctrl+S</span>
              </button>
              {onSaveProjectAs && (
                <button
                  onClick={() => { onSaveProjectAs(); setActiveMenu(null); }}
                  className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Download size={13} /> Save Project As...</span>
                  <span className="text-[9px] text-gray-400">Ctrl+Shift+S</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (onOpenProjectPicker) {
                    onOpenProjectPicker();
                  } else {
                    projectInputRef.current?.click();
                  }
                  setActiveMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Upload size={13} /> Open Project (.ads)...</span>
                <span className="text-[9px] text-gray-400">Ctrl+O</span>
              </button>
              {onCloseCanvas && (
                <button
                  onClick={() => { onCloseCanvas(); setActiveMenu(null); }}
                  className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><X size={13} /> Close Canvas</span>
                  <span className="text-[9px] text-gray-400">Ctrl+W</span>
                </button>
              )}
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button
                onClick={() => { onExportPng(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span>Export PNG (Transparent)</span>
              </button>
              <button
                onClick={() => { onExportJpg(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span>Export JPEG (Flattened)</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT */}
        <div className="relative">
          <button
            id="menu-edit-btn"
            onClick={() => handleFileClick('edit')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'edit' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute top-7 left-0 w-44 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                disabled={!canUndo}
                onClick={() => { onUndo(); setActiveMenu(null); }}
                className={`px-3 py-1.5 text-left flex items-center justify-between ${canUndo ? 'hover:bg-[#4a90e2] hover:text-white' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span>Undo</span>
                <span className="text-[9px] text-gray-400">Ctrl+Z</span>
              </button>
              <button
                disabled={!canRedo}
                onClick={() => { onRedo(); setActiveMenu(null); }}
                className={`px-3 py-1.5 text-left flex items-center justify-between ${canRedo ? 'hover:bg-[#4a90e2] hover:text-white' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span>Redo</span>
                <span className="text-[9px] text-gray-400">Ctrl+Y</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button
                onClick={() => { onClearActiveLayer(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between text-red-300"
              >
                <span className="flex items-center gap-1.5"><Trash2 size={12} /> Clear Layer</span>
                <span className="text-[9px] text-gray-400">Del</span>
              </button>
            </div>
          )}
        </div>

        {/* LAYER */}
        <div className="relative">
          <button
            id="menu-layer-btn"
            onClick={() => handleFileClick('layer')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'layer' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            Layer
          </button>
          {activeMenu === 'layer' && (
            <div className="absolute top-7 left-0 w-48 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                onClick={() => { onAddLayer(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2"
              >
                <Layers size={13} /> New Raster Layer
              </button>
              <button
                onClick={() => { onClearActiveLayer(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2 text-red-300"
              >
                <Trash2 size={13} /> Clear Layer Content
              </button>
            </div>
          )}
        </div>

        {/* SELECTION */}
        <div className="relative">
          <button
            id="menu-selection-btn"
            onClick={() => handleFileClick('selection')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'selection' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            Selection
          </button>
          {activeMenu === 'selection' && (
            <div className="absolute top-7 left-0 w-40 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                onClick={() => { onSelectAll(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span>Select All</span>
                <span className="text-[9px] text-gray-400">Ctrl+A</span>
              </button>
              <button
                onClick={() => { onDeselect(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
              >
                <span>Deselect</span>
                <span className="text-[9px] text-gray-400">Ctrl+D</span>
              </button>
            </div>
          )}
        </div>

        {/* FILTER */}
        <div className="relative">
          <button
            id="menu-filter-btn"
            onClick={() => handleFileClick('filter')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'filter' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            Filter
          </button>
          {activeMenu === 'filter' && (
            <div className="absolute top-7 left-0 w-48 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                onClick={() => { onApplyFilter('manga_tone'); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2 text-yellow-300"
              >
                <Sparkles size={13} /> Manga Screentone / B&W
              </button>
              <button
                onClick={() => { onApplyFilter('invert'); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white"
              >
                Invert Colors
              </button>
              <button
                onClick={() => { onApplyFilter('grayscale'); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white"
              >
                Convert to Grayscale
              </button>
              <button
                onClick={() => { onApplyFilter('blur'); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white"
              >
                Soft Gaussian Blur
              </button>
            </div>
          )}
        </div>

        {/* VIEW */}
        <div className="relative">
          <button
            id="menu-view-btn"
            onClick={() => handleFileClick('view')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'view' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute top-7 left-0 w-44 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              <button
                onClick={() => { onResetView(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2"
              >
                <Maximize2 size={13} /> Reset Zoom & Pan
              </button>
              <button
                onClick={() => { onFlipCanvasH(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2"
              >
                <FlipHorizontal size={13} /> Flip Canvas Horizontal
              </button>
              <button
                onClick={() => { onRotateCanvas90(); setActiveMenu(null); }}
                className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center gap-2"
              >
                <RotateCw size={13} /> Rotate 90° Clockwise
              </button>
            </div>
          )}
        </div>

        {/* WINDOW */}
        <div className="relative">
          <button
            id="menu-window-btn"
            onClick={() => handleFileClick('window')}
            className={`px-2 py-0.5 rounded ${activeMenu === 'window' ? 'bg-[#3d3d3d] text-white' : 'text-[#d1d1d1] hover:text-white'}`}
          >
            Window
          </button>
          {activeMenu === 'window' && (
            <div className="absolute top-7 left-0 w-56 bg-[#252525] border border-black shadow-2xl py-1 text-[11px] text-[#d1d1d1] rounded z-50 flex flex-col">
              {onOpenBrushMenu && (
                <button
                  onClick={() => { onOpenBrushMenu(); setActiveMenu(null); }}
                  className="px-3 py-1.5 text-left hover:bg-[#4a90e2] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-blue-400">
                    <PenTool size={13} /> Sub Tool [Brush Selection]
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">B</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Quick Access Action Icons on Menu Bar */}
      <div className="flex items-center gap-1.5 text-gray-300">
        <button
          id="btn-quick-undo"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={onUndo}
          className={`p-1 rounded hover:bg-[#3d3d3d] ${canUndo ? 'hover:text-white' : 'opacity-30 cursor-not-allowed'}`}
        >
          <Undo2 size={14} />
        </button>
        <button
          id="btn-quick-redo"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={onRedo}
          className={`p-1 rounded hover:bg-[#3d3d3d] ${canRedo ? 'hover:text-white' : 'opacity-30 cursor-not-allowed'}`}
        >
          <Redo2 size={14} />
        </button>
        <div className="w-[1px] h-3.5 bg-gray-600 mx-1" />
        <button
          id="btn-quick-fliph"
          title="Flip Horizontal (H-Mirror)"
          onClick={onFlipCanvasH}
          className="p-1 rounded hover:bg-[#3d3d3d] hover:text-white"
        >
          <FlipHorizontal size={14} />
        </button>
        <button
          id="btn-quick-rotate"
          title="Rotate Canvas 90°"
          onClick={onRotateCanvas90}
          className="p-1 rounded hover:bg-[#3d3d3d] hover:text-white"
        >
          <RotateCw size={14} />
        </button>
        <button
          id="btn-quick-reset-view"
          title="Fit to Screen (100%)"
          onClick={onResetView}
          className="p-1 rounded hover:bg-[#3d3d3d] hover:text-white"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Mac Traffic Lights */}
      <div className="flex gap-2 items-center pl-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
      </div>
    </header>
  );
};
