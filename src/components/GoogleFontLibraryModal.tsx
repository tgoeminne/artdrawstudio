import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Check, X, Sparkles, Sliders, Type, ExternalLink } from 'lucide-react';
import {
  POPULAR_GOOGLE_FONTS,
  GoogleFontItem,
  getProjectFonts,
  addProjectFont,
  removeProjectFont,
  loadGoogleFont,
} from '../utils/googleFonts';

interface GoogleFontLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFont?: (family: string) => void;
  activeFont?: string;
}

export const GoogleFontLibraryModal: React.FC<GoogleFontLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectFont,
  activeFont,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');
  const [previewSize, setPreviewSize] = useState(24);
  const [projectFonts, setProjectFonts] = useState<string[]>([]);
  const [customFontInput, setCustomFontInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectFonts(getProjectFonts());
    }
  }, [isOpen]);

  // Load preview fonts visible in the catalog
  useEffect(() => {
    if (!isOpen) return;
    const toLoad = POPULAR_GOOGLE_FONTS.slice(0, 30).map((f) => f.family);
    toLoad.forEach((family) => loadGoogleFont(family));
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'sans-serif', label: 'Sans-Serif' },
    { id: 'serif', label: 'Serif' },
    { id: 'display', label: 'Display' },
    { id: 'handwriting', label: 'Handwriting' },
    { id: 'monospace', label: 'Monospace' },
  ];

  const filteredFonts = POPULAR_GOOGLE_FONTS.filter((font) => {
    const matchesCategory = selectedCategory === 'all' || font.category === selectedCategory;
    const matchesQuery =
      font.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (font.description && font.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleToggleFont = (family: string) => {
    if (projectFonts.includes(family)) {
      const updated = removeProjectFont(family);
      setProjectFonts(updated);
    } else {
      const updated = addProjectFont(family);
      setProjectFonts(updated);
    }
  };

  const handleAddCustomGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    const family = customFontInput.trim();
    if (!family) return;

    setCustomLoading(true);
    setCustomMessage(null);

    const success = await loadGoogleFont(family);
    if (success) {
      const updated = addProjectFont(family);
      setProjectFonts(updated);
      setCustomMessage(`Successfully added "${family}" to your project!`);
      setCustomFontInput('');
      if (onSelectFont) onSelectFont(family);
    } else {
      setCustomMessage(`Could not find or load Google Font "${family}". Check spelling.`);
    }
    setCustomLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-font-library-title"
    >
      <div className="bg-[#202020] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#282828]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Type size={20} />
            </div>
            <div>
              <h2 id="google-font-library-title" className="text-lg font-bold flex items-center gap-2">
                Google Fonts Library
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal border border-blue-500/30">
                  {projectFonts.length} in project
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Browse, preview, and install typography directly from Google Fonts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search, Filter & Controls Bar */}
        <div className="p-4 border-b border-white/10 bg-[#242424] flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Fonts by name or style…"
                className="w-full pl-9 pr-3 py-1.5 bg-[#171717] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Custom Google Font Direct Loader */}
            <form onSubmit={handleAddCustomGoogleFont} className="flex items-center gap-2">
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => setCustomFontInput(e.target.value)}
                placeholder="Add any Google Font by name…"
                className="w-56 px-3 py-1.5 bg-[#171717] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!customFontInput.trim() || customLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus size={14} />
                {customLoading ? 'Loading…' : 'Add'}
              </button>
            </form>
          </div>

          {customMessage && (
            <div
              className={`text-xs px-3 py-1.5 rounded-md ${
                customMessage.includes('Successfully')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {customMessage}
            </div>
          )}

          {/* Categories & Preview Text Customizer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2c2c2c]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Type preview text…"
                className="w-48 px-2 py-1 bg-[#171717] border border-white/10 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                title="Customize preview sentence"
              />
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>{previewSize}px</span>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={previewSize}
                  onChange={(e) => setPreviewSize(Number(e.target.value))}
                  className="w-20 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Font Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[350px]">
          {filteredFonts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-gray-400">
              <Type size={36} className="mb-2 opacity-40" />
              <p className="text-sm font-semibold">No fonts matched &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-gray-500 mt-1">
                Try typing the name in &ldquo;Add any Google Font by name&rdquo; above!
              </p>
            </div>
          ) : (
            filteredFonts.map((font) => {
              const isInstalled = projectFonts.includes(font.family);
              const isActive = activeFont === font.family;

              return (
                <div
                  key={font.family}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-950/30 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                      : isInstalled
                      ? 'bg-[#272727] border-blue-500/40'
                      : 'bg-[#242424] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{font.family}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase tracking-wider">
                          {font.category}
                        </span>
                        {isInstalled && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                            Installed
                          </span>
                        )}
                      </div>
                      {font.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{font.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onSelectFont && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isInstalled) handleToggleFont(font.family);
                            onSelectFont(font.family);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded text-white transition"
                        >
                          Use
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleFont(font.family)}
                        title={isInstalled ? 'Remove from project' : 'Add to project'}
                        className={`p-1.5 rounded-lg text-xs font-medium transition ${
                          isInstalled
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {isInstalled ? <Trash2 size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Rendered Preview in that font */}
                  <div
                    className="p-3 bg-[#181818] rounded-lg border border-black/40 overflow-hidden text-gray-100"
                    style={{
                      fontFamily: `"${font.family}", sans-serif`,
                      fontSize: `${previewSize}px`,
                      lineHeight: 1.3,
                    }}
                  >
                    <div className="truncate">{previewText || font.family}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#282828] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>Powered by Google Fonts API</span>
            <span>•</span>
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Browse all 1,500+ on Google Fonts <ExternalLink size={12} />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
