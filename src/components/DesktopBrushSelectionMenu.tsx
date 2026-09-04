import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Paintbrush,
  PenTool,
  Search,
  X,
  Pin,
  PinOff,
  Palette,
  Sliders,
  Check,
  Move,
  LayoutGrid,
  List,
  Sparkles,
  Droplets,
  RotateCcw,
} from 'lucide-react';
import { BrushSettings, BrushTipShape } from '../types';
import { DEFAULT_BRUSH_PRESETS } from '../utils/brushPresets';
import { BrushStrokePreview } from './BrushStrokePreview';

interface DesktopBrushSelectionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeBrush: BrushSettings;
  onSelectBrush: (brush: BrushSettings) => void;
  primaryColor: string;
  onUpdateBrushSize?: (size: number) => void;
  onOpenSettingsPanel?: () => void;
}

type BrushCategory = 'all' | 'watercolor' | 'ink' | 'paint' | 'pencil' | 'airbrush' | 'marker';

export const DesktopBrushSelectionMenu: React.FC<DesktopBrushSelectionMenuProps> = ({
  isOpen,
  onClose,
  activeBrush,
  onSelectBrush,
  primaryColor,
  onUpdateBrushSize,
  onOpenSettingsPanel,
}) => {
  const [activeCategory, setActiveCategory] = useState<BrushCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [previewColorMode, setPreviewColorMode] = useState<'white' | 'color'>('white');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Draggable floating window position
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 56, y: 52 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 56,
    posY: 52,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Window drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    // Only drag from header, ignore buttons inside
    if ((e.target as HTMLElement).closest('button, input')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 360, dragStartRef.current.posX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.posY + dy)),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Categories list with human-friendly labels & icons
  const categories: { id: BrushCategory; label: string; count: number }[] = useMemo(() => {
    const counts: Record<string, number> = {
      all: DEFAULT_BRUSH_PRESETS.length,
      watercolor: 0,
      ink: 0,
      paint: 0,
      pencil: 0,
      airbrush: 0,
      marker: 0,
    };
    DEFAULT_BRUSH_PRESETS.forEach((b) => {
      if (counts[b.category] !== undefined) {
        counts[b.category]++;
      }
    });

    return [
      { id: 'all', label: 'All Brushes', count: counts.all },
      { id: 'watercolor', label: 'Watercolor', count: counts.watercolor },
      { id: 'ink', label: 'India Ink & Pens', count: counts.ink },
      { id: 'paint', label: 'Thick Paint & Oils', count: counts.paint },
      { id: 'pencil', label: 'Pencil & Pastel', count: counts.pencil },
      { id: 'airbrush', label: 'Airbrush & Spray', count: counts.airbrush },
      { id: 'marker', label: 'Marker', count: counts.marker },
    ];
  }, []);

  // Filtered brushes based on category and search query
  const filteredBrushes = useMemo(() => {
    return DEFAULT_BRUSH_PRESETS.filter((brush) => {
      const matchesCategory = activeCategory === 'all' || brush.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        brush.name.toLowerCase().includes(q) ||
        brush.category.toLowerCase().includes(q) ||
        brush.tipShape.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const strokeColor = previewColorMode === 'color' ? primaryColor : '#ffffff';

  const tipShapeSymbol = (shape: BrushTipShape) => {
    switch (shape) {
      case 'round':
        return '●';
      case 'calligraphy':
        return '⬬';
      case 'chisel':
        return '▮';
      case 'stipple':
        return '⁖';
      case 'flat':
        return '▬';
      default:
        return '●';
    }
  };

  const quickSizes = [3, 6, 10, 16, 24, 36, 50, 80];

  return (
    <div
      ref={menuRef}
      id="desktop-brush-selection-menu"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-40 w-[420px] bg-[#222222] border border-[#111111] rounded-lg shadow-2xl flex flex-col select-none overflow-hidden ring-1 ring-white/10"
    >
      {/* 1. Window Header (Draggable) */}
      <div
        onMouseDown={handleDragStart}
        className="bg-[#2c2c2c] px-3 py-2 border-b border-black flex items-center justify-between cursor-move text-gray-200"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#383838] text-blue-400">
            <PenTool size={13} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-wide flex items-center gap-1.5 text-white">
              Sub Tool [Brush]
              <span className="text-[10px] font-normal text-gray-400">Brush Selection</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Pin toggle */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Unpin (Auto-close on select)' : 'Pin window (Keep open while painting)'}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#3a3a3a]'
            }`}
          >
            {isPinned ? <Pin size={13} className="rotate-45" /> : <PinOff size={13} />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-300 rounded transition-colors"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Active Brush Status & Search Bar */}
      <div className="bg-[#1a1a1a] p-2.5 border-b border-black flex flex-col gap-2">
        {/* Active brush banner */}
        <div className="flex items-center justify-between bg-[#262626] px-2.5 py-1.5 rounded-md border border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
              Active:
            </span>
            <span className="font-bold text-xs text-blue-400 truncate">{activeBrush.name}</span>
            <span className="text-[10px] text-gray-400 font-mono">
              ({tipShapeSymbol(activeBrush.tipShape)} {activeBrush.size}px)
            </span>
          </div>
          <div className="w-20 h-5 bg-[#141414] rounded border border-white/10 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
            <BrushStrokePreview
              brush={activeBrush}
              width={80}
              height={20}
              strokeColor={strokeColor}
            />
          </div>
        </div>

        {/* Search Input & View Mode Toggles */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brushes by name or style (e.g. G-pen, oil, soft)..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-md pl-7 pr-7 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Stroke color toggle: White vs Active color */}
          <button
            onClick={() => setPreviewColorMode(previewColorMode === 'white' ? 'color' : 'white')}
            className={`p-1.5 rounded border transition-colors flex items-center gap-1 text-[10px] ${
              previewColorMode === 'color'
                ? 'border-blue-500 bg-blue-950/60 text-blue-300'
                : 'border-white/10 bg-[#262626] text-gray-400 hover:text-white'
            }`}
            title="Toggle Preview Color (White vs Current Selected Color)"
          >
            <Palette size={12} />
            <span className="hidden sm:inline">
              {previewColorMode === 'white' ? 'White' : 'Color'}
            </span>
          </button>

          {/* List vs Grid toggle */}
          <div className="flex bg-[#161616] p-0.5 rounded border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${
                viewMode === 'list' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Detailed List with Wide Stroke Preview"
            >
              <List size={12} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${
                viewMode === 'grid' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="2-Column Grid View"
            >
              <LayoutGrid size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Category Tabs (Clip Studio Paint Style) */}
      <div className="bg-[#262626] border-b border-black flex items-center px-1 gap-1 text-[11px] overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded whitespace-nowrap text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#4a90e2] text-white font-bold shadow-xs'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-[#333333]'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[9px] px-1 rounded-full ${
                  isActive ? 'bg-black/30 text-white' : 'bg-black/20 text-gray-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Brush List with Individual Stroke Previews */}
      <div className="max-h-[380px] min-h-[220px] overflow-y-auto p-2 flex flex-col gap-1.5 bg-[#1b1b1b]">
        {filteredBrushes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
            <Search size={24} className="opacity-40" />
            <span className="text-xs">No brushes match &quot;{searchQuery}&quot;</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-blue-400 text-[11px] hover:underline mt-1"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* Detailed List View: S-Curve Preview Canvas + Full Metadata */
          filteredBrushes.map((brush) => {
            const isSelected = activeBrush.name === brush.name || activeBrush.id === brush.id;
            return (
              <button
                key={brush.id}
                onClick={() => {
                  onSelectBrush(brush);
                  if (!isPinned) {
                    onClose();
                  }
                }}
                className={`w-full group flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-[#21354d] border-[#4a90e2] text-white shadow-md ring-1 ring-[#4a90e2]/30'
                    : 'bg-[#242424] border-black/40 text-gray-300 hover:bg-[#2e2e2e] hover:border-gray-600 hover:text-white'
                }`}
              >
                {/* Left: Real-time S-Curve Brush Stroke Preview Canvas */}
                <div className="flex items-center shrink-0 w-36 h-9 rounded bg-[#151515] border border-black/60 overflow-hidden relative mr-3 shadow-inner group-hover:border-gray-500/50 transition-colors">
                  <BrushStrokePreview
                    brush={brush}
                    width={144}
                    height={36}
                    strokeColor={strokeColor}
                  />
                  {brush.mixGroundColor && (
                    <span
                      className="absolute bottom-0.5 right-1 text-[8px] font-mono text-cyan-400 bg-black/70 px-1 rounded"
                      title="Color blending / ground smear enabled"
                    >
                      BLEND
                    </span>
                  )}
                </div>

                {/* Center: Brush Name and Characteristics */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-gray-100 truncate">
                      {brush.name}
                    </span>
                    {isSelected && (
                      <span className="p-0.5 rounded-full bg-blue-500 text-white shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                    <span
                      className="font-mono text-blue-300 font-bold"
                      title={`Tip shape: ${brush.tipShape}`}
                    >
                      {tipShapeSymbol(brush.tipShape)} {brush.tipShape}
                    </span>
                    <span>•</span>
                    <span>{brush.size}px</span>
                    <span>•</span>
                    <span>{Math.round(brush.opacity * 100)}% opac</span>
                    {brush.dualBrush?.enabled && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 text-[9px]">Dual Texture</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Category tag */}
                <div className="text-right pl-2 shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono px-1.5 py-0.5 rounded bg-black/30 group-hover:text-gray-300">
                    {brush.category}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          /* Grid View: 2 Columns of compact brush cards */
          <div className="grid grid-cols-2 gap-1.5">
            {filteredBrushes.map((brush) => {
              const isSelected = activeBrush.name === brush.name || activeBrush.id === brush.id;
              return (
                <button
                  key={brush.id}
                  onClick={() => {
                    onSelectBrush(brush);
                    if (!isPinned) {
                      onClose();
                    }
                  }}
                  className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-[#21354d] border-[#4a90e2] text-white shadow-md'
                      : 'bg-[#242424] border-black/40 text-gray-300 hover:bg-[#2e2e2e] hover:border-gray-600'
                  }`}
                >
                  {/* Stroke Preview */}
                  <div className="w-full h-8 rounded bg-[#151515] border border-black/60 overflow-hidden relative shadow-inner mb-1.5 flex items-center justify-center">
                    <BrushStrokePreview
                      brush={brush}
                      width={170}
                      height={32}
                      strokeColor={strokeColor}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate">{brush.name}</span>
                    {isSelected && <Check size={12} className="text-blue-400 shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-400 mt-1">
                    <span>
                      {tipShapeSymbol(brush.tipShape)} {brush.size}px
                    </span>
                    <span className="capitalize">{brush.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Bottom Quick Size & Action Bar */}
      <div className="bg-[#242424] p-2.5 border-t border-black flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 text-gray-300">
            <span>Quick Size:</span>
            <div className="flex items-center gap-1">
              {quickSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => onUpdateBrushSize?.(sz)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                    activeBrush.size === sz
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#181818] text-gray-400 hover:text-white hover:bg-[#333]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {onOpenSettingsPanel && (
            <button
              onClick={() => {
                onOpenSettingsPanel();
                if (!isPinned) onClose();
              }}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px]"
            >
              <Sliders size={11} />
              <span>Full Dynamics</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
