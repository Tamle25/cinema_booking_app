'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Component phân trang dùng chung cho các trang Admin
 * 
 * Props:
 * - currentPage: Trang hiện tại (bắt đầu từ 1)
 * - totalPages: Tổng số trang
 * - onPageChange: Callback khi đổi trang
 * - totalItems: Tổng số bản ghi
 * - itemsPerPage: Số bản ghi mỗi trang
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  // Luôn render container để giữ layout ổn định
  // Nếu chỉ có 1 trang hoặc không có data, hiển thị placeholder với chiều cao cố định
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100 min-h-[60px]">
        <div className="text-sm text-gray-500">
          {totalItems > 0 ? (
            <>Hiển thị <span className="font-medium text-gray-700">{totalItems}</span> bản ghi</>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
        <div>&nbsp;</div>
      </div>
    );
  }

  // Tính số bản ghi đang hiển thị
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Tạo mảng số trang để hiển thị (tối đa 5 trang)
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Hiển thị tất cả nếu <= 5 trang
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Luôn hiển thị trang đầu
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Hiển thị các trang xung quanh trang hiện tại
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Luôn hiển thị trang cuối
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-gray-100 min-h-[60px]">
      {/* Thông tin số bản ghi */}
      <div className="text-sm text-gray-500">
        Hiển thị <span className="font-medium text-gray-700">{startItem}</span> đến{' '}
        <span className="font-medium text-gray-700">{endItem}</span> trong tổng số{' '}
        <span className="font-medium text-gray-700">{totalItems}</span> bản ghi
      </div>

      {/* Các nút phân trang */}
      <div className="flex items-center gap-1">
        {/* Nút Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition ${
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Trang trước"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Số trang */}
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition ${
              page === currentPage
                ? 'bg-blue-600 text-white shadow-sm'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}

        {/* Nút Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition ${
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Trang sau"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Helper hook để sử dụng pagination
 * 
 * Cách dùng:
 * const { paginatedData, currentPage, setCurrentPage, totalPages } = usePagination(data, 10);
 */
export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
  // Import useState từ React
  const { useState, useMemo, useEffect } = require('react');
  
  const [currentPage, setCurrentPage] = useState(1);

  // Reset về trang 1 khi data thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

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
  };
}
