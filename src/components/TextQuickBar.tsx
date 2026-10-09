import React, { useState, useEffect } from 'react';
import {
  Type,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Plus,
} from 'lucide-react';
import { VectorText } from '../types';
import { getProjectFonts, loadGoogleFont } from '../utils/googleFonts';

interface TextQuickBarProps {
  selectedText: VectorText | null;
  onUpdateSelectedText?: (updates: Partial<VectorText>) => void;
  onDeleteSelectedText?: () => void;
  onOpenGoogleFontLibrary: () => void;
  onOpenTextDialogForNew: () => void;
  defaultFontFamily: string;
  onSetDefaultFontFamily: (font: string) => void;
  primaryColor: string;
}

export const TextQuickBar: React.FC<TextQuickBarProps> = ({
  selectedText,
  onUpdateSelectedText,
  onDeleteSelectedText,
  onOpenGoogleFontLibrary,
  onOpenTextDialogForNew,
  defaultFontFamily,
  onSetDefaultFontFamily,
  primaryColor,
}) => {
  const [projectFonts, setProjectFonts] = useState<string[]>([]);

  useEffect(() => {
    setProjectFonts(getProjectFonts());
  }, []);

  const activeFont = selectedText?.fontFamily || defaultFontFamily;
  const activeSize = selectedText?.fontSize || 48;
  const activeColor = selectedText?.color || primaryColor;
  const isBold = selectedText?.bold || selectedText?.fontWeight === '700' || Number(selectedText?.fontWeight) >= 700;
  const isItalic = !!selectedText?.italic;
  const isUnderline = !!selectedText?.underline;
  const isStrikethrough = !!selectedText?.strikethrough;
  const activeAlign = selectedText?.align || 'left';

  const handleFontChange = (newFont: string) => {
    loadGoogleFont(newFont);
    if (selectedText && onUpdateSelectedText) {
      onUpdateSelectedText({ fontFamily: newFont });
    } else {
      onSetDefaultFontFamily(newFont);
    }
  };

  return (
    <div
      id="text-quick-bar"
      className="absolute top-12 left-16 z-30 bg-[#252525]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl px-3 py-2 flex flex-wrap items-center gap-3 text-white text-xs select-none animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
        <Type size={14} />
        <span>Typography</span>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Font Family selector & Google Fonts button */}
      <div className="flex items-center gap-1.5">
        <select
          value={activeFont}
          onChange={(e) => handleFontChange(e.target.value)}
          className="bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white max-w-[150px] truncate focus:outline-none focus:border-blue-500"
        >
          {projectFonts.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onOpenGoogleFontLibrary}
          title="Browse & Install Google Fonts"
          className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <Sparkles size={12} />
          Google Fonts
        </button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Font Size */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-[11px]">Size</span>
        <input
          type="number"
          min="8"
          max="512"
          value={activeSize}
          onChange={(e) => {
            const s = Number(e.target.value) || 24;
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({ fontSize: s, lineHeight: Math.round(s * 1.25) });
            }
          }}
          className="w-12 bg-[#171717] border border-white/10 rounded px-1 py-0.5 text-center text-xs"
        />
        <span className="text-gray-400 text-[10px]">px</span>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Text Styles (Bold, Italic, Underline, Strikethrough) */}
      <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-white/5">
        <button
          type="button"
          onClick={() => {
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({
                bold: !isBold,
                fontWeight: !isBold ? '700' : '400',
              });
            }
          }}
          className={`p-1.5 rounded transition ${
            isBold ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Bold"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({ italic: !isItalic });
            }
          }}
          className={`p-1.5 rounded transition ${
            isItalic ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Italic"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({ underline: !isUnderline });
            }
          }}
          className={`p-1.5 rounded transition ${
            isUnderline ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Underline"
        >
          <Underline size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({ strikethrough: !isStrikethrough });
            }
          }}
          className={`p-1.5 rounded transition ${
            isStrikethrough ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={13} />
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-white/5">
        <button
          type="button"
          onClick={() => selectedText && onUpdateSelectedText?.({ align: 'left' })}
          className={`p-1.5 rounded transition ${
            activeAlign === 'left' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          onClick={() => selectedText && onUpdateSelectedText?.({ align: 'center' })}
          className={`p-1.5 rounded transition ${
            activeAlign === 'center' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          onClick={() => selectedText && onUpdateSelectedText?.({ align: 'right' })}
          className={`p-1.5 rounded transition ${
            activeAlign === 'right' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Color */}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={activeColor.startsWith('#') ? activeColor : '#ffffff'}
          onChange={(e) => {
            if (selectedText && onUpdateSelectedText) {
              onUpdateSelectedText({ color: e.target.value });
            }
          }}
          className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer p-0"
          title="Text color"
        />
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Add New Text / Delete Selected Text Actions */}
      <div className="flex items-center gap-1.5">
        {selectedText && onDeleteSelectedText && (
          <button
            type="button"
            onClick={onDeleteSelectedText}
            title="Delete Selected Text (Del)"
            className="px-2 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded text-xs font-medium flex items-center gap-1 transition"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}

        <button
          type="button"
          onClick={onOpenTextDialogForNew}
          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
        >
          <Plus size={12} /> Add Text
        </button>
      </div>
    </div>
  );
};
