'use client';

import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Xác nhận xóa',
  message,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => setIsRendered(true), 0);
      return () => clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setIsRendered(false), 200);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !loading) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, onCancel, loading]);

  if (!isRendered && !open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity cursor-default"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* Modal Container */}
      <div
        className={`relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 overflow-hidden transition-all duration-200 transform ${
          open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Danger Icon Container */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Text Information */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 leading-6">
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse justify-start gap-2 border-t border-gray-100">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg shadow-sm focus:outline-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed min-w-[80px]"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang xóa...
              </>
            ) : (
              confirmText
            )}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="inline-flex justify-center px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-100 rounded-lg border border-gray-300 shadow-sm focus:outline-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
