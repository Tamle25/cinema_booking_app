'use client';

import { useEffect, useState, useMemo } from 'react';
import Pagination from '@/components/Pagination';
import { authHeaders } from '@/lib/api';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';

interface ITransaction {
  _id: string;
  showtime: {
    _id: string;
    movie: {
      _id: string;
      title: string;
      poster_url: string;
    };
    cinema: {
      _id: string;
      name: string;
    };
    room: {
      name: string;
      type: string;
    };
    start_time: string;
  };
  user: {
    _id: string;
    full_name: string;
    email: string;
  };
  seats: string[];
  total_price: number;
  status: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/bookings`, { headers: authHeaders() });
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi tải giao dịch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700' };
      case 'pending':
        return { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-700' };
      case 'cancelled':
        return { label: 'Đã hủy', color: 'bg-red-100 text-red-700' };
      default:
        return { label: status || 'Không xác định', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredTransactions = transactions.filter(trans => {
    const matchSearch = 
      trans.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trans.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trans.showtime?.movie?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trans._id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = !filterStatus || trans.status === filterStatus;
    
    const matchDate = !filterDate || 
      new Date(trans.createdAt).toISOString().split('T')[0] === filterDate;
    
    return matchSearch && matchStatus && matchDate;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDate]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.total_price || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lịch sử Giao dịch</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các giao dịch đặt vé của người dùng</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <p className="text-sm text-green-600">Tổng doanh thu</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Tổng giao dịch</p>
          <p className="text-2xl font-bold text-gray-800">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Đã xác nhận</p>
          <p className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.status === 'confirmed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Chờ xử lý</p>
          <p className="text-2xl font-bold text-yellow-600">
            {transactions.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Đã hủy</p>
          <p className="text-2xl font-bold text-red-600">
            {transactions.filter(t => t.status === 'cancelled').length}
          </p>
        </div>
      </div>

      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo mã, tên khách hàng, email, phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="pending">Chờ xử lý</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <span className="text-sm text-gray-500 min-w-[160px] text-right whitespace-nowrap">
            Hiển thị: <strong>{filteredTransactions.length}</strong> giao dịch
          </span>
        </div>
      </div>

      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[10%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã GD</th>
                <th className="w-[18%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="w-[25%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phim / Rạp</th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghế</th>
                <th className="w-[12%] px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Số tiền</th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterStatus || filterDate 
                      ? 'Không tìm thấy giao dịch phù hợp' 
                      : 'Chưa có giao dịch nào'}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((trans) => {
                  const status = getStatusBadge(trans.status);
                  return (
                    <tr key={trans._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {trans._id.slice(-8).toUpperCase()}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">{trans.user?.full_name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{trans.user?.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {trans.showtime?.movie?.poster_url && (
                            <img 
                              src={getCloudinaryImageUrl(trans.showtime.movie.poster_url, movieImagePresets.posterThumb)}
                              alt="" 
                              className="w-10 h-14 object-cover rounded shadow-sm"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-800 text-sm">
                              {trans.showtime?.movie?.title || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {trans.showtime?.cinema?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-blue-500">
                              {trans.showtime?.start_time 
                                ? formatDate(trans.showtime.start_time) 
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {trans.seats?.slice(0, 3).map((seat, i) => (
                            <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                              {seat}
                            </span>
                          ))}
                          {trans.seats?.length > 3 && (
                            <span className="text-xs text-gray-500">+{trans.seats.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(trans.total_price || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(trans.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredTransactions.length}
          itemsPerPage={itemsPerPage}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
