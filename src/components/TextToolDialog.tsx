import React, { useState, useEffect } from 'react';
import { VectorText } from '../types';
import { getProjectFonts, loadGoogleFont } from '../utils/googleFonts';
import { Type, Sparkles, Trash2, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextToolDialogProps {
  initialText?: VectorText | null;
  onSave: (textSettings: Omit<VectorText, 'id' | 'x' | 'y'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  onOpenGoogleFontLibrary?: () => void;
}

export const TextToolDialog: React.FC<TextToolDialogProps> = ({
  initialText,
  onSave,
  onDelete,
  onClose,
  onOpenGoogleFontLibrary,
}) => {
  const [text, setText] = useState(initialText?.text || '');
  const [fontFamily, setFontFamily] = useState(initialText?.fontFamily || 'Inter');
  const [fontSize, setFontSize] = useState(initialText?.fontSize || 48);
  const [fontWeight, setFontWeight] = useState<number | string>(initialText?.fontWeight || (initialText?.bold ? '700' : '400'));
  const [color, setColor] = useState(initialText?.color || '#ffffff');
  const [italic, setItalic] = useState(!!initialText?.italic);
  const [underline, setUnderline] = useState(!!initialText?.underline);
  const [strikethrough, setStrikethrough] = useState(!!initialText?.strikethrough);
  const [uppercase, setUppercase] = useState(!!initialText?.uppercase);
  const [align, setAlign] = useState<CanvasTextAlign>(initialText?.align || 'left');
  const [letterSpacing, setLetterSpacing] = useState(initialText?.letterSpacing || 0);
  const [lineHeight, setLineHeight] = useState(initialText?.lineHeight || Math.round(fontSize * 1.25));

  // Outline
  const [hasStroke, setHasStroke] = useState(!!(initialText?.strokeWidth && initialText.strokeWidth > 0));
  const [strokeColor, setStrokeColor] = useState(initialText?.strokeColor || '#000000');
  const [strokeWidth, setStrokeWidth] = useState(initialText?.strokeWidth || 3);

  // Shadow
  const [hasShadow, setHasShadow] = useState(!!(initialText?.shadowBlur && initialText.shadowBlur > 0));
  const [shadowColor, setShadowColor] = useState(initialText?.shadowColor || '#000000');
  const [shadowBlur, setShadowBlur] = useState(initialText?.shadowBlur || 8);
  const [shadowOffsetX, setShadowOffsetX] = useState(initialText?.shadowOffsetX || 2);
  const [shadowOffsetY, setShadowOffsetY] = useState(initialText?.shadowOffsetY || 4);

  const [availableFonts, setAvailableFonts] = useState<string[]>([]);

  useEffect(() => {
    const fonts = getProjectFonts();
    setAvailableFonts(fonts);
    loadGoogleFont(fontFamily);
  }, [fontFamily]);

  const inputClass =
    'rounded-lg border border-white/10 bg-[#161616] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500';

  const isEditing = !!initialText;

  return (
    <div
      className="fixed inset-0 z-[140] grid place-items-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      role="presentation"
    >
      <form
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#222222] p-5 text-white shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-tool-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          onSave(
            {
              text,
              fontFamily,
              fontSize: Math.max(6, Math.min(512, fontSize)),
              color,
              bold: fontWeight === '700' || Number(fontWeight) >= 700,
              fontWeight,
              italic,
              underline,
              strikethrough,
              uppercase,
              align,
              letterSpacing,
              lineHeight: Math.max(12, lineHeight),
              strokeColor: hasStroke ? strokeColor : undefined,
              strokeWidth: hasStroke ? strokeWidth : undefined,
              shadowColor: hasShadow ? shadowColor : undefined,
              shadowBlur: hasShadow ? shadowBlur : undefined,
              shadowOffsetX: hasShadow ? shadowOffsetX : undefined,
              shadowOffsetY: hasShadow ? shadowOffsetY : undefined,
            },
            initialText?.id
          );
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Type size={18} />
            </div>
            <div>
              <h2 id="text-tool-title" className="text-base font-bold">
                {isEditing ? 'Edit Vector Typography' : 'Add Vector Typography'}
              </h2>
              <p className="text-xs text-gray-400">
                Vector text on active layer • Google Fonts &amp; CAD styling
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close text tool"
          >
            ✕
          </button>
        </div>

        {/* Text Input Area */}
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type your vector text here…"
          rows={3}
          className={`${inputClass} w-full text-sm font-sans resize-y focus:ring-1 focus:ring-blue-500`}
        />

        {/* Live Font & Typography Controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Font Family with Google Fonts Library Button */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">Font Family</label>
              {onOpenGoogleFontLibrary && (
                <button
                  type="button"
                  onClick={onOpenGoogleFontLibrary}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                >
                  <Sparkles size={11} /> Google Fonts
                </button>
              )}
            </div>
            <select
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                loadGoogleFont(e.target.value);
              }}
              className={inputClass}
            >
              {availableFonts.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Weight */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-300">Font Weight</label>
            <select
              value={fontWeight}
              onChange={(e) => setFontWeight(e.target.value)}
              className={inputClass}
            >
              <option value="100">100 — Thin</option>
              <option value="200">200 — Extra Light</option>
              <option value="300">300 — Light</option>
              <option value="400">400 — Regular</option>
              <option value="500">500 — Medium</option>
              <option value="600">600 — Semi Bold</option>
              <option value="700">700 — Bold</option>
              <option value="800">800 — Extra Bold</option>
              <option value="900">900 — Black</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs text-gray-300">
              <span className="font-semibold">Size</span>
              <span>{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="200"
                value={fontSize}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setFontSize(s);
                  setLineHeight(Math.round(s * 1.25));
                }}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <input
                type="number"
                min="6"
                max="512"
                value={fontSize}
                onChange={(e) => {
                  const s = Number(e.target.value) || 48;
                  setFontSize(s);
                  setLineHeight(Math.round(s * 1.25));
                }}
                className={`${inputClass} w-16 text-center`}
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-300">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-9 h-8 rounded border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={`${inputClass} flex-1 font-mono uppercase`}
              />
            </div>
          </div>
        </div>

        {/* Style Toggles: Italic, Underline, Strikethrough, Caps, Alignment */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#191919] rounded-xl border border-white/5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setItalic(!italic)}
              title="Italic"
              className={`p-1.5 rounded transition ${
                italic ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onClick={() => setUnderline(!underline)}
              title="Underline"
              className={`p-1.5 rounded transition ${
                underline ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Underline size={15} />
            </button>
            <button
              type="button"
              onClick={() => setStrikethrough(!strikethrough)}
              title="Strikethrough"
              className={`p-1.5 rounded transition ${
                strikethrough ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Strikethrough size={15} />
            </button>
            <button
              type="button"
              onClick={() => setUppercase(!uppercase)}
              title="Uppercase (ALL CAPS)"
              className={`px-2 py-1 rounded text-xs font-bold transition ${
                uppercase ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              TT
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAlign('left')}
              title="Align Left"
              className={`p-1.5 rounded transition ${
                align === 'left' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setAlign('center')}
              title="Align Center"
              className={`p-1.5 rounded transition ${
                align === 'center' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              onClick={() => setAlign('right')}
              title="Align Right"
              className={`p-1.5 rounded transition ${
                align === 'right' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlignRight size={15} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Letter Spacing */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Tracking</span>
            <input
              type="number"
              min="-10"
              max="50"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value) || 0)}
              className={`${inputClass} w-14 py-0.5 text-center`}
              title="Letter spacing in pixels"
            />
          </div>
        </div>

        {/* Stroke Outline & Shadow Effects Accordion */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
          {/* Text Stroke / Outline */}
          <div className="p-3 bg-[#1a1a1a] rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasStroke}
                  onChange={(e) => setHasStroke(e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Text Outline
              </label>
              {hasStroke && <span className="text-[10px] text-gray-400">{strokeWidth}px</span>}
            </div>
            {hasStroke && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-8 h-7 rounded border border-white/20 bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Text Drop Shadow */}
          <div className="p-3 bg-[#1a1a1a] rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasShadow}
                  onChange={(e) => setHasShadow(e.target.checked)}
                  className="rounded accent-blue-500"
                />
                Drop Shadow
              </label>
              {hasShadow && <span className="text-[10px] text-gray-400">blur {shadowBlur}px</span>}
            </div>
            {hasShadow && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={shadowColor}
                  onChange={(e) => setShadowColor(e.target.value)}
                  className="w-8 h-7 rounded border border-white/20 bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={shadowBlur}
                  onChange={(e) => setShadowBlur(Number(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                  title="Shadow blur"
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 bg-[#141414] rounded-xl border border-black/80 flex items-center justify-center min-h-[90px] overflow-hidden">
          <div
            style={{
              fontFamily: `"${fontFamily}", sans-serif`,
              fontSize: `${Math.min(48, Math.max(16, fontSize))}px`,
              fontWeight: fontWeight,
              fontStyle: italic ? 'italic' : 'normal',
              textDecoration: [underline && 'underline', strikethrough && 'line-through']
                .filter(Boolean)
                .join(' ') || 'none',
              textTransform: uppercase ? 'uppercase' : 'none',
              textAlign: align,
              letterSpacing: `${letterSpacing}px`,
              color,
              WebkitTextStroke: hasStroke ? `${strokeWidth}px ${strokeColor}` : undefined,
              textShadow: hasShadow
                ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
                : undefined,
            }}
            className="truncate max-w-full"
          >
            {text || 'Type preview text'}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            {isEditing && onDelete && initialText?.id && (
              <button
                type="button"
                onClick={() => {
                  onDelete(initialText.id);
                  onClose();
                }}
                className="px-3 py-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 size={14} /> Delete Text
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 text-xs font-bold transition shadow"
            >
              {isEditing ? 'Save Changes' : 'Place Text on Canvas'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
