import React from 'react';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  maxHeightClass?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerAction,
  maxHeightClass = 'max-h-[75vh]',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Sheet Content Container */}
      <div
        className={`relative z-10 w-full ${maxHeightClass} bg-[#232323] border-t border-[#3e3e3e] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden text-[#d1d1d1] animate-in slide-in-from-bottom duration-200`}
      >
        {/* Drag handle pill */}
        <div className="flex justify-center pt-2 pb-1" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-gray-600/70 cursor-pointer" />
        </div>

        {/* Header Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#333333] bg-[#292929]">
          <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wide flex items-center gap-2">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300 active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 text-xs overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
