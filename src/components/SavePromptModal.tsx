import React, { useEffect } from 'react';
import { AlertCircle, X, Save, Trash2 } from 'lucide-react';

interface SavePromptModalProps {
  isOpen: boolean;
  fileName: string;
  onSaveAndClose: () => void;
  onDiscardAndClose: () => void;
  onCancel: () => void;
}

export const SavePromptModal: React.FC<SavePromptModalProps> = ({
  isOpen,
  fileName,
  onSaveAndClose,
  onDiscardAndClose,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 select-none p-3 animate-in fade-in duration-150">
      <div className="w-[92vw] max-w-[380px] bg-[#292929] border border-black/80 shadow-2xl rounded-md text-[#d1d1d1] text-[11px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-8 bg-[#333333] border-b border-black flex items-center justify-between px-3 font-bold text-white text-[11px]">
          <span className="flex items-center gap-1.5 text-amber-400">
            <AlertCircle size={14} />
            <span>Unsaved Changes</span>
          </span>
          <button
            onClick={onCancel}
            title="Cancel"
            className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-2.5">
          <p className="text-gray-100 text-xs leading-relaxed">
            Do you want to save changes to <span className="font-bold text-white">"{fileName}"</span> before closing?
          </p>
          <p className="text-gray-400 text-[10px]">
            If you close without saving, your changes will be permanently discarded.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#222222] border-t border-black/60 p-2.5 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded bg-[#333333] hover:bg-[#404040] text-gray-200 transition-colors font-medium text-[11px] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onDiscardAndClose}
            className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-700/50 transition-colors font-medium flex items-center gap-1.5 text-[11px] cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Don't Save</span>
          </button>
          <button
            onClick={onSaveAndClose}
            className="px-3 py-1.5 rounded bg-[#4a90e2] hover:bg-[#3b82f6] text-white font-bold transition-colors flex items-center gap-1.5 shadow-sm text-[11px] cursor-pointer"
          >
            <Save size={12} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
