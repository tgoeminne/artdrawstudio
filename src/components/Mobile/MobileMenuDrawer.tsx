import React, { useRef } from 'react';
import {
  X,
  FilePlus,
  Save,
  FolderOpen,
  Image as ImageIcon,
  Download,
  Monitor,
  Maximize2,
  Info,
  Sliders,
  ExternalLink,
  ChevronRight,
  Trash2,
} from 'lucide-react';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNewCanvas: () => void;
  onSaveProject: () => void;
  onSaveProjectAs?: () => void;
  onLoadProject: (file: File) => void;
  onOpenProjectPicker?: () => void;
  onImportImage: (file: File) => void;
  onExportPng: () => void;
  onExportJpg: () => void;
  onFitScreen: () => void;
  onSwitchToDesktop: () => void;
  canvasName: string;
  tabs?: { id: string; name: string; isModified: boolean; zoom: number }[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  onNewCanvas,
  onSaveProject,
  onSaveProjectAs,
  onLoadProject,
  onOpenProjectPicker,
  onImportImage,
  onExportPng,
  onExportJpg,
  onFitScreen,
  onSwitchToDesktop,
  canvasName,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}) => {
  const projectInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-in Drawer */}
      <div className="relative z-10 w-72 max-w-[80vw] h-full bg-[#202020] border-r border-[#383838] shadow-2xl flex flex-col text-[#d1d1d1] animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#303030] flex items-center justify-between bg-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4a90e2] flex items-center justify-center font-black text-xs text-white">
              ADS
            </div>
            <div>
              <div className="font-bold text-xs text-white">Art Draw Studio</div>
              <div className="text-[10px] text-gray-400">Mobile Edition</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#333] hover:bg-[#444] flex items-center justify-center text-gray-300 active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        {/* Hidden inputs for project & image loading */}
        <input
          type="file"
          ref={projectInputRef}
          accept=".json,.ads.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onLoadProject(file);
              onClose();
            }
          }}
        />
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportImage(file);
              onClose();
            }
          }}
        />

        {/* Drawer Menu Items */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 text-xs">
          {/* Open Canvases List */}
          {tabs && tabs.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Open Canvases ({tabs.length})
                </span>
                <button
                  onClick={() => {
                    onNewCanvas();
                    onClose();
                  }}
                  className="text-blue-400 hover:text-blue-300 text-[10px] flex items-center gap-1 font-semibold"
                >
                  <FilePlus size={11} />
                  <span>New</span>
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        onSelectTab?.(tab.id);
                        onClose();
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#1e293b] text-white font-semibold border border-blue-500/50 shadow-xs'
                          : 'bg-[#282828] text-gray-300 active:bg-[#333]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-gray-500'}`} />
                        <span className="truncate">{tab.name}{tab.isModified ? '*' : ''}</span>
                      </div>
                      {onCloseTab && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(tab.id);
                          }}
                          title="Close canvas"
                          className="p-1 hover:text-red-400 text-gray-400 rounded hover:bg-black/30"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Operations */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
              File & Project
            </span>
            <button
              onClick={() => {
                onNewCanvas();
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <FilePlus size={16} className="text-blue-400" />
              <span>New Canvas...</span>
            </button>

            <button
              onClick={() => {
                onSaveProject();
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <Save size={16} className="text-emerald-400" />
              <span>Save Project (.ads.json)</span>
            </button>

            {onSaveProjectAs && (
              <button
                onClick={() => {
                  onSaveProjectAs();
                  onClose();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
              >
                <Download size={16} className="text-teal-400" />
                <span>Save Project As...</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenProjectPicker) {
                  onOpenProjectPicker();
                } else {
                  projectInputRef.current?.click();
                }
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <FolderOpen size={16} className="text-amber-400" />
              <span>Open Project...</span>
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <ImageIcon size={16} className="text-purple-400" />
              <span>Import Image to Layer...</span>
            </button>
          </div>

          {/* Export Options */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
              Export Artwork
            </span>
            <button
              onClick={() => {
                onExportPng();
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <Download size={16} className="text-cyan-400" />
              <span>Export Transparent PNG</span>
            </button>

            <button
              onClick={() => {
                onExportJpg();
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <Download size={16} className="text-cyan-400" />
              <span>Export Flattened JPEG</span>
            </button>
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
              Interface Layout
            </span>
            <button
              onClick={() => {
                onSwitchToDesktop();
                onClose();
              }}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <div className="flex items-center gap-3">
                <Monitor size={16} className="text-blue-400" />
                <span>Desktop Studio Layout</span>
              </div>
              <span className="text-[9px] text-gray-400 bg-[#1e1e1e] px-1.5 py-0.5 rounded">
                Switch
              </span>
            </button>

            <button
              onClick={() => {
                onFitScreen();
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#282828] active:bg-[#383838] text-gray-200"
            >
              <Maximize2 size={16} className="text-blue-400" />
              <span>Fit Canvas to Screen</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-[#303030] bg-[#1a1a1a] text-[10px] text-gray-400 flex items-center justify-between">
          <span className="truncate max-w-[170px]">{canvasName}</span>
          <span className="font-mono text-[9px] bg-blue-950 text-blue-300 px-1 rounded border border-blue-800">
            PRO v3.0
          </span>
        </div>
      </div>
    </div>
  );
};
