'use client';

import { useEffect, useMemo, useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  theme?: 'red' | 'purple';
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  theme = 'purple',
}: PaginationProps) {
  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-8 bg-white border-t border-gray-100">
        <p className="text-sm text-gray-400 italic">Không có dữ liệu hiển thị</p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white border-t border-gray-100">
      
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div>
          Hiển thị <span className="font-medium text-gray-900">{startItem}</span> - {' '}
          <span className="font-medium text-gray-900">{endItem}</span> trên {' '}
          <span className="font-medium text-gray-900">{totalItems}</span>
        </div>

        
        {onLimitChange && (
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <label htmlFor="limit-select" className="hidden sm:inline-block text-gray-500">Hiển thị:</label>
            <select
              id="limit-select"
              value={itemsPerPage}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={`bg-transparent border border-gray-200 text-gray-700 rounded-lg py-1 px-2 text-sm outline-none transition-all hover:border-gray-300 cursor-pointer focus:ring-1 ${
                theme === 'red'
                  ? 'focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-purple-500 focus:ring-purple-500'
              }`}
            >
              {limitOptions.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : theme === 'red'
                ? 'text-gray-500 hover:bg-gray-50 hover:text-red-600 active:scale-95'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:scale-95'
            }`}
            title="Trang trước"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="flex items-center justify-center min-w-[36px] h-[36px] text-gray-400 pointer-events-none select-none">
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;

            return (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg text-sm transition-all duration-200 ${
                  isCurrent
                    ? theme === 'red'
                      ? 'bg-red-600 text-white font-semibold shadow-sm shadow-red-200'
                      : 'bg-purple-600 text-white font-semibold shadow-sm shadow-purple-200'
                    : theme === 'red'
                    ? 'text-gray-600 font-medium hover:bg-gray-50 hover:text-red-600 active:scale-95'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900 active:scale-95'
                }`}
              >
                {page}
              </button>
            );
          })}

          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : theme === 'red'
                ? 'text-gray-500 hover:bg-gray-50 hover:text-red-600 active:scale-95'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:scale-95'
            }`}
            title="Trang sau"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function usePagination<T>(data: T[], defaultItemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timer);
  }, [data.length, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  return {
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: data.length,
    itemsPerPage,
    setItemsPerPage,
  };
}
